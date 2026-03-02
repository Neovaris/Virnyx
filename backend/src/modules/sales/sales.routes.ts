// src/modules/sales/sales.routes.ts
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
  // =========================
  // CREATE SALE (requires OPEN shift)
  // POST /sales
  // =========================
  app.post(
    "/sales",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:write")] },
    async (req, reply) => {
      const { merchantId, storeId, sub: cashierId } = req.user as any;
      if (!storeId) return reply.code(400).send({ message: "User has no storeId" });

      const body = req.body as SaleCreateBody;

      if (!body?.items?.length) return reply.code(400).send({ message: "Sale must have items" });
      if (!body?.payments?.length) return reply.code(400).send({ message: "Sale must have payments" });

      const discount = Number(body.discount ?? 0);
      const tax = Number(body.tax ?? 0);

      if (!Number.isFinite(discount) || discount < 0) return reply.code(400).send({ message: "Invalid discount" });
      if (!Number.isFinite(tax) || tax < 0) return reply.code(400).send({ message: "Invalid tax" });

      // Normalize items (merge duplicates by productId)
      const merged = new Map<string, { productId: string; qty: number; price?: number }>();
      for (const it of body.items) {
        const productId = String(it.productId);
        const qty = Math.trunc(Number(it.qty));
        const price = it.price !== undefined ? Number(it.price) : undefined;

        if (!productId || !Number.isFinite(qty) || qty <= 0) {
          return reply.code(400).send({ message: "Each item needs productId and qty > 0" });
        }
        if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
          return reply.code(400).send({ message: "Invalid item price" });
        }

        const prev = merged.get(productId);
        merged.set(productId, {
          productId,
          qty: (prev?.qty ?? 0) + qty,
          price: price ?? prev?.price,
        });
      }
      const items = Array.from(merged.values());

      // Payments validation + paidTotal
      let paidTotal = 0;
      for (const p of body.payments) {
        const method = String(p.method);
        const amount = Number(p.amount);
        if (!method || !Number.isFinite(amount) || amount <= 0) {
          return reply.code(400).send({ message: "Each payment needs method and amount > 0" });
        }
        paidTotal += amount;
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          // Require active shift session (STRICT)
          const activeSession = await tx.shiftSession.findFirst({
            where: { merchantId, storeId, cashierId, status: "OPEN" },
            orderBy: { openedAt: "desc" },
          });

          if (!activeSession) {
            throw Object.assign(new Error("NO_OPEN_SHIFT"), {
              statusCode: 400,
              payload: { message: "No OPEN shift session. Open a shift before making sales." },
            });
          }

          // Optional idempotency (offline later) - store-scoped
          if (body.clientTxnId) {
            const existing = await tx.sale.findFirst({
              where: { merchantId, storeId, clientTxnId: body.clientTxnId },
              include: { items: true, payments: true },
            });
            if (existing) {
              return { sale: existing, reused: true, change: paidTotal - existing.total };
            }
          }

          // Validate products belong to merchant
          const productIds = items.map((i) => i.productId);
          const products = await tx.product.findMany({
            where: { merchantId, isDeleted: false, id: { in: productIds } },
            select: { id: true, name: true, price: true },
          });

          if (products.length !== productIds.length) {
            throw Object.assign(new Error("INVALID_PRODUCTS"), {
              statusCode: 400,
              payload: { message: "One or more products invalid" },
            });
          }

          const productMap = new Map(products.map((p) => [p.id, p] as const));

          // ✅ Inventory: ensure row exists + atomic decrement (prevents oversell)
          for (const it of items) {
            await tx.inventory.upsert({
              where: {
                merchantId_storeId_productId: { merchantId, storeId, productId: it.productId },
              },
              update: {},
              create: { merchantId, storeId, productId: it.productId, onHand: 0 },
            });

            const dec = await tx.inventory.updateMany({
              where: {
                merchantId,
                storeId,
                productId: it.productId,
                onHand: { gte: it.qty },
              },
              data: { onHand: { decrement: it.qty } },
            });

            if (dec.count !== 1) {
              const inv = await tx.inventory.findUnique({
                where: { merchantId_storeId_productId: { merchantId, storeId, productId: it.productId } },
                select: { onHand: true },
              });

              throw Object.assign(new Error("INSUFFICIENT_STOCK"), {
                statusCode: 400,
                payload: {
                  message: "Insufficient stock",
                  productId: it.productId,
                  qtyRequested: it.qty,
                  qtyOnHand: inv?.onHand ?? 0,
                },
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

          if (discount > subtotal) {
            throw Object.assign(new Error("DISCOUNT_TOO_HIGH"), {
              statusCode: 400,
              payload: { message: "Discount cannot exceed subtotal", subtotal, discount },
            });
          }

          const total = subtotal - discount + tax;
          const change = paidTotal - total;

          if (total < 0) {
            throw Object.assign(new Error("NEGATIVE_TOTAL"), {
              statusCode: 400,
              payload: { message: "Total cannot be negative" },
            });
          }

          if (paidTotal + 1e-9 < total) {
            throw Object.assign(new Error("INSUFFICIENT_PAYMENT"), {
              statusCode: 400,
              payload: { message: "Insufficient payment", total, paid: paidTotal },
            });
          }

          // Receipt number
          const dateKey = new Date().toISOString().slice(0, 10).replaceAll("-", "");
          const counter = await tx.receiptCounter.upsert({
            where: { merchantId_storeId_dateKey: { merchantId, storeId, dateKey } },
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
              shiftSessionId: activeSession.id,
              status: "COMPLETED",
              subtotal,
              discount,
              tax,
              total,
              clientTxnId: body.clientTxnId ?? null,
              items: { create: saleItemsData },
              payments: {
                create: body.payments.map((p) => ({
                  method: String(p.method),
                  amount: Number(p.amount),
                  reference: p.reference?.trim() || null,
                })),
              },
            },
            include: { items: true, payments: true },
          });

          // Ledger OUT entries (audit trail)
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
          change: result.change,
        });
      } catch (e: any) {
        if (e?.statusCode && e?.payload) return reply.code(e.statusCode).send(e.payload);
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    }
  );

  // =========================
  // VOID SALE (restores stock)
  // POST /sales/:id/void
  // =========================
  app.post(
    "/sales/:id/void",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:write")] },
    async (req, reply) => {
      const { merchantId, storeId, sub: cashierId } = req.user as any;
      if (!storeId) return reply.code(400).send({ message: "User has no storeId" });

      const { id: saleId } = req.params as any;
      const reason = ((req.body as any)?.reason as string | undefined)?.trim() || null;

      try {
        const sale = await prisma.$transaction(async (tx) => {
          const existing = await tx.sale.findFirst({
            where: { id: saleId, merchantId, storeId },
            include: { items: true },
          });

          if (!existing) {
            throw Object.assign(new Error("SALE_NOT_FOUND"), {
              statusCode: 404,
              payload: { message: "Sale not found" },
            });
          }

          if (existing.status === "VOIDED") {
            throw Object.assign(new Error("ALREADY_VOIDED"), {
              statusCode: 400,
              payload: { message: "Sale already voided" },
            });
          }

          if (existing.status !== "COMPLETED") {
            throw Object.assign(new Error("INVALID_STATUS"), {
              statusCode: 400,
              payload: { message: `Cannot void sale with status ${existing.status}` },
            });
          }

          // Block void if refunds exist
          const refundCount = await tx.refund.count({
            where: { saleId: existing.id, merchantId, storeId },
          });

          if (refundCount > 0) {
            throw Object.assign(new Error("HAS_REFUNDS"), {
              statusCode: 400,
              payload: { message: "Cannot void a sale that has refunds. Use refunds only." },
            });
          }

          const updated = await tx.sale.update({
            where: { id: existing.id },
            data: { status: "VOIDED" },
            include: { items: true, payments: true },
          });

          // ✅ Restore Inventory
          for (const si of updated.items) {
            await tx.inventory.upsert({
              where: {
                merchantId_storeId_productId: { merchantId, storeId, productId: si.productId },
              },
              update: { onHand: { increment: si.qty } },
              create: { merchantId, storeId, productId: si.productId, onHand: si.qty },
            });
          }

          // Ledger IN entries (audit trail)
          await tx.stockLedger.createMany({
            data: updated.items.map((si) => ({
              merchantId,
              storeId,
              productId: si.productId,
              type: "IN",
              qtyChange: si.qty,
              reference: `VOID:${updated.id}`,
              note: reason,
              createdBy: cashierId,
            })),
          });

          return updated;
        });

        return reply.send({ message: "Sale voided", sale });
      } catch (e: any) {
        if (e?.statusCode && e?.payload) return reply.code(e.statusCode).send(e.payload);
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    }
  );

  // =========================
  // GET SALE (receipt)
  // GET /sales/:id
  // =========================
  app.get(
    "/sales/:id",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:read")] },
    async (req, reply) => {
      const { merchantId, storeId } = req.user as any;
      const { id } = req.params as any;

      const sale = await prisma.sale.findFirst({
        where: { id, merchantId, ...(storeId ? { storeId } : {}) },
        include: { items: true, payments: true, refunds: { include: { items: true } } },
      });

      if (!sale) return reply.code(404).send({ message: "Sale not found" });

      return reply.send({ sale });
    }
  );
}