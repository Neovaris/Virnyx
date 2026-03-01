import { FastifyInstance } from "fastify";
import { prisma } from "../../db/prisma";
import { authGuard } from "../../middlewares/authGuard";
import { tenantGuard } from "../../middlewares/tenantGuard";
import { requirePermission } from "../../middlewares/requirePermission";

function startOfDayUTC(dateStr: string) {
  // dateStr: YYYY-MM-DD
  const d = new Date(dateStr + "T00:00:00.000Z");
  return d;
}

function endExclusiveUTC(dateStr: string) {
  // next day 00:00Z (exclusive)
  const start = startOfDayUTC(dateStr);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

export async function reportsRoutes(app: FastifyInstance) {
  // =========================
  // Z-REPORT (Daily)
  // GET /reports/daily?date=YYYY-MM-DD
  // =========================
  app.get(
    "/reports/daily",
    {
      preHandler: [
        authGuard,
        tenantGuard as any,
        requirePermission("sales:read"),
      ],
    },
    async (req, reply) => {
      const { merchantId, storeId } = req.user;
      if (!storeId)
        return reply.code(400).send({ message: "User has no storeId" });

      const date =
        ((req.query as any).date as string) ||
        new Date().toISOString().slice(0, 10);

      const from = startOfDayUTC(date);
      const to = endExclusiveUTC(date);

      // Sales totals (COMPLETED only)
      const [salesAgg, completedCount, voidedCount] = await prisma.$transaction(
        [
          prisma.sale.aggregate({
            where: {
              merchantId,
              storeId,
              status: "COMPLETED",
              createdAt: { gte: from, lt: to },
            },
            _sum: { subtotal: true, discount: true, tax: true, total: true },
          }),
          prisma.sale.count({
            where: {
              merchantId,
              storeId,
              status: "COMPLETED",
              createdAt: { gte: from, lt: to },
            },
          }),
          prisma.sale.count({
            where: {
              merchantId,
              storeId,
              status: "VOIDED",
              createdAt: { gte: from, lt: to },
            },
          }),
        ],
      );

      const refundAgg = await prisma.refund.aggregate({
        where: {
          merchantId,
          storeId,
          createdAt: { gte: from, lt: to },
        },
        _sum: { amount: true },
        _count: true,
      });

      // Payment breakdown (COMPLETED sales only)
      const payments = await prisma.payment.findMany({
        where: {
          sale: {
            merchantId,
            storeId,
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

      // Top products (by qty) (COMPLETED only)
      const top = await prisma.saleItem.groupBy({
        by: ["productId"],
        where: {
          sale: {
            merchantId,
            storeId,
            status: "COMPLETED",
            createdAt: { gte: from, lt: to },
          },
        },
        _sum: { qty: true, lineTotal: true },
        orderBy: { _sum: { qty: "desc" } },
        take: 10,
      });

      const topProductIds = top.map((x) => x.productId);
      const productNames = await prisma.product.findMany({
        where: { id: { in: topProductIds }, merchantId },
        select: { id: true, name: true },
      });
      const nameMap = new Map(productNames.map((p) => [p.id, p.name]));

      const topProducts = top.map((x) => ({
        productId: x.productId,
        name: nameMap.get(x.productId) ?? "Unknown",
        qty: x._sum.qty ?? 0,
        revenue: x._sum.lineTotal ?? 0,
      }));

      const grossTotal = salesAgg._sum.total ?? 0;
      const refundTotal = refundAgg._sum.amount ?? 0;
      const netTotal = grossTotal - refundTotal;

      return {
        date,
        storeId,
        sales: {
          completedCount,
          voidedCount,
          subtotal: salesAgg._sum.subtotal ?? 0,
          discount: salesAgg._sum.discount ?? 0,
          tax: salesAgg._sum.tax ?? 0,
          grossTotal,
          refunds: refundTotal,
          netTotal,
        },
        payments: paymentsByMethod,
        topProducts,
      };
    },
  );

  // Hourly sales report
  app.get(
    "/reports/hourly",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:read")] },
    async (req, reply) => {
      const { merchantId, storeId } = req.user;
      if (!storeId)
        return reply.code(400).send({ message: "User has no storeId" });

      const date =
        ((req.query as any).date as string) ||
        new Date().toISOString().slice(0, 10);
      const from = startOfDayUTC(date);
      const to = endExclusiveUTC(date);

      // Completed sales only
      const sales = await prisma.sale.findMany({
        where: {
          merchantId,
          storeId,
          status: "COMPLETED",
          createdAt: { gte: from, lt: to },
        },
        select: { total: true, createdAt: true },
      });

      // 24 buckets
      const buckets = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: 0,
        total: 0,
      }));

      for (const s of sales) {
        const hour = new Date(s.createdAt).getUTCHours(); // UTC buckets (fine for Ghana)
        buckets[hour].count += 1;
        buckets[hour].total += s.total;
      }

      const peak = buckets.reduce(
        (best, b) => (b.total > best.total ? b : best),
        buckets[0],
      );

      return {
        date,
        storeId,
        buckets,
        peakHour: peak.hour,
        peakTotal: peak.total,
      };
    },
  );

  // =========================
  // RANGE SUMMARY
  // GET /reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
  // (to is inclusive as a date)
  // =========================
  app.get(
    "/reports/summary",
    {
      preHandler: [
        authGuard,
        tenantGuard as any,
        requirePermission("sales:read"),
      ],
    },
    async (req, reply) => {
      const { merchantId, storeId } = req.user;
      if (!storeId)
        return reply.code(400).send({ message: "User has no storeId" });

      const fromStr = (req.query as any).from as string;
      const toStr = (req.query as any).to as string;

      if (!fromStr || !toStr) {
        return reply
          .code(400)
          .send({ message: "from and to are required (YYYY-MM-DD)" });
      }

      const from = startOfDayUTC(fromStr);
      const toExclusive = new Date(endExclusiveUTC(toStr).getTime()); // inclusive end date -> exclusive next day

      const [salesAgg, completedCount, voidedCount] = await prisma.$transaction(
        [
          prisma.sale.aggregate({
            where: {
              merchantId,
              storeId,
              status: "COMPLETED",
              createdAt: { gte: from, lt: toExclusive },
            },
            _sum: { subtotal: true, discount: true, tax: true, total: true },
          }),
          prisma.sale.count({
            where: {
              merchantId,
              storeId,
              status: "COMPLETED",
              createdAt: { gte: from, lt: toExclusive },
            },
          }),
          prisma.sale.count({
            where: {
              merchantId,
              storeId,
              status: "VOIDED",
              createdAt: { gte: from, lt: toExclusive },
            },
          }),
        ],
      );

      const refundAgg = await prisma.refund.aggregate({
        where: {
          merchantId,
          storeId,
          createdAt: { gte: from, lt: toExclusive },
        },
        _sum: { amount: true },
      });

      const payments = await prisma.payment.findMany({
        where: {
          sale: {
            merchantId,
            storeId,
            status: "COMPLETED",
            createdAt: { gte: from, lt: toExclusive },
          },
        },
        select: { method: true, amount: true },
      });

      const paymentsByMethod: Record<string, number> = {};
      for (const p of payments)
        paymentsByMethod[p.method] =
          (paymentsByMethod[p.method] ?? 0) + p.amount;

      const grossTotal = salesAgg._sum.total ?? 0;
      const refunds = refundAgg._sum.amount ?? 0;
      const netTotal = grossTotal - refunds;

      return {
        from: fromStr,
        to: toStr,
        storeId,
        sales: {
          completedCount,
          voidedCount,
          subtotal: salesAgg._sum.subtotal ?? 0,
          discount: salesAgg._sum.discount ?? 0,
          tax: salesAgg._sum.tax ?? 0,
          grossTotal,
          refunds,
          netTotal,
        },
        payments: paymentsByMethod,
      };
    },
  );

  // =========================
  // SALES LIST (for report screen)
  // GET /reports/sales?date=YYYY-MM-DD&status=COMPLETED|VOIDED&page=1&limit=20
  // =========================
  app.get(
    "/reports/sales",
    {
      preHandler: [
        authGuard,
        tenantGuard as any,
        requirePermission("sales:read"),
      ],
    },
    async (req, reply) => {
      const { merchantId, storeId } = req.user;
      if (!storeId)
        return reply.code(400).send({ message: "User has no storeId" });

      const date =
        ((req.query as any).date as string) ||
        new Date().toISOString().slice(0, 10);
      const status = ((req.query as any).status as string) || "COMPLETED";
      const page = Math.max(Number((req.query as any).page ?? 1), 1);
      const limit = Math.min(
        Math.max(Number((req.query as any).limit ?? 20), 1),
        100,
      );
      const skip = (page - 1) * limit;

      const from = startOfDayUTC(date);
      const to = endExclusiveUTC(date);

      const where = {
        merchantId,
        storeId,
        status,
        createdAt: { gte: from, lt: to },
      } as const;

      const [items, total] = await prisma.$transaction([
        prisma.sale.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          select: {
            id: true,
            receiptNo: true,
            status: true,
            subtotal: true,
            discount: true,
            tax: true,
            total: true,
            createdAt: true,
          },
        }),
        prisma.sale.count({ where }),
      ]);

      return {
        date,
        status,
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        items,
      };
    },
  );

  app.get(
    "/reports/low-stock",
    {
      preHandler: [authGuard, tenantGuard, requirePermission("inventory:read")],
    },
    async (req, reply) => {
      const { merchantId, storeId } = req.user;
      if (!storeId)
        return reply.code(400).send({ message: "User has no storeId" });

      const threshold = Number((req.query as any).threshold ?? 10);
      const limit = Math.min(
        Math.max(Number((req.query as any).limit ?? 20), 1),
        100,
      );

      if (!Number.isFinite(threshold)) {
        return reply.code(400).send({ message: "Invalid threshold" });
      }

      // Group ledger by product and sum qtyChange
      const grouped = await prisma.stockLedger.groupBy({
        by: ["productId"],
        where: { merchantId, storeId },
        _sum: { qtyChange: true },
      });

      // Filter low stock
      const low = grouped
        .map((g) => ({
          productId: g.productId,
          qtyOnHand: g._sum.qtyChange ?? 0,
        }))
        .filter((x) => x.qtyOnHand <= threshold)
        .sort((a, b) => a.qtyOnHand - b.qtyOnHand)
        .slice(0, limit);

      const productIds = low.map((x) => x.productId);

      const products = await prisma.product.findMany({
        where: { merchantId, id: { in: productIds }, isDeleted: false },
        select: { id: true, name: true, sku: true, barcode: true, price: true },
      });

      const pMap = new Map(products.map((p) => [p.id, p]));

      const items = low
        .map((x) => {
          const p = pMap.get(x.productId);
          if (!p) return null;
          return { ...p, qtyOnHand: x.qtyOnHand };
        })
        .filter(Boolean);

      return { storeId, threshold, limit, count: items.length, items };
    },
  );

  app.get(
    "/reports/cashiers",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:read")] },
    async (req, reply) => {
      const { merchantId, storeId } = req.user;
      if (!storeId)
        return reply.code(400).send({ message: "User has no storeId" });

      const date =
        ((req.query as any).date as string) ||
        new Date().toISOString().slice(0, 10);
      const from = startOfDayUTC(date);
      const to = endExclusiveUTC(date);

      // Pull sales for the day (completed + voided)
      const sales = await prisma.sale.findMany({
        where: { merchantId, storeId, createdAt: { gte: from, lt: to } },
        select: { cashierId: true, status: true, total: true },
      });

      const map = new Map<
        string,
        {
          cashierId: string;
          completedCount: number;
          voidedCount: number;
          totalRevenue: number;
        }
      >();

      for (const s of sales) {
        const cashierId = s.cashierId ?? "UNKNOWN";
        const row = map.get(cashierId) ?? {
          cashierId,
          completedCount: 0,
          voidedCount: 0,
          totalRevenue: 0,
        };

        if (s.status === "COMPLETED") {
          row.completedCount += 1;
          row.totalRevenue += s.total;
        } else if (s.status === "VOIDED") {
          row.voidedCount += 1;
        }

        map.set(cashierId, row);
      }

      const rows = Array.from(map.values()).sort(
        (a, b) => b.totalRevenue - a.totalRevenue,
      );

      // Attach cashier names (User table)
      const cashierIds = rows
        .filter((r) => r.cashierId !== "UNKNOWN")
        .map((r) => r.cashierId);
      const users = await prisma.user.findMany({
        where: { id: { in: cashierIds }, merchantId },
        select: { id: true, fullName: true, email: true },
      });
      const uMap = new Map(users.map((u) => [u.id, u]));

      const items = rows.map((r) => ({
        cashierId: r.cashierId,
        cashierName:
          r.cashierId === "UNKNOWN"
            ? "Unknown"
            : (uMap.get(r.cashierId)?.fullName ?? "Unknown"),
        email:
          r.cashierId === "UNKNOWN"
            ? null
            : (uMap.get(r.cashierId)?.email ?? null),
        completedCount: r.completedCount,
        voidedCount: r.voidedCount,
        totalRevenue: r.totalRevenue,
      }));

      return { date, storeId, count: items.length, items };
    },
  );

  app.get(
    "/reports/refunds/cashiers",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:read")] },
    async (req, reply) => {
      const { merchantId, storeId } = req.user;
      if (!storeId)
        return reply.code(400).send({ message: "User has no storeId" });

      const date =
        ((req.query as any).date as string) ||
        new Date().toISOString().slice(0, 10);

      const from = startOfDayUTC(date);
      const to = endExclusiveUTC(date);

      const refunds = await prisma.refund.findMany({
        where: { merchantId, storeId, createdAt: { gte: from, lt: to } },
        select: { cashierId: true, amount: true },
      });

      const map = new Map<
        string,
        { cashierId: string; count: number; amount: number }
      >();

      for (const r of refunds) {
        const cashierId = r.cashierId ?? "UNKNOWN";
        const row = map.get(cashierId) ?? { cashierId, count: 0, amount: 0 };
        row.count += 1;
        row.amount += r.amount;
        map.set(cashierId, row);
      }

      const rows = Array.from(map.values()).sort((a, b) => b.amount - a.amount);

      const cashierIds = rows
        .filter((r) => r.cashierId !== "UNKNOWN")
        .map((r) => r.cashierId);
      const users = await prisma.user.findMany({
        where: { id: { in: cashierIds }, merchantId },
        select: { id: true, fullName: true, email: true },
      });
      const uMap = new Map(users.map((u) => [u.id, u]));

      const items = rows.map((r) => ({
        cashierId: r.cashierId,
        cashierName:
          r.cashierId === "UNKNOWN"
            ? "Unknown"
            : (uMap.get(r.cashierId)?.fullName ?? "Unknown"),
        email:
          r.cashierId === "UNKNOWN"
            ? null
            : (uMap.get(r.cashierId)?.email ?? null),
        refundCount: r.count,
        refundAmount: r.amount,
      }));

      return { date, storeId, count: items.length, items };
    },
  );
}
