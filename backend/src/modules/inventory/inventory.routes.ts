import { FastifyInstance } from "fastify";
import { prisma } from "../../db/prisma";
import { authGuard } from "../../middlewares/authGuard";
import { tenantGuard } from "../../middlewares/tenantGuard";
import { requirePermission } from "../../middlewares/requirePermission";

function toInt(v: any, def: number) {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? n : def;
}

function toDate(v: any) {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isFinite(d.getTime()) ? d : null;
}

export async function inventoryRoutes(app: FastifyInstance) {
  // =========================
  // LIST INVENTORY (for UI)
  // GET /inventory?q=&page=&limit=&lowStock=
  // =========================
  app.get(
    "/inventory",
    {
      preHandler: [authGuard, tenantGuard, requirePermission("inventory:read")],
    },
    async (req, reply) => {
      const { merchantId, storeId } = req.user as any;
      if (!storeId)
        return reply.code(400).send({ message: "User has no storeId" });

      const q = String((req.query as any)?.q ?? "").trim();
      const page = Math.max(1, Number((req.query as any)?.page ?? 1));
      const limit = Math.min(
        100,
        Math.max(1, Number((req.query as any)?.limit ?? 20)),
      );
      const lowStock =
        (req.query as any)?.lowStock !== undefined
          ? Number((req.query as any)?.lowStock)
          : null;

      const skip = (page - 1) * limit;

      const productWhere: any = { merchantId, isDeleted: false };
      if (q) {
        productWhere.OR = [
          { name: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
          { barcode: { contains: q, mode: "insensitive" } },
        ];
      }

      // We join via Inventory, but still want products with 0 inventory row to show as 0.
      // Approach: query products page, then fetch inventory rows for those products.
      const [products, total] = await prisma.$transaction([
        prisma.product.findMany({
          where: productWhere,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            price: true,
          },
        }),
        prisma.product.count({ where: productWhere }),
      ]);

      const productIds = products.map((p) => p.id);

      const invRows = await prisma.inventory.findMany({
        where: { merchantId, storeId, productId: { in: productIds } },
        select: {
          productId: true,
          onHand: true,
          reserved: true,
          updatedAt: true,
        },
      });

      const invMap = new Map(invRows.map((r) => [r.productId, r]));

      let items = products.map((p) => {
        const inv = invMap.get(p.id);
        const onHand = inv?.onHand ?? 0;
        const reserved = inv?.reserved ?? 0;
        const available = onHand - reserved;

        return {
          productId: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          price: p.price,
          onHand,
          reserved,
          available,
          updatedAt: inv?.updatedAt ?? null,
        };
      });

      if (lowStock !== null && Number.isFinite(lowStock)) {
        items = items.filter((x) => x.onHand <= lowStock);
      }

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
  // STOCK IN (increase) + ledger IN
  // POST /inventory/stock-in
  // =========================
  app.post(
    "/inventory/stock-in",
    {
      preHandler: [
        authGuard,
        tenantGuard,
        requirePermission("inventory:write"),
      ],
    },
    async (req, reply) => {
      const { merchantId, storeId, sub: userId } = req.user as any;
      const body = req.body as any;

      const productId = String(body.productId ?? "");
      const qty = Math.trunc(Number(body.qty));
      const unitCost =
        body.unitCost !== undefined ? Number(body.unitCost) : null;
      const note = (body.note as string | undefined)?.trim() || null;

      if (!storeId)
        return reply.code(400).send({ message: "User has no storeId" });
      if (!productId || !Number.isFinite(qty) || qty <= 0) {
        return reply
          .code(400)
          .send({ message: "productId and qty (>0) are required" });
      }
      if (unitCost !== null && (!Number.isFinite(unitCost) || unitCost < 0)) {
        return reply.code(400).send({ message: "unitCost must be >= 0" });
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          const product = await tx.product.findFirst({
            where: { id: productId, merchantId, isDeleted: false },
            select: { id: true },
          });
          if (!product) {
            throw Object.assign(new Error("PRODUCT_NOT_FOUND"), {
              statusCode: 404,
              payload: { message: "Product not found" },
            });
          }

          const inv = await tx.inventory.upsert({
            where: {
              merchantId_storeId_productId: { merchantId, storeId, productId },
            },
            update: { onHand: { increment: qty } },
            create: { merchantId, storeId, productId, onHand: qty },
          });

          const entry = await tx.stockLedger.create({
            data: {
              merchantId,
              storeId,
              productId,
              type: "IN",
              qtyChange: qty,
              unitCost: unitCost ?? undefined,
              note,
              reference: `STOCKIN:${inv.id}`,
              createdBy: userId,
            },
          });

          return { inventory: inv, ledger: entry };
        });

        return reply.code(201).send(result);
      } catch (e: any) {
        if (e?.statusCode && e?.payload)
          return reply.code(e.statusCode).send(e.payload);
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    },
  );

  // =========================
  // STOCK OUT (decrease) + ledger OUT
  // POST /inventory/stock-out
  // =========================
  app.post(
    "/inventory/stock-out",
    {
      preHandler: [
        authGuard,
        tenantGuard,
        requirePermission("inventory:write"),
      ],
    },
    async (req, reply) => {
      const { merchantId, storeId, sub: userId } = req.user as any;
      const body = req.body as any;

      const productId = String(body.productId ?? "");
      const qty = Math.trunc(Number(body.qty));
      const note = (body.note as string | undefined)?.trim() || null;

      if (!storeId)
        return reply.code(400).send({ message: "User has no storeId" });
      if (!productId || !Number.isFinite(qty) || qty <= 0) {
        return reply
          .code(400)
          .send({ message: "productId and qty (>0) are required" });
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          const product = await tx.product.findFirst({
            where: { id: productId, merchantId, isDeleted: false },
            select: { id: true },
          });
          if (!product) {
            throw Object.assign(new Error("PRODUCT_NOT_FOUND"), {
              statusCode: 404,
              payload: { message: "Product not found" },
            });
          }

          await tx.inventory.upsert({
            where: {
              merchantId_storeId_productId: { merchantId, storeId, productId },
            },
            update: {},
            create: { merchantId, storeId, productId, onHand: 0 },
          });

          const dec = await tx.inventory.updateMany({
            where: { merchantId, storeId, productId, onHand: { gte: qty } },
            data: { onHand: { decrement: qty } },
          });

          if (dec.count !== 1) {
            const inv = await tx.inventory.findUnique({
              where: {
                merchantId_storeId_productId: {
                  merchantId,
                  storeId,
                  productId,
                },
              },
              select: { onHand: true },
            });

            throw Object.assign(new Error("INSUFFICIENT_STOCK"), {
              statusCode: 400,
              payload: {
                message: "Insufficient stock",
                productId,
                qtyRequested: qty,
                qtyOnHand: inv?.onHand ?? 0,
              },
            });
          }

          const invAfter = await tx.inventory.findUnique({
            where: {
              merchantId_storeId_productId: { merchantId, storeId, productId },
            },
            select: { id: true, onHand: true },
          });

          const entry = await tx.stockLedger.create({
            data: {
              merchantId,
              storeId,
              productId,
              type: "OUT",
              qtyChange: -qty,
              note,
              reference: `STOCKOUT:${invAfter?.id ?? "INV"}`,
              createdBy: userId,
            },
          });

          return { inventory: invAfter, ledger: entry };
        });

        return reply.code(201).send(result);
      } catch (e: any) {
        if (e?.statusCode && e?.payload)
          return reply.code(e.statusCode).send(e.payload);
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    },
  );

  // =========================
  // ADJUST + ledger ADJUST
  // POST /inventory/adjust
  // =========================
  app.post(
    "/inventory/adjust",
    {
      preHandler: [
        authGuard,
        tenantGuard,
        requirePermission("inventory:write"),
      ],
    },
    async (req, reply) => {
      const { merchantId, storeId, sub: userId } = req.user as any;
      const body = req.body as any;

      const productId = String(body.productId ?? "");
      const note = (body.note as string | undefined)?.trim() || null;

      const hasNewOnHand = body.newOnHand !== undefined;
      const hasQtyChange = body.qtyChange !== undefined;

      if (!storeId)
        return reply.code(400).send({ message: "User has no storeId" });
      if (!productId)
        return reply.code(400).send({ message: "productId is required" });

      if ((hasNewOnHand && hasQtyChange) || (!hasNewOnHand && !hasQtyChange)) {
        return reply
          .code(400)
          .send({ message: "Provide exactly one of newOnHand OR qtyChange" });
      }

      const newOnHand = hasNewOnHand
        ? Math.trunc(Number(body.newOnHand))
        : null;
      const qtyChange = hasQtyChange
        ? Math.trunc(Number(body.qtyChange))
        : null;

      if (
        newOnHand !== null &&
        (!Number.isFinite(newOnHand) || newOnHand < 0)
      ) {
        return reply
          .code(400)
          .send({ message: "newOnHand must be an integer >= 0" });
      }
      if (
        qtyChange !== null &&
        (!Number.isFinite(qtyChange) || qtyChange === 0)
      ) {
        return reply
          .code(400)
          .send({ message: "qtyChange must be a non-zero integer" });
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          const product = await tx.product.findFirst({
            where: { id: productId, merchantId, isDeleted: false },
            select: { id: true },
          });
          if (!product) {
            throw Object.assign(new Error("PRODUCT_NOT_FOUND"), {
              statusCode: 404,
              payload: { message: "Product not found" },
            });
          }

          const inv0 = await tx.inventory.upsert({
            where: {
              merchantId_storeId_productId: { merchantId, storeId, productId },
            },
            update: {},
            create: { merchantId, storeId, productId, onHand: 0 },
          });

          const before = inv0.onHand;

          let delta: number;
          let after: number;

          if (newOnHand !== null) {
            after = newOnHand;
            delta = after - before;
          } else {
            delta = qtyChange!;
            after = before + delta;
          }

          if (after < 0) {
            throw Object.assign(new Error("NEGATIVE_STOCK"), {
              statusCode: 400,
              payload: {
                message: "Adjustment would make stock negative",
                before,
                delta,
                after,
              },
            });
          }

          const inv1 = await tx.inventory.update({
            where: { id: inv0.id },
            data: { onHand: after },
          });

          const entry = await tx.stockLedger.create({
            data: {
              merchantId,
              storeId,
              productId,
              type: "ADJUST",
              qtyChange: delta,
              note: note ?? `Adjust from ${before} to ${after}`,
              reference: `ADJUST:${inv1.id}`,
              createdBy: userId,
            },
          });

          return { inventory: inv1, before, after, delta, ledger: entry };
        });

        return reply.send(result);
      } catch (e: any) {
        if (e?.statusCode && e?.payload)
          return reply.code(e.statusCode).send(e.payload);
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    },
  );

  // =========================
  // CURRENT STOCK (Inventory)
  // GET /inventory/stock/:productId
  // =========================
  app.get(
    "/inventory/stock/:productId",
    {
      preHandler: [authGuard, tenantGuard, requirePermission("inventory:read")],
    },
    async (req, reply) => {
      const { merchantId, storeId } = req.user as any;
      const { productId } = req.params as any;

      if (!storeId)
        return reply.code(400).send({ message: "User has no storeId" });

      const product = await prisma.product.findFirst({
        where: { id: productId, merchantId, isDeleted: false },
        select: { id: true, name: true },
      });
      if (!product)
        return reply.code(404).send({ message: "Product not found" });

      const inv = await prisma.inventory.findUnique({
        where: {
          merchantId_storeId_productId: { merchantId, storeId, productId },
        },
        select: { onHand: true },
      });

      return reply.send({
        productId,
        productName: product.name,
        storeId,
        qtyOnHand: inv?.onHand ?? 0,
      });
    },
  );

  // =========================
  // LEDGER (audit trail)
  // GET /inventory/ledger?productId&type&reference&q&from&to&page&limit
  // =========================
  app.get(
    "/inventory/ledger",
    {
      preHandler: [authGuard, tenantGuard, requirePermission("inventory:read")],
    },
    async (req, reply) => {
      const { merchantId, storeId } = req.user as any;
      const q = String((req.query as any)?.q ?? "").trim();
      const productId = String((req.query as any)?.productId ?? "").trim();
      const type = String((req.query as any)?.type ?? "").trim(); // IN|OUT|ADJUST
      const reference = String((req.query as any)?.reference ?? "").trim();

      const page = Math.max(1, toInt((req.query as any)?.page, 1));
      const limit = Math.min(
        100,
        Math.max(1, toInt((req.query as any)?.limit, 20)),
      );
      const skip = (page - 1) * limit;

      const from = toDate((req.query as any)?.from);
      const to = toDate((req.query as any)?.to);

      if (!storeId)
        return reply.code(400).send({ message: "User has no storeId" });

      const where: any = { merchantId, storeId };

      if (productId) where.productId = productId;
      if (type) where.type = type;
      if (reference)
        where.reference = { contains: reference, mode: "insensitive" };

      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = from;
        if (to) where.createdAt.lte = to;
      }

      if (q) {
        where.OR = [
          { note: { contains: q, mode: "insensitive" } },
          { reference: { contains: q, mode: "insensitive" } },
        ];
      }

      const [items, total] = await prisma.$transaction([
        prisma.stockLedger.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          select: {
            id: true,
            productId: true,
            type: true,
            qtyChange: true,
            unitCost: true,
            reference: true,
            note: true,
            createdBy: true,
            createdAt: true,
            product: { select: { name: true, sku: true, barcode: true } },
          },
        }),
        prisma.stockLedger.count({ where }),
      ]);

      return reply.send({
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        items: items.map((x) => ({
          ...x,
          productName: x.product?.name ?? null,
          sku: x.product?.sku ?? null,
          barcode: x.product?.barcode ?? null,
          product: undefined,
        })),
      });
    },
  );
}
