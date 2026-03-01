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

export async function refundsRoutes(app: FastifyInstance) {
  // =========================
  // GET refundable items for a sale
  // GET /sales/:id/refundable-items
  // =========================
  app.get(
    "/sales/:id/refundable-items",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:read")] },
    async (req, reply) => {
      const { merchantId, storeId } = req.user;
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
          { qty: r._sum.qty ?? 0, amount: r._sum.amount ?? 0 },
        ]),
      );

      const items = sale.items.map((si) => {
        const r = refundedMap.get(si.id) ?? { qty: 0, amount: 0 };
        const remainingQty = si.qty - r.qty;

        return {
          saleItemId: si.id,
          productId: si.productId,
          name: si.nameSnap,
          soldQty: si.qty,
          refundedQty: r.qty,
          remainingQty: remainingQty < 0 ? 0 : remainingQty,
          priceSnap: si.priceSnap,
          lineTotal: si.lineTotal,
        };
      });

      return { saleId: sale.id, status: sale.status, items };
    },
  );

  // =========================
  // CREATE REFUND (strict per SaleItem)
  // POST /sales/:id/refunds
  // =========================
  app.post(
    "/sales/:id/refunds",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:write")] },
    async (req, reply) => {
      const { merchantId, storeId, sub: cashierId } = req.user;
      if (!storeId) return reply.code(400).send({ message: "User has no storeId" });

      const { id: saleId } = req.params as any;
      const body = req.body as RefundBody;

      if (!body?.items?.length) {
        return reply.code(400).send({ message: "Refund must have items" });
      }

      const restock = body.restock !== undefined ? Boolean(body.restock) : true;
      const reason = body.reason?.trim() || null;

      // normalize + validate
      const reqItems = body.items.map((i) => ({
        saleItemId: String(i.saleItemId),
        qty: Math.trunc(Number(i.qty)),
      }));

      if (
        reqItems.some((i) => !i.saleItemId || !Number.isFinite(i.qty) || i.qty <= 0)
      ) {
        return reply
          .code(400)
          .send({ message: "Each refund item needs saleItemId and qty > 0" });
      }

      try {
        const refund = await prisma.$transaction(async (tx) => {
          // Load sale + items
          const sale = await tx.sale.findFirst({
            where: { id: saleId, merchantId, storeId },
            include: { items: true },
          });

          if (!sale) return reply.code(404).send({ message: "Sale not found" });
          if (sale.status !== "COMPLETED") {
            return reply
              .code(400)
              .send({ message: `Cannot refund sale with status ${sale.status}` });
          }

          // refunded qty per saleItemId
          const refunded = await tx.refundItem.groupBy({
            by: ["saleItemId"],
            where: { refund: { saleId: sale.id, merchantId, storeId } },
            _sum: { qty: true },
          });

          const refundedMap = new Map(
            refunded.map((r) => [r.saleItemId, r._sum.qty ?? 0]),
          );
          const saleItemMap = new Map(sale.items.map((si) => [si.id, si]));

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
              return reply
                .code(400)
                .send({ message: "saleItemId not found in this sale" });
            }

            const already = refundedMap.get(si.id) ?? 0;
            const remaining = si.qty - already;

            if (it.qty > remaining) {
              return reply.code(400).send({
                message: "Refund qty exceeds remaining refundable qty",
                saleItemId: si.id,
                qtyRequested: it.qty,
                qtyRemaining: remaining,
              });
            }

            const amount = si.priceSnap * it.qty;
            refundTotal += amount;

            refundItemsCreate.push({
              saleItemId: si.id,
              productId: si.productId,
              qty: it.qty,
              amount,
            });
          }

          // Create refund + items
          const refund = await tx.refund.create({
            data: {
              merchantId,
              storeId,
              saleId: sale.id,
              cashierId,
              reason,
              restock,
              amount: refundTotal,
              items: { create: refundItemsCreate },
            },
            include: { items: true },
          });

          // Restock ledger IN if restock
          if (restock) {
            await tx.stockLedger.createMany({
              data: refund.items.map((ri) => ({
                merchantId,
                storeId,
                productId: ri.productId,
                type: "IN",
                qtyChange: ri.qty,
                reference: `REFUND:${refund.id}`,
                note: reason,
                createdBy: cashierId,
              })),
            });
          }

          return refund;
        });

        return reply.code(201).send({ refund });
      } catch (e: any) {
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    },
  );

  // =========================
  // LIST refunds for a sale
  // GET /sales/:id/refunds
  // =========================
  app.get(
    "/sales/:id/refunds",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:read")] },
    async (req, reply) => {
      const { merchantId, storeId } = req.user;
      if (!storeId) return reply.code(400).send({ message: "User has no storeId" });

      const { id: saleId } = req.params as any;

      const refunds = await prisma.refund.findMany({
        where: { saleId, merchantId, storeId },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      });

      return { refunds };
    },
  );
}