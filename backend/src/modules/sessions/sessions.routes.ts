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
      if (!storeId)
        return reply.code(400).send({ message: "User has no storeId" });

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
          message:
            "You already have an OPEN shift. Close it before opening a new one.",
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
      if (!storeId)
        return reply.code(400).send({ message: "User has no storeId" });

      const session = await prisma.shiftSession.findFirst({
        where: { merchantId, storeId, cashierId, status: "OPEN" },
        orderBy: { openedAt: "desc" },
      });

      return { session };
    },
  );

  // =========================
  // SHIFT HISTORY (list)
  // GET /sessions/history?from&to&page&limit&status
  // =========================
  app.get(
    "/sessions/history",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:read")] },
    async (req, reply) => {
      const { merchantId, storeId, sub: cashierId } = req.user as any;
      if (!storeId)
        return reply.code(400).send({ message: "User has no storeId" });

      const q = req.query as any;

      const page = Math.max(1, Number(q.page ?? 1));
      const limit = Math.min(100, Math.max(1, Number(q.limit ?? 20)));
      const skip = (page - 1) * limit;

      const status =
        typeof q.status === "string" &&
        ["OPEN", "CLOSED"].includes(q.status.toUpperCase())
          ? q.status.toUpperCase()
          : undefined;

      // Date range filters (optional)
      const from = q.from ? new Date(String(q.from)) : undefined;
      const to = q.to ? new Date(String(q.to)) : undefined;

      if (from && Number.isNaN(from.getTime()))
        return reply.code(400).send({ message: "Invalid from date" });
      if (to && Number.isNaN(to.getTime()))
        return reply.code(400).send({ message: "Invalid to date" });

      // NOTE: This is cashier-scoped (same as your other session endpoints).
      // If you want admin to view all cashiers later, we’ll extend it.
      const where: any = {
        merchantId,
        storeId,
        cashierId,
        ...(status ? { status } : {}),
      };

      // Filter by openedAt range
      if (from || to) {
        where.openedAt = {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        };
      }

      const [items, total] = await prisma.$transaction([
        prisma.shiftSession.findMany({
          where,
          orderBy: { openedAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.shiftSession.count({ where }),
      ]);

      return reply.send({
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        items,
      });
    },
  );

  // =========================
  // SHIFT DETAILS
  // GET /sessions/:id
  // =========================
  app.get(
    "/sessions/:id",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:read")] },
    async (req, reply) => {
      const { merchantId, storeId, sub: cashierId } = req.user as any;
      if (!storeId)
        return reply.code(400).send({ message: "User has no storeId" });

      const { id } = req.params as any;

      const session = await prisma.shiftSession.findFirst({
        where: { id, merchantId, storeId, cashierId },
      });

      if (!session)
        return reply.code(404).send({ message: "Session not found" });

      const from = session.openedAt;
      const to = session.closedAt ?? new Date();

      // Strict: session.id must match
      const salesAgg = await prisma.sale.aggregate({
        where: {
          merchantId,
          storeId,
          cashierId,
          status: "COMPLETED",
          shiftSessionId: session.id,
          createdAt: { gte: from, lt: to },
        },
        _sum: { subtotal: true, discount: true, tax: true, total: true },
        _count: true,
      });

      const refundsAgg = await prisma.refund.aggregate({
        where: {
          merchantId,
          storeId,
          cashierId,
          shiftSessionId: session.id,
          createdAt: { gte: from, lt: to },
        },
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
            shiftSessionId: session.id,
            createdAt: { gte: from, lt: to },
          },
        },
        select: { method: true, amount: true },
      });

      const paymentsByMethod: Record<string, number> = {};
      for (const p of payments) {
        paymentsByMethod[p.method] =
          (paymentsByMethod[p.method] ?? 0) + p.amount;
      }

      // Cash drawer view (same logic used in close shift)
      const cashSales = paymentsByMethod["CASH"] ?? 0;
      const cashRefunds = refundsAgg._sum.amount ?? 0;
      const expectedCash = (session.openingCash ?? 0) + cashSales - cashRefunds;

      return reply.send({
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
        drawer: {
          openingCash: session.openingCash ?? 0,
          cashSales,
          cashRefunds,
          expectedCash,
          closingCash: session.closingCash ?? null,
          difference: session.difference ?? null,
        },
      });
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
      const { merchantId, storeId, sub: cashierId } = req.user as any;
      if (!storeId)
        return reply.code(400).send({ message: "User has no storeId" });

      const { id } = req.params as any;
      const body = req.body as CloseBody;

      const closingCash = Number(body?.closingCash);
      const note = body?.note?.trim() || null;

      if (!Number.isFinite(closingCash) || closingCash < 0) {
        return reply.code(400).send({ message: "Invalid closingCash" });
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          const session = await tx.shiftSession.findFirst({
            where: { id, merchantId, storeId, cashierId },
          });

          if (!session) {
            throw Object.assign(new Error("SESSION_NOT_FOUND"), {
              statusCode: 404,
              payload: { message: "Session not found" },
            });
          }

          if (session.status !== "OPEN") {
            throw Object.assign(new Error("SESSION_ALREADY_CLOSED"), {
              statusCode: 400,
              payload: { message: "Session is already closed" },
            });
          }

          const from = session.openedAt;
          const to = new Date();

          const cashSalesAgg = await tx.payment.aggregate({
            where: {
              method: "CASH",
              sale: {
                merchantId,
                storeId,
                cashierId,
                status: "COMPLETED",
                shiftSessionId: session.id,
                createdAt: { gte: from, lt: to },
              },
            },
            _sum: { amount: true },
          });

          const cashRefundsAgg = await tx.refund.aggregate({
            where: {
              merchantId,
              storeId,
              cashierId,
              shiftSessionId: session.id,
              createdAt: { gte: from, lt: to },
            },
            _sum: { amount: true },
          });

          const cashSales = cashSalesAgg._sum.amount ?? 0;
          const cashRefunds = cashRefundsAgg._sum.amount ?? 0;

          const expectedCash =
            (session.openingCash ?? 0) + cashSales - cashRefunds;
          const difference = closingCash - expectedCash;

          // Update safely: only if still OPEN
          const updated = await tx.shiftSession.updateMany({
            where: { id: session.id, status: "OPEN" },
            data: {
              status: "CLOSED",
              closedAt: to,
              closingCash,
              expectedCash,
              difference,
              note: note ?? session.note,
            },
          });

          if (updated.count !== 1) {
            throw Object.assign(new Error("SESSION_CLOSE_CONFLICT"), {
              statusCode: 409,
              payload: { message: "Session closing conflict. Try again." },
            });
          }

          const closed = await tx.shiftSession.findUnique({
            where: { id: session.id },
          });

          const cashier = await tx.user.findUnique({
            where: { id: cashierId },
            select: { id: true, fullName: true, email: true },
          });

          return {
            closed,
            cashier,
            computed: { cashSales, cashRefunds, expectedCash, difference },
          };
        });

        return reply.send({
          session: result.closed,
          cashier: result.cashier
            ? {
                id: result.cashier.id,
                name: result.cashier.fullName,
                email: result.cashier.email,
              }
            : { id: cashierId, name: "Unknown", email: null },
          computed: result.computed,
        });
      } catch (e: any) {
        if (e?.statusCode && e?.payload)
          return reply.code(e.statusCode).send(e.payload);
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
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
      if (!storeId)
        return reply.code(400).send({ message: "User has no storeId" });

      const { id } = req.params as any;

      const session = await prisma.shiftSession.findFirst({
        where: { id, merchantId, storeId, cashierId },
      });

      if (!session)
        return reply.code(404).send({ message: "Session not found" });

      const from = session.openedAt;
      const to = session.closedAt ?? new Date();

      const salesAgg = await prisma.sale.aggregate({
        where: {
          merchantId,
          storeId,
          cashierId,
          status: "COMPLETED",
          shiftSessionId: session.id, // ✅ strict
          createdAt: { gte: from, lt: to },
        },
        _sum: { subtotal: true, discount: true, tax: true, total: true },
        _count: true,
      });

      const refundsAgg = await prisma.refund.aggregate({
        where: {
          merchantId,
          storeId,
          cashierId,
          shiftSessionId: session.id, // ✅ strict (and spelled right)
          createdAt: { gte: from, lt: to },
        },
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
            shiftSessionId: session.id, // ✅ strict
            createdAt: { gte: from, lt: to },
          },
        },
        select: { method: true, amount: true },
      });

      const paymentsByMethod: Record<string, number> = {};
      for (const p of payments) {
        paymentsByMethod[p.method] =
          (paymentsByMethod[p.method] ?? 0) + p.amount;
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

  // =========================
  // ADMIN: LIST ALL SHIFTS
  // GET /sessions/admin/all?from&to&page&limit&status&cashierId
  // =========================
  app.get(
    "/sessions/admin/all",
    { preHandler: [authGuard, tenantGuard, requirePermission("reports:read")] },
    async (req, reply) => {
      const { merchantId, storeId } = req.user;
      if (!storeId)
        return reply.code(400).send({ message: "User has no storeId" });

      const q = req.query as any;

      const page = Math.max(1, Number(q.page ?? 1));
      const limit = Math.min(100, Math.max(1, Number(q.limit ?? 20)));
      const skip = (page - 1) * limit;

      const status =
        typeof q.status === "string" &&
        ["OPEN", "CLOSED"].includes(q.status.toUpperCase())
          ? q.status.toUpperCase()
          : undefined;

      // Date range filters (optional)
      const from = q.from ? new Date(String(q.from)) : undefined;
      const to = q.to ? new Date(String(q.to)) : undefined;

      if (from && Number.isNaN(from.getTime()))
        return reply.code(400).send({ message: "Invalid from date" });
      if (to && Number.isNaN(to.getTime()))
        return reply.code(400).send({ message: "Invalid to date" });

      const cashierId = q.cashierId ? String(q.cashierId) : undefined;

      const where: any = {
        merchantId,
        storeId,
        ...(status ? { status } : {}),
        ...(cashierId ? { cashierId } : {}),
      };

      // Filter by openedAt range
      if (from || to) {
        where.openedAt = {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        };
      }

      const [items, total] = await prisma.$transaction([
        prisma.shiftSession.findMany({
          where,
          include: {
            cashier: {
              select: { id: true, fullName: true, email: true },
            },
          },
          orderBy: { openedAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.shiftSession.count({ where }),
      ]);

      // Enrich each shift with summary data
      const enriched = await Promise.all(
        items.map(async (session) => {
          const from = session.openedAt;
          const to = session.closedAt ?? new Date();

          const salesAgg = await prisma.sale.aggregate({
            where: {
              merchantId,
              storeId,
              shiftSessionId: session.id,
              status: "COMPLETED",
              createdAt: { gte: from, lt: to },
            },
            _sum: { subtotal: true, discount: true, tax: true, total: true },
            _count: true,
          });

          const refundsAgg = await prisma.refund.aggregate({
            where: {
              merchantId,
              storeId,
              shiftSessionId: session.id,
              createdAt: { gte: from, lt: to },
            },
            _sum: { amount: true },
            _count: true,
          });

          const payments = await prisma.payment.findMany({
            where: {
              sale: {
                merchantId,
                storeId,
                shiftSessionId: session.id,
                status: "COMPLETED",
                createdAt: { gte: from, lt: to },
              },
            },
            select: { method: true, amount: true },
          });

          const paymentsByMethod: Record<string, number> = {};
          for (const p of payments) {
            paymentsByMethod[p.method] =
              (paymentsByMethod[p.method] ?? 0) + p.amount;
          }

          return {
            ...session,
            summary: {
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
            },
          };
        }),
      );

      return reply.send({
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        items: enriched,
      });
    },
  );
}
