// src/modules/products/products.routes.ts
import { FastifyInstance } from "fastify";
import { prisma } from "../../db/prisma";
import { authGuard } from "../../middlewares/authGuard";
import { tenantGuard } from "../../middlewares/tenantGuard";
import { requirePermission } from "../../middlewares/requirePermission";

function asString(v: any) {
  return String(v ?? "").trim();
}

/**
 * Generate a unique Code128-compatible barcode for a merchant.
 * Format: VRX-XXXXXXXX (8 alphanumeric chars)
 * Retries up to 5 times to avoid the rare collision.
 */
async function generateUniqueBarcode(merchantId: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = Math.random().toString(36).slice(2, 10).toUpperCase().padEnd(8, "0");
    const barcode = `VRX-${suffix}`;
    const exists = await prisma.product.findFirst({
      where: { merchantId, barcode, isDeleted: false },
      select: { id: true },
    });
    if (!exists) return barcode;
  }
  // Final fallback with timestamp to guarantee uniqueness
  return `VRX-${Date.now().toString(36).toUpperCase().slice(-8)}`;
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
  // BARCODE CHECK
  // GET /products/barcode-check?barcode=XXX&excludeId=YYY
  // Returns { available: true } or { available: false, conflict: { id, name } }
  // =========================
  app.get(
    "/products/barcode-check",
    { preHandler: [authGuard, tenantGuard, requirePermission("products:read")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const qp = req.query as any;
      const barcode = asString(qp.barcode);
      const excludeId = asString(qp.excludeId);

      if (!barcode) return reply.code(400).send({ message: "barcode is required" });

      const conflict = await prisma.product.findFirst({
        where: {
          merchantId,
          barcode,
          isDeleted: false,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true, name: true },
      });

      if (conflict) {
        return reply.send({ available: false, conflict });
      }
      return reply.send({ available: true });
    },
  );

  // =========================
  // BARCODE GENERATE
  // POST /products/barcode-generate
  // Returns { barcode: "VRX-XXXXXXXX" }
  // =========================
  app.post(
    "/products/barcode-generate",
    { preHandler: [authGuard, tenantGuard, requirePermission("products:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const barcode = await generateUniqueBarcode(merchantId);
      return reply.send({ barcode });
    },
  );

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
      let barcode = body.barcode !== undefined ? asString(body.barcode) : "";
      const imageUrl = body.imageUrl !== undefined ? normalizeImageUrl(body.imageUrl) : null;
      const category = body.category !== undefined ? asString(body.category) : "Uncategorized";

      if (!name) return reply.code(400).send({ message: "name is required" });
      if (!isValidPrice(price)) return reply.code(400).send({ message: "price must be a number >= 0" });
      if (body.imageUrl !== undefined && !imageUrl) {
        return reply
          .code(400)
          .send({ message: "imageUrl must be an absolute http(s) URL or a root-relative path" });
      }

      // Auto-generate barcode if not provided
      if (!barcode) {
        barcode = await generateUniqueBarcode(merchantId);
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          const product = await tx.product.create({
            data: {
              merchantId,
              name,
              price,
              category,
              sku: sku || null,
              barcode: barcode,
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
      if (body.category !== undefined) {
        data.category = asString(body.category) || "Uncategorized";
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