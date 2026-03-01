import { FastifyInstance } from "fastify";
import { prisma } from "../../db/prisma";
import { authGuard } from "../../middlewares/authGuard";
import { tenantGuard } from "../../middlewares/tenantGuard";
import { requirePermission } from "../../middlewares/requirePermission";

type SaleCreateBody = {
  items: Array<{ productId: string; qty: number; price?: number }>;
  payments: Array<{ method: string; amount: number; reference?: string }>;
  discount?: number;
  tax?: number;
  clientTxnId?: string;
};

export async function salesRoutes(app: FastifyInstance) {
  app.post(
    "/sales",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:write")] },
    async (req, reply) => {
      const { merchantId, storeId, sub: cashierId } = req.user;
      if (!storeId)
        return reply.code(400).send({ message: "User has no storeId" });

      const body = req.body as SaleCreateBody;

      if (!body?.items?.length)
        return reply.code(400).send({ message: "Sale must have items" });
      if (!body?.payments?.length)
        return reply.code(400).send({ message: "Sale must have payments" });

      const discount = Number(body.discount ?? 0);
      const tax = Number(body.tax ?? 0);

      if (!Number.isFinite(discount) || discount < 0)
        return reply.code(400).send({ message: "Invalid discount" });
      if (!Number.isFinite(tax) || tax < 0)
        return reply.code(400).send({ message: "Invalid tax" });

      // Normalize items (merge duplicates)
      const merged = new Map<
        string,
        { productId: string; qty: number; price?: number }
      >();
      for (const it of body.items) {
        const qty = Math.trunc(Number(it.qty));
        if (!it.productId || !Number.isFinite(qty) || qty <= 0) {
          return reply
            .code(400)
            .send({ message: "Each item needs productId and qty > 0" });
        }
        const prev = merged.get(it.productId);
        merged.set(it.productId, {
          productId: it.productId,
          qty: (prev?.qty ?? 0) + qty,
          price: it.price ?? prev?.price,
        });
      }
      const items = Array.from(merged.values());

      // Payments validation + paidTotal (compute ONCE)
      const paidTotal = body.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      for (const p of body.payments) {
        const amount = Number(p.amount);
        if (!p.method || !Number.isFinite(amount) || amount <= 0) {
          return reply
            .code(400)
            .send({ message: "Each payment needs method and amount > 0" });
        }
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          // Optional idempotency (offline later)
          if (body.clientTxnId) {
            const existing = await tx.sale.findFirst({
              where: { merchantId, clientTxnId: body.clientTxnId },
              include: { items: true, payments: true },
            });
            if (existing) return { sale: existing, reused: true };
          }

          // Validate products belong to merchant
          const productIds = items.map((i) => i.productId);
          const products = await tx.product.findMany({
            where: { merchantId, isDeleted: false, id: { in: productIds } },
            select: { id: true, name: true, price: true },
          });

          if (products.length !== productIds.length) {
            return reply
              .code(400)
              .send({ message: "One or more products invalid" });
          }

          const productMap = new Map(products.map((p) => [p.id, p]));

          // Check stock for each item
          for (const it of items) {
            const agg = await tx.stockLedger.aggregate({
              where: { merchantId, storeId, productId: it.productId },
              _sum: { qtyChange: true },
            });
            const onHand = agg._sum.qtyChange ?? 0;
            if (onHand < it.qty) {
              return reply.code(400).send({
                message: "Insufficient stock",
                productId: it.productId,
                qtyRequested: it.qty,
                qtyOnHand: onHand,
              });
            }
          }

          // Build sale items snapshots
          const saleItemsData = items.map((it) => {
            const p = productMap.get(it.productId)!;
            const priceSnap = Number(it.price ?? p.price);
            const lineTotal = priceSnap * it.qty;
            return {
              productId: it.productId,
              nameSnap: p.name,
              priceSnap,
              qty: it.qty,
              lineTotal,
            };
          });

          const subtotal = saleItemsData.reduce((s, x) => s + x.lineTotal, 0);
          const total = subtotal - discount + tax;
          const change = paidTotal - total;

          if (total < 0)
            return reply
              .code(400)
              .send({ message: "Total cannot be negative" });
          if (paidTotal + 1e-9 < total) {
            return reply
              .code(400)
              .send({
                message: "Insufficient payment",
                total,
                paid: paidTotal,
              });
          }

          // Receipt number (requires ReceiptCounter model migrated)
          const dateKey = new Date()
            .toISOString()
            .slice(0, 10)
            .replaceAll("-", ""); // YYYYMMDD

          const counter = await tx.receiptCounter.upsert({
            where: {
              merchantId_storeId_dateKey: { merchantId, storeId, dateKey },
            },
            update: { lastNumber: { increment: 1 } },
            create: { merchantId, storeId, dateKey, lastNumber: 1 },
          });

          const receiptNo = `VRX-${dateKey}-${String(counter.lastNumber).padStart(6, "0")}`;

          // Create sale + children
          const sale = await tx.sale.create({
            data: {
              merchantId,
              storeId,
              cashierId,
              receiptNo,
              status: "COMPLETED",
              subtotal,
              discount,
              tax,
              total,
              clientTxnId: body.clientTxnId ?? null,
              items: { create: saleItemsData },
              payments: {
                create: body.payments.map((p) => ({
                  method: p.method,
                  amount: Number(p.amount),
                  reference: p.reference?.trim() || null,
                })),
              },
            },
            include: { items: true, payments: true },
          });

          // Stock OUT entries (ONLY valid fields)
          await tx.stockLedger.createMany({
            data: sale.items.map((si) => ({
              merchantId,
              storeId,
              productId: si.productId,
              type: "OUT",
              qtyChange: -si.qty,
              reference: `SALE:${sale.id}`,
              createdBy: cashierId,
            })),
          });

          return { sale, reused: false, change };
        });

        return reply.code(201).send({
          sale: result.sale,
          reused: result.reused,
          paidTotal,
          change: result.change, // authoritative
        });
      } catch (e: any) {
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    },
  );

  // VOID SALE (restores stock)
  app.post(
    "/sales/:id/void",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:write")] },
    async (req, reply) => {
      const { merchantId, storeId, sub: cashierId } = req.user;
      if (!storeId)
        return reply.code(400).send({ message: "User has no storeId" });

      const { id: saleId } = req.params as any;

      const body = req.body as any;
      const reason = (body?.reason as string | undefined)?.trim();

      try {
        const result = await prisma.$transaction(async (tx) => {
          const sale = await tx.sale.findFirst({
            where: { id: saleId, merchantId, storeId },
            include: { items: true },
          });

          if (!sale) return reply.code(404).send({ message: "Sale not found" });

          if (sale.status === "VOIDED") {
            return reply.code(400).send({ message: "Sale already voided" });
          }
          if (sale.status !== "COMPLETED") {
            return reply
              .code(400)
              .send({ message: `Cannot void sale with status ${sale.status}` });
          }

          // Mark sale VOIDED
          const updatedSale = await tx.sale.update({
            where: { id: sale.id },
            data: { status: "VOIDED" },
            include: { items: true, payments: true },
          });

          // Restore stock for each item (compensating entries)
          await tx.stockLedger.createMany({
            data: updatedSale.items.map((si) => ({
              merchantId,
              storeId,
              productId: si.productId,
              type: "IN",
              qtyChange: si.qty, // put back
              reference: `VOID:${updatedSale.id}`,
              note: reason || null,
              createdBy: cashierId,
            })),
          });

          return updatedSale;
        });

        return reply.send({ message: "Sale voided", sale: result });
      } catch (e: any) {
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    },
  );

  app.get(
    "/sales/:id",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:read")] },
    async (req, reply) => {
      const { merchantId } = req.user;
      const { id } = req.params as any;

      const sale = await prisma.sale.findFirst({
        where: { id, merchantId },
        include: { items: true, payments: true },
      });

      if (!sale) return reply.code(404).send({ message: "Sale not found" });

      return { sale };
    },
  );
}
