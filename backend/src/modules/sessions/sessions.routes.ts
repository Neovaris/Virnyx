import { FastifyInstance } from "fastify";
import { prisma } from "../../db/prisma";
import { authGuard } from "../../middlewares/authGuard";
import { tenantGuard } from "../../middlewares/tenantGuard";
import { requirePermission } from "../../middlewares/requirePermission";

type OpenBody = {
  openingCash?: number;
  note?: string;
};

type CloseBody = {
  closingCash: number;
  note?: string;
};

export async function sessionsRoutes(app: FastifyInstance) {
  // =========================
  // OPEN SHIFT
  // POST /sessions/open
  // =========================
  app.post(
    "/sessions/open",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:write")] },
    async (req, reply) => {
      const { merchantId, storeId, sub: cashierId } = req.user;
      if (!storeId) return reply.code(400).send({ message: "User has no storeId" });

      const body = req.body as OpenBody;
      const openingCash = Number(body?.openingCash ?? 0);
      const note = body?.note?.trim() || null;

      if (!Number.isFinite(openingCash) || openingCash < 0) {
        return reply.code(400).send({ message: "Invalid openingCash" });
      }

      // Enforce: 1 open shift per cashier per store
      const existing = await prisma.shiftSession.findFirst({
        where: { merchantId, storeId, cashierId, status: "OPEN" },
        orderBy: { openedAt: "desc" },
      });

      if (existing) {
        return reply.code(400).send({
          message: "You already have an OPEN shift. Close it before opening a new one.",
          sessionId: existing.id,
          openedAt: existing.openedAt,
        });
      }

      const session = await prisma.shiftSession.create({
        data: {
          merchantId,
          storeId,
          cashierId,
          openingCash,
          note,
          status: "OPEN",
        },
      });

      return reply.code(201).send({ session });
    },
  );

  // =========================
  // GET ACTIVE SHIFT
  // GET /sessions/active
  // =========================
  app.get(
    "/sessions/active",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:read")] },
    async (req, reply) => {
      const { merchantId, storeId, sub: cashierId } = req.user;
      if (!storeId) return reply.code(400).send({ message: "User has no storeId" });

      const session = await prisma.shiftSession.findFirst({
        where: { merchantId, storeId, cashierId, status: "OPEN" },
        orderBy: { openedAt: "desc" },
      });

      return { session };
    },
  );

  // =========================
  // CLOSE SHIFT
  // POST /sessions/:id/close
  // =========================
  app.post(
    "/sessions/:id/close",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:write")] },
    async (req, reply) => {
      const { merchantId, storeId, sub: cashierId } = req.user;
      if (!storeId) return reply.code(400).send({ message: "User has no storeId" });

      const { id } = req.params as any;
      const body = req.body as CloseBody;

      const closingCash = Number(body?.closingCash);
      const note = body?.note?.trim() || null;

      if (!Number.isFinite(closingCash) || closingCash < 0) {
        return reply.code(400).send({ message: "Invalid closingCash" });
      }

      const session = await prisma.shiftSession.findFirst({
        where: { id, merchantId, storeId, cashierId },
      });

      if (!session) return reply.code(404).send({ message: "Session not found" });
      if (session.status !== "OPEN") {
        return reply.code(400).send({ message: "Session is already closed" });
      }

      // Compute totals within session window
      const from = session.openedAt;
      const to = new Date(); // close time now

      // Cash sales (completed only)
      const cashSalesAgg = await prisma.payment.aggregate({
        where: {
          method: "CASH",
          sale: {
            merchantId,
            storeId,
            cashierId,
            status: "COMPLETED",
            createdAt: { gte: from, lt: to },
          },
        },
        _sum: { amount: true },
      });

      // Cash refunds (refunds created by cashier during session window)
      // NOTE: we assume refunds are always cash-out from drawer for v1.
      const cashRefundsAgg = await prisma.refund.aggregate({
        where: {
          merchantId,
          storeId,
          cashierId,
          createdAt: { gte: from, lt: to },
        },
        _sum: { amount: true },
      });

      const cashSales = cashSalesAgg._sum.amount ?? 0;
      const cashRefunds = cashRefundsAgg._sum.amount ?? 0;

      const expectedCash = (session.openingCash ?? 0) + cashSales - cashRefunds;
      const difference = closingCash - expectedCash;

      const closed = await prisma.shiftSession.update({
        where: { id: session.id },
        data: {
          status: "CLOSED",
          closedAt: to,
          closingCash,
          expectedCash,
          difference,
          note: note ?? session.note,
        },
      });

      return reply.send({
        session: closed,
        computed: {
          cashSales,
          cashRefunds,
          expectedCash,
          difference,
        },
      });
    },
  );

  // =========================
  // SESSION SUMMARY
  // GET /sessions/:id/summary
  // =========================
  app.get(
    "/sessions/:id/summary",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:read")] },
    async (req, reply) => {
      const { merchantId, storeId, sub: cashierId } = req.user;
      if (!storeId) return reply.code(400).send({ message: "User has no storeId" });

      const { id } = req.params as any;

      const session = await prisma.shiftSession.findFirst({
        where: { id, merchantId, storeId, cashierId },
      });

      if (!session) return reply.code(404).send({ message: "Session not found" });

      const from = session.openedAt;
      const to = session.closedAt ?? new Date();

      const salesAgg = await prisma.sale.aggregate({
        where: {
          merchantId,
          storeId,
          cashierId,
          status: "COMPLETED",
          createdAt: { gte: from, lt: to },
        },
        _sum: { subtotal: true, discount: true, tax: true, total: true },
        _count: true,
      });

      const refundsAgg = await prisma.refund.aggregate({
        where: { merchantId, storeId, cashierId, createdAt: { gte: from, lt: to } },
        _sum: { amount: true },
        _count: true,
      });

      const payments = await prisma.payment.findMany({
        where: {
          sale: {
            merchantId,
            storeId,
            cashierId,
            status: "COMPLETED",
            createdAt: { gte: from, lt: to },
          },
        },
        select: { method: true, amount: true },
      });

      const paymentsByMethod: Record<string, number> = {};
      for (const p of payments) {
        paymentsByMethod[p.method] = (paymentsByMethod[p.method] ?? 0) + p.amount;
      }

      return {
        session,
        window: { from, to, isClosed: Boolean(session.closedAt) },
        sales: {
          count: salesAgg._count,
          subtotal: salesAgg._sum.subtotal ?? 0,
          discount: salesAgg._sum.discount ?? 0,
          tax: salesAgg._sum.tax ?? 0,
          total: salesAgg._sum.total ?? 0,
        },
        refunds: {
          count: refundsAgg._count,
          amount: refundsAgg._sum.amount ?? 0,
        },
        payments: paymentsByMethod,
      };
    },
  );
}