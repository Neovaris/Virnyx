// src/modules/discounts/discounts.routes.ts
import { FastifyInstance } from "fastify";
import { prisma } from "../../db/prisma";
import { authGuard } from "../../middlewares/authGuard";
import { tenantGuard } from "../../middlewares/tenantGuard";
import { requirePermission } from "../../middlewares/requirePermission";

type DiscountRuleCreateBody = {
  name: string;
  code?: string;
  description?: string;
  type: "FIXED" | "PERCENTAGE" | "BOGO" | "TIERED";
  value: number;
  minOrderAmount?: number;
  minItemQty?: number;
  maxDiscount?: number;
  applicableToAll?: boolean;
  applicableProductIds?: string[];
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
  maxUsesTotal?: number;
  maxUsesPerCustomer?: number;
};

type DiscountRuleUpdateBody = Partial<DiscountRuleCreateBody>;

function asString(v: any) {
  return String(v ?? "").trim();
}

function asNumber(v: any) {
  return Number(v);
}

function asInt(v: any) {
  return Math.trunc(Number(v));
}

function asBoolean(v: any) {
  return Boolean(v);
}

export async function discountsRoutes(app: FastifyInstance) {
  // =========================
  // CREATE DISCOUNT RULE
  // POST /discounts/rules
  // =========================
  app.post(
    "/discounts/rules",
    { preHandler: [authGuard, tenantGuard, requirePermission("discounts:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const body = req.body as DiscountRuleCreateBody;

      const name = asString(body.name);
      const code = body.code ? asString(body.code).toUpperCase() : null;
      const description = body.description ? asString(body.description) : null;
      const type = asString(body.type);
      const value = asNumber(body.value);

      if (!name) return reply.code(400).send({ message: "name is required" });
      if (!["FIXED", "PERCENTAGE", "BOGO", "TIERED"].includes(type)) {
        return reply.code(400).send({ message: "Invalid type. Must be FIXED, PERCENTAGE, BOGO, or TIERED" });
      }
      if (!Number.isFinite(value) || value < 0) {
        return reply.code(400).send({ message: "value must be a number >= 0" });
      }

      const minOrderAmount = body.minOrderAmount ? asNumber(body.minOrderAmount) : null;
      const minItemQty = body.minItemQty ? asInt(body.minItemQty) : null;
      const maxDiscount = body.maxDiscount ? asNumber(body.maxDiscount) : null;
      const applicableToAll = body.applicableToAll !== false;
      const applicableProductIds = body.applicableProductIds ? JSON.stringify(body.applicableProductIds) : null;
      const startsAt = body.startsAt ? new Date(body.startsAt) : null;
      const endsAt = body.endsAt ? new Date(body.endsAt) : null;
      const isActive = body.isActive !== false;
      const maxUsesTotal = body.maxUsesTotal ? asInt(body.maxUsesTotal) : null;
      const maxUsesPerCustomer = body.maxUsesPerCustomer ? asInt(body.maxUsesPerCustomer) : null;

      if (minOrderAmount && minOrderAmount < 0) {
        return reply.code(400).send({ message: "minOrderAmount must be >= 0" });
      }

      try {
        const rule = await prisma.discountRule.create({
          data: {
            merchantId,
            name,
            code,
            description,
            type,
            value,
            minOrderAmount,
            minItemQty,
            maxDiscount,
            applicableToAll,
            applicableProductIds,
            startsAt,
            endsAt,
            isActive,
            maxUsesTotal,
            maxUsesPerCustomer,
          },
        });

        return reply.code(201).send(rule);
      } catch (e: any) {
        if (e?.code === "P2002") {
          // Duplicate code
          return reply.code(409).send({ message: "Promo code already exists for this merchant" });
        }
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    },
  );

  // =========================
  // LIST DISCOUNT RULES
  // GET /discounts/rules?page=&limit=&active=&search=
  // =========================
  app.get(
    "/discounts/rules",
    { preHandler: [authGuard, tenantGuard, requirePermission("discounts:read")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const qp = req.query as any;

      const page = Math.max(1, asInt(qp.page ?? 1));
      const limit = Math.min(100, Math.max(1, asInt(qp.limit ?? 20)));
      const skip = (page - 1) * limit;
      const activeOnly = qp.active === "true";
      const search = asString(qp.search || "");

      const where: any = { merchantId };
      if (activeOnly) where.isActive = true;

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      try {
        const [rules, total] = await Promise.all([
          prisma.discountRule.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.discountRule.count({ where }),
        ]);

        return reply.send({
          data: rules,
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
      } catch (e: any) {
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    },
  );

  // =========================
  // GET SINGLE DISCOUNT RULE
  // GET /discounts/rules/:id
  // =========================
  app.get(
    "/discounts/rules/:id",
    { preHandler: [authGuard, tenantGuard, requirePermission("discounts:read")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const { id } = req.params as any;

      try {
        const rule = await prisma.discountRule.findFirst({
          where: { id, merchantId },
        });

        if (!rule) return reply.code(404).send({ message: "Discount rule not found" });
        return reply.send(rule);
      } catch (e: any) {
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    },
  );

  // =========================
  // UPDATE DISCOUNT RULE
  // PATCH /discounts/rules/:id
  // =========================
  app.patch(
    "/discounts/rules/:id",
    { preHandler: [authGuard, tenantGuard, requirePermission("discounts:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const { id } = req.params as any;
      const body = req.body as DiscountRuleUpdateBody;

      try {
        const rule = await prisma.discountRule.findFirst({
          where: { id, merchantId },
        });

        if (!rule) return reply.code(404).send({ message: "Discount rule not found" });

        const updateData: any = {};

        if (body.name !== undefined) updateData.name = asString(body.name);
        if (body.code !== undefined) updateData.code = body.code ? asString(body.code).toUpperCase() : null;
        if (body.description !== undefined) updateData.description = body.description ? asString(body.description) : null;
        if (body.type !== undefined) {
          const type = asString(body.type);
          if (!["FIXED", "PERCENTAGE", "BOGO", "TIERED"].includes(type)) {
            return reply.code(400).send({ message: "Invalid type" });
          }
          updateData.type = type;
        }
        if (body.value !== undefined) {
          const value = asNumber(body.value);
          if (!Number.isFinite(value) || value < 0) {
            return reply.code(400).send({ message: "value must be a number >= 0" });
          }
          updateData.value = value;
        }
        if (body.minOrderAmount !== undefined) updateData.minOrderAmount = body.minOrderAmount ? asNumber(body.minOrderAmount) : null;
        if (body.minItemQty !== undefined) updateData.minItemQty = body.minItemQty ? asInt(body.minItemQty) : null;
        if (body.maxDiscount !== undefined) updateData.maxDiscount = body.maxDiscount ? asNumber(body.maxDiscount) : null;
        if (body.applicableToAll !== undefined) updateData.applicableToAll = asBoolean(body.applicableToAll);
        if (body.applicableProductIds !== undefined) {
          updateData.applicableProductIds = body.applicableProductIds ? JSON.stringify(body.applicableProductIds) : null;
        }
        if (body.startsAt !== undefined) updateData.startsAt = body.startsAt ? new Date(body.startsAt) : null;
        if (body.endsAt !== undefined) updateData.endsAt = body.endsAt ? new Date(body.endsAt) : null;
        if (body.isActive !== undefined) updateData.isActive = asBoolean(body.isActive);
        if (body.maxUsesTotal !== undefined) updateData.maxUsesTotal = body.maxUsesTotal ? asInt(body.maxUsesTotal) : null;
        if (body.maxUsesPerCustomer !== undefined) updateData.maxUsesPerCustomer = body.maxUsesPerCustomer ? asInt(body.maxUsesPerCustomer) : null;

        const updated = await prisma.discountRule.update({
          where: { id },
          data: updateData,
        });

        return reply.send(updated);
      } catch (e: any) {
        if (e?.code === "P2002") {
          return reply.code(409).send({ message: "Promo code already exists for this merchant" });
        }
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    },
  );

  // =========================
  // DELETE DISCOUNT RULE
  // DELETE /discounts/rules/:id
  // =========================
  app.delete(
    "/discounts/rules/:id",
    { preHandler: [authGuard, tenantGuard, requirePermission("discounts:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const { id } = req.params as any;

      try {
        const rule = await prisma.discountRule.findFirst({
          where: { id, merchantId },
        });

        if (!rule) return reply.code(404).send({ message: "Discount rule not found" });

        await prisma.discountRule.delete({ where: { id } });
        return reply.code(204).send();
      } catch (e: any) {
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    },
  );

  // =========================
  // VALIDATE PROMO CODE
  // POST /discounts/validate-code
  // =========================
  app.post(
    "/discounts/validate-code",
    { preHandler: [authGuard, tenantGuard] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const body = req.body as any;

      const code = asString(body.code).toUpperCase();
      if (!code) return reply.code(400).send({ message: "code is required" });

      const subtotal = asNumber(body.subtotal ?? 0);
      if (subtotal <= 0) return reply.code(400).send({ message: "subtotal must be > 0" });

      try {
        const rule = await prisma.discountRule.findFirst({
          where: {
            merchantId,
            code,
            isActive: true,
          },
        });

        if (!rule) {
          return reply.code(404).send({ message: "Promo code not found or inactive" });
        }

        // Check if code has expired
        if (rule.startsAt && new Date() < rule.startsAt) {
          return reply.code(400).send({ message: "Promo code has not started yet" });
        }
        if (rule.endsAt && new Date() > rule.endsAt) {
          return reply.code(400).send({ message: "Promo code has expired" });
        }

        // Check usage limits
        if (rule.maxUsesTotal && rule.usageCount >= rule.maxUsesTotal) {
          return reply.code(400).send({ message: "Promo code has reached max usage limit" });
        }

        // Check minimum order amount
        if (rule.minOrderAmount && subtotal < rule.minOrderAmount) {
          return reply.code(400).send({
            message: `Minimum order amount is ₵${rule.minOrderAmount}, your subtotal is ₵${subtotal.toFixed(2)}`,
          });
        }

        // Calculate discount
        let discountAmount = 0;
        if (rule.type === "FIXED") {
          discountAmount = rule.value;
        } else if (rule.type === "PERCENTAGE") {
          discountAmount = (subtotal * rule.value) / 100;
        }
        // BOGO and TIERED would need more complex logic (handled in terminal/admin for now)

        // Cap discount if maxDiscount is set
        if (rule.maxDiscount) {
          discountAmount = Math.min(discountAmount, rule.maxDiscount);
        }

        // Cap discount to not exceed subtotal
        discountAmount = Math.min(discountAmount, subtotal);

        return reply.send({
          valid: true,
          rule: {
            id: rule.id,
            name: rule.name,
            code: rule.code,
            type: rule.type,
            value: rule.value,
          },
          discountAmount: parseFloat(discountAmount.toFixed(2)),
        });
      } catch (e: any) {
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    },
  );

  // =========================
  // APPLY PROMO CODE (increment usage)
  // POST /discounts/apply-code
  // =========================
  app.post(
    "/discounts/apply-code",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const body = req.body as any;

      const code = asString(body.code).toUpperCase();
      if (!code) return reply.code(400).send({ message: "code is required" });

      try {
        const rule = await prisma.discountRule.findFirst({
          where: { merchantId, code, isActive: true },
        });

        if (!rule) return reply.code(404).send({ message: "Promo code not found or inactive" });

        // Increment usage count
        await prisma.discountRule.update({
          where: { id: rule.id },
          data: { usageCount: rule.usageCount + 1 },
        });

        return reply.code(200).send({ message: "Code applied successfully" });
      } catch (e: any) {
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    },
  );
}
