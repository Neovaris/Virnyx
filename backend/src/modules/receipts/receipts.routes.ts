import { FastifyInstance } from "fastify";
import { prisma } from "../../db/prisma";
import { authGuard } from "../../middlewares/authGuard";
import { tenantGuard } from "../../middlewares/tenantGuard";
import { requirePermission } from "../../middlewares/requirePermission";

export async function receiptsRoutes(app: FastifyInstance) {
  // =========================
  // RECEIPT REPRINT
  // GET /receipts/:saleId
  // =========================
  app.get(
    "/receipts/:saleId",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:read")] },
    async (req, reply) => {
      const { merchantId, storeId } = req.user as any;
      const { saleId } = req.params as any;

      const sale = await prisma.sale.findFirst({
        where: { id: saleId, merchantId, ...(storeId ? { storeId } : {}) },
        include: {
          items: true,
          payments: true,
          refunds: { include: { items: true } },
          store: { select: { id: true, name: true, address: true, phone: true } },
          merchant: { select: { id: true, name: true, currency: true, timezone: true } },
        },
      });

      if (!sale) return reply.code(404).send({ message: "Sale not found" });

      // Optional cashier snapshot (if cashierId stored)
      let cashier: any = null;
      if (sale.cashierId) {
        cashier = await prisma.user.findUnique({
          where: { id: sale.cashierId },
          select: { id: true, fullName: true, email: true },
        });
      }

      return reply.send({
        receipt: {
          saleId: sale.id,
          receiptNo: sale.receiptNo,
          status: sale.status,
          createdAt: sale.createdAt,
          subtotal: sale.subtotal,
          discount: sale.discount,
          tax: sale.tax,
          total: sale.total,
          items: sale.items,
          payments: sale.payments,
          refunds: sale.refunds,
          merchant: sale.merchant,
          store: sale.store,
          cashier,
        },
      });
    }
  );
}