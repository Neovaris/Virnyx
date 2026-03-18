// src/modules/products/products.routes.ts
import { FastifyInstance } from "fastify";
import { prisma } from "../../db/prisma";
import { authGuard } from "../../middlewares/authGuard";
import { tenantGuard } from "../../middlewares/tenantGuard";
import { requirePermission } from "../../middlewares/requirePermission";

function asString(v: any) {
  return String(v ?? "").trim();
}
function asNumber(v: any) {
  return Number(v);
}
function asInt(v: any) {
  return Math.trunc(Number(v));
}
function isValidPrice(n: number) {
  return Number.isFinite(n) && n >= 0;
}

function isInvalidId(v: any) {
  const id = asString(v);
  return !id || id === "undefined" || id === "null";
}

function normalizeImageUrl(v: any) {
  const raw = asString(v);
  if (!raw) return null;

  if (raw.startsWith("/")) return raw;

  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

export async function productRoutes(app: FastifyInstance) {
  // =========================
  // CREATE
  // POST /products
  // =========================
  app.post(
    "/products",
    { preHandler: [authGuard, tenantGuard, requirePermission("products:write")] },
    async (req, reply) => {
      const { merchantId, storeId } = req.user as any;
      const body = req.body as any;

      const name = asString(body.name);
      const price = asNumber(body.price);
      const sku = body.sku !== undefined ? asString(body.sku) : "";
      const barcode = body.barcode !== undefined ? asString(body.barcode) : "";
      const imageUrl = body.imageUrl !== undefined ? normalizeImageUrl(body.imageUrl) : null;

      if (!name) return reply.code(400).send({ message: "name is required" });
      if (!isValidPrice(price)) return reply.code(400).send({ message: "price must be a number >= 0" });
      if (body.imageUrl !== undefined && !imageUrl) {
        return reply
          .code(400)
          .send({ message: "imageUrl must be an absolute http(s) URL or a root-relative path" });
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          const product = await tx.product.create({
            data: {
              merchantId,
              name,
              price,
              sku: sku || null,
              barcode: barcode || null,
              imageUrl,
            },
          });

          // v1: ensure inventory row exists for the current user's store (if any)
          if (storeId) {
            await tx.inventory.upsert({
              where: {
                merchantId_storeId_productId: { merchantId, storeId, productId: product.id },
              },
              update: {},
              create: { merchantId, storeId, productId: product.id, onHand: 0, reserved: 0 },
            });
          }

          return product;
        });

        return reply.code(201).send(result);
      } catch (e: any) {
        // Unique constraint (sku/barcode)
        if (e?.code === "P2002") {
          const target = Array.isArray(e?.meta?.target) ? e.meta.target.join(", ") : "unique field";
          return reply.code(409).send({ message: `Duplicate value for ${target}` });
        }
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    },
  );

  // =========================
  // LIST (pagination + search + sort)
  // GET /products?q=&page=&limit=&sort=&order=
  // =========================
  app.get(
    "/products",
    { preHandler: [authGuard, tenantGuard, requirePermission("products:read")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;

      const qp = req.query as any;
      const q = (qp.q as string | undefined)?.trim() || "";

      const page = Math.max(1, asInt(qp.page ?? 1));
      const limit = Math.min(100, Math.max(1, asInt(qp.limit ?? 20)));
      const skip = (page - 1) * limit;

      const sort = (qp.sort as string | undefined) || "createdAt"; // createdAt | name | price
      const order = ((qp.order as string | undefined) || "desc").toLowerCase() === "asc" ? "asc" : "desc";

      const orderBy =
        sort === "name"
          ? ({ name: order } as const)
          : sort === "price"
            ? ({ price: order } as const)
            : ({ createdAt: order } as const);

      const where: any = { merchantId, isDeleted: false };

      if (q) {
        where.OR = [
          { name: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
          { barcode: { contains: q, mode: "insensitive" } },
        ];
      }

      const [items, total] = await prisma.$transaction([
        prisma.product.findMany({
          where,
          orderBy,
          skip,
          take: limit,
        }),
        prisma.product.count({ where }),
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
  // GET ONE
  // GET /products/:id
  // =========================
  app.get(
    "/products/:id",
    { preHandler: [authGuard, tenantGuard, requirePermission("products:read")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const { id } = req.params as any;

      if (isInvalidId(id)) {
        return reply.code(400).send({ message: "Invalid product id" });
      }

      const product = await prisma.product.findFirst({
        where: { id, merchantId, isDeleted: false },
      });

      if (!product) return reply.code(404).send({ message: "Product not found" });
      return reply.send(product);
    },
  );

  // =========================
  // UPDATE
  // PATCH /products/:id
  // =========================
  app.patch(
    "/products/:id",
    { preHandler: [authGuard, tenantGuard, requirePermission("products:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const { id } = req.params as any;
      const body = req.body as any;

      if (isInvalidId(id)) {
        return reply.code(400).send({ message: "Invalid product id" });
      }

      const data: any = {};
      if (body.name !== undefined) {
        const name = asString(body.name);
        if (!name) return reply.code(400).send({ message: "name cannot be empty" });
        data.name = name;
      }
      if (body.price !== undefined) {
        const price = asNumber(body.price);
        if (!isValidPrice(price)) return reply.code(400).send({ message: "price must be a number >= 0" });
        data.price = price;
      }
      if (body.sku !== undefined) data.sku = asString(body.sku) || null;
      if (body.barcode !== undefined) data.barcode = asString(body.barcode) || null;
      if (body.imageUrl !== undefined) {
        const imageUrl = normalizeImageUrl(body.imageUrl);
        if (!imageUrl && asString(body.imageUrl)) {
          return reply
            .code(400)
            .send({ message: "imageUrl must be an absolute http(s) URL or a root-relative path" });
        }
        data.imageUrl = imageUrl;
      }

      if (Object.keys(data).length === 0) {
        return reply.code(400).send({ message: "No fields provided to update" });
      }

      try {
        // updateMany guards tenant + not deleted
        const updated = await prisma.product.updateMany({
          where: { id, merchantId, isDeleted: false },
          data,
        });

        if (updated.count !== 1) return reply.code(404).send({ message: "Product not found" });

        const fresh = await prisma.product.findFirst({
          where: { id, merchantId },
        });

        return reply.send(fresh);
      } catch (e: any) {
        if (e?.code === "P2002") {
          const target = Array.isArray(e?.meta?.target) ? e.meta.target.join(", ") : "unique field";
          return reply.code(409).send({ message: `Duplicate value for ${target}` });
        }
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    },
  );

  // =========================
  // SOFT DELETE
  // DELETE /products/:id
  // =========================
  app.delete(
    "/products/:id",
    { preHandler: [authGuard, tenantGuard, requirePermission("products:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const { id } = req.params as any;

      if (isInvalidId(id)) {
        return reply.code(400).send({ message: "Invalid product id" });
      }

      const updated = await prisma.product.updateMany({
        where: { id, merchantId, isDeleted: false },
        data: { isDeleted: true },
      });

      if (updated.count !== 1) return reply.code(404).send({ message: "Product not found" });

      return reply.send({ message: "Product deleted" });
    },
  );
}