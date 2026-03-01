// src/modules/refunds/refunds.routes.ts
import { FastifyInstance } from "fastify";
import { prisma } from "../../db/prisma";
import { authGuard } from "../../middlewares/authGuard";
import { tenantGuard } from "../../middlewares/tenantGuard";
import { requirePermission } from "../../middlewares/requirePermission";

type RefundBody = {
  reason?: string;
  restock?: boolean; // default true
  items: Array<{ saleItemId: string; qty: number }>;
};

// 🔒 Toggle this if you want refund only in same shift as sale
const ENFORCE_SAME_SHIFT = false;

// 💰 Money rounding helper (avoid float drift)
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export async function refundsRoutes(app: FastifyInstance) {
  // =========================
  // GET refundable items for a sale
  // =========================
  app.get(
    "/sales/:id/refundable-items",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:read")] },
    async (req, reply) => {
      const { merchantId, storeId } = req.user as any;
      if (!storeId) return reply.code(400).send({ message: "User has no storeId" });

      const { id: saleId } = req.params as any;

      const sale = await prisma.sale.findFirst({
        where: { id: saleId, merchantId, storeId },
        include: { items: true },
      });

      if (!sale) return reply.code(404).send({ message: "Sale not found" });

      const refunded = await prisma.refundItem.groupBy({
        by: ["saleItemId"],
        where: { refund: { saleId: sale.id, merchantId, storeId } },
        _sum: { qty: true, amount: true },
      });

      const refundedMap = new Map(
        refunded.map((r) => [
          r.saleItemId,
          { qty: r._sum.qty ?? 0, amount: money(r._sum.amount ?? 0) },
        ])
      );

      const items = sale.items.map((si) => {
        const r = refundedMap.get(si.id) ?? { qty: 0, amount: 0 };
        const remainingQty = Math.max(0, si.qty - r.qty);

        return {
          saleItemId: si.id,
          productId: si.productId,
          name: si.nameSnap,
          soldQty: si.qty,
          refundedQty: r.qty,
          remainingQty,
          priceSnap: money(si.priceSnap),
          lineTotal: money(si.lineTotal),
        };
      });

      return reply.send({ saleId: sale.id, status: sale.status, items });
    }
  );

  // =========================
  // CREATE REFUND
  // =========================
  app.post(
    "/sales/:id/refunds",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:write")] },
    async (req, reply) => {
      const { merchantId, storeId, sub: cashierId } = req.user as any;
      if (!storeId) return reply.code(400).send({ message: "User has no storeId" });

      const { id: saleId } = req.params as any;
      const body = req.body as RefundBody;

      if (!body?.items?.length) {
        return reply.code(400).send({ message: "Refund must have items" });
      }

      const restock = body.restock !== undefined ? Boolean(body.restock) : true;
      const reason = body.reason?.trim() || null;

      // Normalize + validate (merge duplicates)
      const merged = new Map<string, number>();
      for (const it of body.items) {
        const saleItemId = String(it.saleItemId);
        const qty = Math.trunc(Number(it.qty));

        if (!saleItemId || !Number.isFinite(qty) || qty <= 0) {
          return reply.code(400).send({
            message: "Each refund item needs saleItemId and qty > 0",
          });
        }

        merged.set(saleItemId, (merged.get(saleItemId) ?? 0) + qty);
      }

      const reqItems = Array.from(merged.entries()).map(([saleItemId, qty]) => ({
        saleItemId,
        qty,
      }));

      try {
        const refund = await prisma.$transaction(async (tx) => {
          // Require OPEN shift
          const activeSession = await tx.shiftSession.findFirst({
            where: { merchantId, storeId, cashierId, status: "OPEN" },
            orderBy: { openedAt: "desc" },
          });

          if (!activeSession) {
            throw Object.assign(new Error("NO_OPEN_SHIFT"), {
              statusCode: 400,
              payload: {
                message: "No OPEN shift session. Open a shift before processing refunds.",
              },
            });
          }

          // Load sale
          const sale = await tx.sale.findFirst({
            where: { id: saleId, merchantId, storeId },
            include: { items: true },
          });

          if (!sale) {
            throw Object.assign(new Error("SALE_NOT_FOUND"), {
              statusCode: 404,
              payload: { message: "Sale not found" },
            });
          }

          if (sale.status !== "COMPLETED") {
            throw Object.assign(new Error("INVALID_SALE_STATUS"), {
              statusCode: 400,
              payload: { message: `Cannot refund sale with status ${sale.status}` },
            });
          }

          // Optional strict shift rule
          if (ENFORCE_SAME_SHIFT && sale.shiftSessionId && sale.shiftSessionId !== activeSession.id) {
            throw Object.assign(new Error("SHIFT_MISMATCH"), {
              statusCode: 400,
              payload: { message: "Refund must be processed in the same shift as the original sale." },
            });
          }

          // Already refunded qty per saleItemId
          const refunded = await tx.refundItem.groupBy({
            by: ["saleItemId"],
            where: { refund: { saleId: sale.id, merchantId, storeId } },
            _sum: { qty: true },
          });

          const refundedMap = new Map(refunded.map((r) => [r.saleItemId, r._sum.qty ?? 0]));
          const saleItemMap = new Map(sale.items.map((si) => [si.id, si] as const));

          let refundTotal = 0;

          const refundItemsCreate: Array<{
            saleItemId: string;
            productId: string;
            qty: number;
            amount: number;
          }> = [];

          for (const it of reqItems) {
            const si = saleItemMap.get(it.saleItemId);

            if (!si) {
              throw Object.assign(new Error("SALE_ITEM_NOT_FOUND"), {
                statusCode: 400,
                payload: {
                  message: "saleItemId not found in this sale",
                  saleItemId: it.saleItemId,
                },
              });
            }

            const already = refundedMap.get(si.id) ?? 0;
            const remaining = si.qty - already;

            if (it.qty > remaining) {
              throw Object.assign(new Error("OVER_REFUND"), {
                statusCode: 400,
                payload: {
                  message: "Refund qty exceeds remaining refundable qty",
                  saleItemId: si.id,
                  qtyRequested: it.qty,
                  qtyRemaining: remaining,
                },
              });
            }

            const amount = money(si.priceSnap * it.qty);
            refundTotal = money(refundTotal + amount);

            refundItemsCreate.push({
              saleItemId: si.id,
              productId: si.productId,
              qty: it.qty,
              amount,
            });
          }

          const createdRefund = await tx.refund.create({
            data: {
              merchantId,
              storeId,
              saleId: sale.id,
              cashierId,
              shiftSessionId: activeSession.id,
              reason,
              restock,
              amount: refundTotal,
              items: { create: refundItemsCreate },
            },
            include: { items: true },
          });

          // ✅ Restock: update Inventory + ledger IN
          if (restock) {
            // Inventory increment
            for (const ri of createdRefund.items) {
              await tx.inventory.upsert({
                where: {
                  merchantId_storeId_productId: {
                    merchantId,
                    storeId,
                    productId: ri.productId,
                  },
                },
                update: { onHand: { increment: ri.qty } },
                create: {
                  merchantId,
                  storeId,
                  productId: ri.productId,
                  onHand: ri.qty,
                },
              });
            }

            // Ledger IN entries (audit trail)
            await tx.stockLedger.createMany({
              data: createdRefund.items.map((ri) => ({
                merchantId,
                storeId,
                productId: ri.productId,
                type: "IN",
                qtyChange: ri.qty,
                reference: `REFUND:${createdRefund.id}`,
                note: reason,
                createdBy: cashierId,
              })),
            });
          }

          return createdRefund;
        });

        return reply.code(201).send({ refund });
      } catch (e: any) {
        if (e?.statusCode && e?.payload) return reply.code(e.statusCode).send(e.payload);
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    }
  );

  // =========================
  // LIST refunds for a sale
  // =========================
  app.get(
    "/sales/:id/refunds",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:read")] },
    async (req, reply) => {
      const { merchantId, storeId } = req.user as any;
      if (!storeId) return reply.code(400).send({ message: "User has no storeId" });

      const { id: saleId } = req.params as any;

      const refunds = await prisma.refund.findMany({
        where: { saleId, merchantId, storeId },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      });

      return reply.send({ refunds });
    }
  );
}