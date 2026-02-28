import { FastifyInstance } from "fastify";
import { prisma } from "../../db/prisma";
import { authGuard } from "../../middlewares/authGuard";
import { tenantGuard } from "../../middlewares/tenantGuard";
import { requirePermission } from "../../middlewares/requirePermission";

export async function productRoutes(app: FastifyInstance) {
  // CREATE
  app.post(
    "/products",
    {
      preHandler: [authGuard, tenantGuard, requirePermission("products:write")],
    },
    async (req, reply) => {
      const merchantId = req.user.merchantId;
      const body = req.body as any;

      const name = body.name as string;
      const price = body.price as number;
      const sku = body.sku as string | undefined;
      const barcode = body.barcode as string | undefined;

      if (!name || price === undefined) {
        return reply.code(400).send({ message: "Missing name or price" });
      }

      const product = await prisma.product.create({
        data: {
          merchantId,
          name,
          price: Number(price),
          sku: sku?.trim() || null,
          barcode: barcode?.trim() || null,
        },
      });

      return reply.code(201).send(product);
    }
  );

  // LIST (pagination + search)
  app.get(
    "/products",
    {
      preHandler: [authGuard, tenantGuard, requirePermission("products:read")],
    },
    async (req) => {
      const merchantId = req.user.merchantId;

      const q = (req.query as any).q as string | undefined;
      const page = Number((req.query as any).page ?? 1);
      const limit = Math.min(Number((req.query as any).limit ?? 20), 100);

      const skip = (Math.max(page, 1) - 1) * limit;

      const where: any = {
        merchantId,
        isDeleted: false,
      };

      if (q && q.trim()) {
        where.OR = [
          { name: { contains: q.trim(), mode: "insensitive" } },
          { sku: { contains: q.trim(), mode: "insensitive" } },
          { barcode: { contains: q.trim(), mode: "insensitive" } },
        ];
      }

      const [items, total] = await prisma.$transaction([
        prisma.product.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.product.count({ where }),
      ]);

      return {
        page: Math.max(page, 1),
        limit,
        total,
        pages: Math.ceil(total / limit),
        items,
      };
    }
  );

  // GET ONE
  app.get(
    "/products/:id",
    {
      preHandler: [authGuard, tenantGuard, requirePermission("products:read")],
    },
    async (req, reply) => {
      const merchantId = req.user.merchantId;
      const { id } = req.params as any;

      const product = await prisma.product.findFirst({
        where: { id, merchantId, isDeleted: false },
      });

      if (!product) return reply.code(404).send({ message: "Product not found" });
      return product;
    }
  );

  // UPDATE
  app.patch(
    "/products/:id",
    {
      preHandler: [authGuard, tenantGuard, requirePermission("products:write")],
    },
    async (req, reply) => {
      const merchantId = req.user.merchantId;
      const { id } = req.params as any;
      const body = req.body as any;

      // ensure product belongs to merchant
      const exists = await prisma.product.findFirst({
        where: { id, merchantId, isDeleted: false },
        select: { id: true },
      });
      if (!exists) return reply.code(404).send({ message: "Product not found" });

      const data: any = {};
      if (body.name !== undefined) data.name = String(body.name);
      if (body.price !== undefined) data.price = Number(body.price);
      if (body.sku !== undefined) data.sku = body.sku ? String(body.sku).trim() : null;
      if (body.barcode !== undefined) data.barcode = body.barcode ? String(body.barcode).trim() : null;

      const updated = await prisma.product.update({
        where: { id },
        data,
      });

      return updated;
    }
  );

  // SOFT DELETE
  app.delete(
    "/products/:id",
    {
      preHandler: [authGuard, tenantGuard, requirePermission("products:write")],
    },
    async (req, reply) => {
      const merchantId = req.user.merchantId;
      const { id } = req.params as any;

      const exists = await prisma.product.findFirst({
        where: { id, merchantId, isDeleted: false },
        select: { id: true },
      });
      if (!exists) return reply.code(404).send({ message: "Product not found" });

      await prisma.product.update({
        where: { id },
        data: { isDeleted: true },
      });

      return reply.send({ message: "Product deleted" });
    }
  );
}