import { FastifyInstance } from "fastify";
import { prisma } from "../../db/prisma";
import { authGuard } from "../../middlewares/authGuard";
import { tenantGuard } from "../../middlewares/tenantGuard";
import { requirePermission } from "../../middlewares/requirePermission";

export async function inventoryRoutes(app: FastifyInstance) {
  // STOCK IN (increase)
  app.post(
    "/inventory/stock-in",
    {
      preHandler: [authGuard, tenantGuard, requirePermission("inventory:write")],
    },
    async (req, reply) => {
      const { merchantId, storeId, sub: userId } = req.user;
      const body = req.body as any;

      const productId = body.productId as string;
      const qty = Number(body.qty);
      const unitCost = body.unitCost !== undefined ? Number(body.unitCost) : null;
      const note = body.note as string | undefined;

      if (!productId || !Number.isFinite(qty) || qty <= 0) {
        return reply.code(400).send({ message: "productId and qty (>0) are required" });
      }
      if (unitCost !== null && (!Number.isFinite(unitCost) || unitCost < 0)) {
        return reply.code(400).send({ message: "unitCost must be >= 0" });
      }
      if (!storeId) return reply.code(400).send({ message: "User has no storeId" });

      // ensure product belongs to merchant
      const product = await prisma.product.findFirst({
        where: { id: productId, merchantId, isDeleted: false },
        select: { id: true },
      });
      if (!product) return reply.code(404).send({ message: "Product not found" });

      const entry = await prisma.stockLedger.create({
        data: {
          merchantId,
          storeId,
          productId,
          type: "IN",
          qtyChange: Math.trunc(qty),
          unitCost,
          note: note?.trim() || null,
          createdBy: userId,
        },
      });

      return reply.code(201).send(entry);
    }
  );

  // STOCK OUT (decrease) — basic version (no “prevent negative” yet)
  app.post(
  "/inventory/stock-out",
  {
    preHandler: [authGuard, tenantGuard, requirePermission("inventory:write")],
  },
  async (req, reply) => {
    const { merchantId, storeId, sub: userId } = req.user;
    const body = req.body as any;

    const productId = body.productId as string;
    const qty = Number(body.qty);
    const note = body.note as string | undefined;

    if (!productId || !Number.isFinite(qty) || qty <= 0) {
      return reply.code(400).send({ message: "productId and qty (>0) are required" });
    }
    if (!storeId) return reply.code(400).send({ message: "User has no storeId" });

    const product = await prisma.product.findFirst({
      where: { id: productId, merchantId, isDeleted: false },
      select: { id: true },
    });
    if (!product) return reply.code(404).send({ message: "Product not found" });

    const result = await prisma.$transaction(async (tx) => {
      const agg = await tx.stockLedger.aggregate({
        where: { merchantId, storeId, productId },
        _sum: { qtyChange: true },
      });

      const currentStock = agg._sum.qtyChange ?? 0;

      if (currentStock < qty) {
        throw new Error("Insufficient stock");
      }

      return tx.stockLedger.create({
        data: {
          merchantId,
          storeId,
          productId,
          type: "OUT",
          qtyChange: -Math.trunc(qty),
          note: note?.trim() || null,
          createdBy: userId,
        },
      });
    });

    return reply.code(201).send(result);
  }
);

  // CURRENT STOCK for a product (computed sum)
  app.get(
    "/inventory/stock/:productId",
    {
      preHandler: [authGuard, tenantGuard, requirePermission("inventory:read")],
    },
    async (req, reply) => {
      const { merchantId, storeId } = req.user;
      const { productId } = req.params as any;

      if (!storeId) return reply.code(400).send({ message: "User has no storeId" });

      const product = await prisma.product.findFirst({
        where: { id: productId, merchantId, isDeleted: false },
        select: { id: true, name: true },
      });
      if (!product) return reply.code(404).send({ message: "Product not found" });

      const agg = await prisma.stockLedger.aggregate({
        where: { merchantId, storeId, productId },
        _sum: { qtyChange: true },
      });

      return {
        productId,
        productName: product.name,
        storeId,
        qtyOnHand: agg._sum.qtyChange ?? 0,
      };
    }
  );
}