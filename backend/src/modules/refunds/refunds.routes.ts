// src/modules/refunds/refunds.routes.ts
import { FastifyInstance } from "fastify";
import { prisma } from "../../db/prisma";
import { authGuard } from "../../middlewares/authGuard";
import { tenantGuard } from "../../middlewares/tenantGuard";
import { requirePermission } from "../../middlewares/requirePermission";
import { emailService } from "../notifications/emailService";
import { createValidationMiddleware } from "../../middlewares/validation";
import { CreateRefundSchema } from "../../common/validation";

type RefundBody = {
  reason?: string;
  restock?: boolean; // default true
  items: Array<{ saleItemId: string; qty: number }>;
};

// 🔒 Toggle this if you want refund only in same shift as sale
const ENFORCE_SAME_SHIFT = false;

// 💰 Money rounding helper (avoid float drift)
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export async function refundsRoutes(app: FastifyInstance) {
  // =========================
  // GET refundable items for a sale
  // =========================
  app.get(
    "/sales/:id/refundable-items",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:read")] },
    async (req, reply) => {
      const { merchantId, storeId } = req.user as any;
      if (!storeId) return reply.code(400).send({ message: "User has no storeId" });

      const { id: saleId } = req.params as any;

      const sale = await prisma.sale.findFirst({
        where: { id: saleId, merchantId, storeId },
        include: { items: true },
      });

      if (!sale) return reply.code(404).send({ message: "Sale not found" });

      const refunded = await prisma.refundItem.groupBy({
        by: ["saleItemId"],
        where: { refund: { saleId: sale.id, merchantId, storeId } },
        _sum: { qty: true, amount: true },
      });

      const refundedMap = new Map(
        refunded.map((r) => [
          r.saleItemId,
          { qty: r._sum.qty ?? 0, amount: money(r._sum.amount ?? 0) },
        ])
      );

      const items = sale.items.map((si) => {
        const r = refundedMap.get(si.id) ?? { qty: 0, amount: 0 };
        const remainingQty = Math.max(0, si.qty - r.qty);

        return {
          saleItemId: si.id,
          productId: si.productId,
          name: si.nameSnap,
          soldQty: si.qty,
          refundedQty: r.qty,
          remainingQty,
          priceSnap: money(si.priceSnap),
          lineTotal: money(si.lineTotal),
        };
      });

      return reply.send({ saleId: sale.id, status: sale.status, items });
    }
  );

  // =========================
  // CREATE REFUND
  // =========================
  app.post(
    "/sales/:id/refunds",
    {
      preHandler: [
        authGuard,
        tenantGuard,
        requirePermission("sales:write"),
        createValidationMiddleware(CreateRefundSchema),
      ],
    },
    async (req, reply) => {
      const { merchantId, storeId, sub: cashierId } = req.user as any;
      if (!storeId) return reply.code(400).send({ message: "User has no storeId" });

      const { id: saleId } = req.params as any;
      const body = req.body as RefundBody;

      if (!body?.items?.length) {
        return reply.code(400).send({ message: "Refund must have items" });
      }

      const restock = body.restock !== undefined ? Boolean(body.restock) : true;
      const reason = body.reason?.trim() || null;

      // Normalize + validate (merge duplicates)
      const merged = new Map<string, number>();
      for (const it of body.items) {
        const saleItemId = String(it.saleItemId);
        const qty = Math.trunc(Number(it.qty));

        if (!saleItemId || !Number.isFinite(qty) || qty <= 0) {
          return reply.code(400).send({
            message: "Each refund item needs saleItemId and qty > 0",
          });
        }

        merged.set(saleItemId, (merged.get(saleItemId) ?? 0) + qty);
      }

      const reqItems = Array.from(merged.entries()).map(([saleItemId, qty]) => ({
        saleItemId,
        qty,
      }));

      try {
        const refund = await prisma.$transaction(async (tx) => {
          // Require OPEN shift
          const activeSession = await tx.shiftSession.findFirst({
            where: { merchantId, storeId, cashierId, status: "OPEN" },
            orderBy: { openedAt: "desc" },
          });

          if (!activeSession) {
            throw Object.assign(new Error("NO_OPEN_SHIFT"), {
              statusCode: 400,
              payload: {
                message: "No OPEN shift session. Open a shift before processing refunds.",
              },
            });
          }

          // Load sale
          const sale = await tx.sale.findFirst({
            where: { id: saleId, merchantId, storeId },
            include: { items: true },
          });

          if (!sale) {
            throw Object.assign(new Error("SALE_NOT_FOUND"), {
              statusCode: 404,
              payload: { message: "Sale not found" },
            });
          }

          if (sale.status !== "COMPLETED") {
            throw Object.assign(new Error("INVALID_SALE_STATUS"), {
              statusCode: 400,
              payload: { message: `Cannot refund sale with status ${sale.status}` },
            });
          }

          // Optional strict shift rule
          if (ENFORCE_SAME_SHIFT && sale.shiftSessionId && sale.shiftSessionId !== activeSession.id) {
            throw Object.assign(new Error("SHIFT_MISMATCH"), {
              statusCode: 400,
              payload: { message: "Refund must be processed in the same shift as the original sale." },
            });
          }

          // Already refunded qty per saleItemId
          const refunded = await tx.refundItem.groupBy({
            by: ["saleItemId"],
            where: { refund: { saleId: sale.id, merchantId, storeId } },
            _sum: { qty: true },
          });

          const refundedMap = new Map(refunded.map((r) => [r.saleItemId, r._sum.qty ?? 0]));
          const saleItemMap = new Map(sale.items.map((si) => [si.id, si] as const));

          let refundTotal = 0;

          const refundItemsCreate: Array<{
            saleItemId: string;
            productId: string;
            qty: number;
            amount: number;
          }> = [];

          for (const it of reqItems) {
            const si = saleItemMap.get(it.saleItemId);

            if (!si) {
              throw Object.assign(new Error("SALE_ITEM_NOT_FOUND"), {
                statusCode: 400,
                payload: {
                  message: "saleItemId not found in this sale",
                  saleItemId: it.saleItemId,
                },
              });
            }

            const already = refundedMap.get(si.id) ?? 0;
            const remaining = si.qty - already;

            if (it.qty > remaining) {
              throw Object.assign(new Error("OVER_REFUND"), {
                statusCode: 400,
                payload: {
                  message: "Refund qty exceeds remaining refundable qty",
                  saleItemId: si.id,
                  qtyRequested: it.qty,
                  qtyRemaining: remaining,
                },
              });
            }

            const amount = money(si.priceSnap * it.qty);
            refundTotal = money(refundTotal + amount);

            refundItemsCreate.push({
              saleItemId: si.id,
              productId: si.productId,
              qty: it.qty,
              amount,
            });
          }

          // ✅ Determine approval status based on refund policy
          const refundPolicy = await tx.refundPolicySettings.findUnique({
            where: { merchantId },
          });

          const requiresApproval =
            refundPolicy &&
            refundPolicy.requireManagerApproval &&
            refundTotal >= refundPolicy.requireApprovalAboveAmount;

          const createdRefund = await tx.refund.create({
            data: {
              merchantId,
              storeId,
              saleId: sale.id,
              cashierId,
              shiftSessionId: activeSession.id,
              reason,
              restock,
              amount: refundTotal,
              approvalStatus: requiresApproval ? "PENDING_APPROVAL" : "APPROVED",
              approvedAt: requiresApproval ? null : new Date(),
              items: { create: refundItemsCreate },
            },
            include: { items: true },
          });

          // ✅ Restock: update Inventory + ledger IN
          if (restock) {
            // Inventory increment
            for (const ri of createdRefund.items) {
              await tx.inventory.upsert({
                where: {
                  merchantId_storeId_productId: {
                    merchantId,
                    storeId,
                    productId: ri.productId,
                  },
                },
                update: { onHand: { increment: ri.qty } },
                create: {
                  merchantId,
                  storeId,
                  productId: ri.productId,
                  onHand: ri.qty,
                },
              });
            }

            // Ledger IN entries (audit trail)
            await tx.stockLedger.createMany({
              data: createdRefund.items.map((ri) => ({
                merchantId,
                storeId,
                productId: ri.productId,
                type: "IN",
                qtyChange: ri.qty,
                reference: `REFUND:${createdRefund.id}`,
                note: reason,
                createdBy: cashierId,
              })),
            });
          }

          return createdRefund;
        });

        // 📧 Send notification if refund pending approval
        if (refund.approvalStatus === "PENDING_APPROVAL") {
          const cashier = await prisma.user.findUnique({
            where: { id: cashierId! },
          });
          
          await emailService.notifyRefundPendingApproval(
            merchantId,
            refund,
            cashier?.fullName || "Cashier",
            refund.amount
          );
        }

        return reply.code(201).send({ refund });
      } catch (e: any) {
        if (e?.statusCode && e?.payload) return reply.code(e.statusCode).send(e.payload);
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    }
  );

  // =========================
  // LIST refunds for a sale
  // =========================
  app.get(
    "/sales/:id/refunds",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:read")] },
    async (req, reply) => {
      const { merchantId, storeId } = req.user as any;
      if (!storeId) return reply.code(400).send({ message: "User has no storeId" });

      const { id: saleId } = req.params as any;

      const refunds = await prisma.refund.findMany({
        where: { saleId, merchantId, storeId },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      });

      return reply.send({ refunds });
    }
  );

  // =========================
  // LIST PENDING REFUNDS (for approval)
  // =========================
  app.get(
    "/refunds/pending-approvals",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:write")] },
    async (req, reply) => {
      const { merchantId, storeId } = req.user as any;
      if (!storeId) return reply.code(400).send({ message: "User has no storeId" });

      const refunds = await prisma.refund.findMany({
        where: {
          merchantId,
          storeId,
          approvalStatus: "PENDING_APPROVAL",
        },
        include: {
          items: true,
          sale: {
            include: { items: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // ⏱️ Calculate pending duration for each refund
      const now = new Date();
      const refundsWithDuration = refunds.map((refund) => {
        const durationMs = now.getTime() - refund.createdAt.getTime();
        const durationMinutes = Math.floor(durationMs / (1000 * 60));
        const durationHours = Math.floor(durationMinutes / 60);

        return {
          ...refund,
          pendingDurationMinutes: durationMinutes,
          pendingDurationHours: durationHours,
          pendingDurationLabel: durationHours > 0 
            ? `${durationHours}h ${durationMinutes % 60}m`
            : `${durationMinutes}m`,
        };
      });

      return reply.send({ refunds: refundsWithDuration });
    }
  );

  // =========================
  // APPROVE REFUND
  // =========================
  app.patch(
    "/refunds/:id/approve",
    {
      preHandler: [authGuard, tenantGuard, requirePermission("sales:write")],
    },
    async (req, reply) => {
      const { merchantId, sub: approverId } = req.user as any;
      const { id: refundId } = req.params as any;

      try {
        const refund = await prisma.refund.findFirst({
          where: { id: refundId, merchantId },
          include: { items: true },
        });

        if (!refund) {
          return reply.code(404).send({ message: "Refund not found" });
        }

        if (refund.approvalStatus !== "PENDING_APPROVAL") {
          return reply.code(400).send({
            message: `Refund already ${refund.approvalStatus.toLowerCase()}`,
          });
        }

        // Check if approval is required based on amount
        const refundPolicy = await prisma.refundPolicySettings.findUnique({
          where: { merchantId },
        });

        const requiresApproval = refundPolicy &&
          refund.amount >= refundPolicy.requireApprovalAboveAmount;

        const updatedRefund = await prisma.refund.update({
          where: { id: refundId },
          data: {
            approvalStatus: "APPROVED",
            approvedBy: approverId,
            approvedAt: new Date(),
          },
          include: { items: true },
        });

        // 📧 Send notification to cashier
        if (updatedRefund.cashierId) {
          const approver = await prisma.user.findUnique({
            where: { id: approverId },
          });
          
          await emailService.notifyRefundApproved(
            updatedRefund.cashierId,
            updatedRefund,
            approver?.fullName || "Manager"
          );
        }

        return reply.code(200).send({
          message: "Refund approved successfully",
          refund: updatedRefund,
        });
      } catch (e: any) {
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    }
  );

  // =========================
  // REJECT REFUND
  // =========================
  app.patch(
    "/refunds/:id/reject",
    {
      preHandler: [authGuard, tenantGuard, requirePermission("sales:write")],
    },
    async (req, reply) => {
      const { merchantId, sub: approverId } = req.user as any;
      const { id: refundId } = req.params as any;
      const body = req.body as { reason?: string };

      try {
        const refund = await prisma.refund.findFirst({
          where: { id: refundId, merchantId },
        });

        if (!refund) {
          return reply.code(404).send({ message: "Refund not found" });
        }

        if (refund.approvalStatus !== "PENDING_APPROVAL") {
          return reply.code(400).send({
            message: `Cannot reject: refund is already ${refund.approvalStatus.toLowerCase()}`,
          });
        }

        const updatedRefund = await prisma.refund.update({
          where: { id: refundId },
          data: {
            approvalStatus: "REJECTED",
            approvedBy: approverId,
            approvedAt: new Date(),
            rejectionReason: body.reason?.trim() || null,
          },
          include: { items: true },
        });

        // 📧 Send notification to cashier
        if (updatedRefund.cashierId) {
          const approver = await prisma.user.findUnique({
            where: { id: approverId },
          });
          
          await emailService.notifyRefundRejected(
            updatedRefund.cashierId,
            updatedRefund,
            approver?.fullName || "Manager",
            updatedRefund.rejectionReason || ""
          );
        }

        return reply.code(200).send({
          message: "Refund rejected successfully",
          refund: updatedRefund,
        });
      } catch (e: any) {
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    }
  );

  // =========================
  // GET REFUND APPROVAL STATUS
  // =========================
  app.get(
    "/refunds/:id",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:read")] },
    async (req, reply) => {
      const { merchantId, storeId } = req.user as any;
      const { id: refundId } = req.params as any;

      try {
        const refund = await prisma.refund.findFirst({
          where: { id: refundId, merchantId, storeId },
          include: { 
            items: true,
            sale: true,
          },
        });

        if (!refund) {
          return reply.code(404).send({ message: "Refund not found" });
        }

        // ⏱️ Calculate pending duration
        const now = new Date();
        const durationMs = now.getTime() - refund.createdAt.getTime();
        const durationMinutes = Math.floor(durationMs / (1000 * 60));
        const durationHours = Math.floor(durationMinutes / 60);

        const response = {
          ...refund,
          pendingDurationMinutes: durationMinutes,
          pendingDurationHours: durationHours,
          pendingDurationLabel: durationHours > 0 
            ? `${durationHours}h ${durationMinutes % 60}m`
            : `${durationMinutes}m`,
        };

        return reply.send({ refund: response });
      } catch (e: any) {
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    }
  );

  // =========================
  // LIST ALL REFUNDS (with optional status filter)
  // =========================
  app.get(
    "/refunds",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:read")] },
    async (req, reply) => {
      const { merchantId, storeId } = req.user as any;
      const { status, limit, skip } = req.query as any;
      if (!storeId) return reply.code(400).send({ message: "User has no storeId" });

      const _limit = Math.min(Number(limit) || 50, 500);
      const _skip = Number(skip) || 0;

      const where: any = { merchantId, storeId };
      if (status && status !== "ALL") {
        where.approvalStatus = status;
      }

      try {
        const [refunds, total] = await Promise.all([
          prisma.refund.findMany({
            where,
            include: { items: true, sale: true },
            orderBy: { createdAt: "desc" },
            take: _limit,
            skip: _skip,
          }),
          prisma.refund.count({ where }),
        ]);

        // Add duration info for pending refunds
        const now = new Date();
        const refundsWithDuration = refunds.map((r) => {
          if (r.approvalStatus !== "PENDING_APPROVAL") {
            return r;
          }

          const durationMs = now.getTime() - r.createdAt.getTime();
          const durationMinutes = Math.floor(durationMs / (1000 * 60));

          return {
            ...r,
            pendingDurationMinutes: durationMinutes,
            pendingDurationLabel: durationMinutes > 0 ? `${durationMinutes}m` : "Just now",
          };
        });

        return reply.send({
          refunds: refundsWithDuration,
          total,
          limit: _limit,
          skip: _skip,
        });
      } catch (e: any) {
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    }
  );

  // =========================
  // CREATE QUICK REFUND (by amount)
  // =========================
  app.post(
    "/refunds",
    { preHandler: [authGuard, tenantGuard, requirePermission("sales:write")] },
    async (req, reply) => {
      const { merchantId, storeId, sub: cashierId } = req.user as any;
      if (!storeId) return reply.code(400).send({ message: "User has no storeId" });

      const body = req.body as {
        saleId: string;
        amount: number;
        reason?: string;
      };

      if (!body?.saleId || !Number.isFinite(body.amount) || body.amount <= 0) {
        return reply.code(400).send({
          message: "Request must have saleId and amount > 0",
        });
      }

      const reason = body.reason?.trim() || null;
      const requestedAmount = money(body.amount);

      try {
        const refund = await prisma.$transaction(async (tx) => {
          // Require OPEN shift
          const activeSession = await tx.shiftSession.findFirst({
            where: { merchantId, storeId, cashierId, status: "OPEN" },
            orderBy: { openedAt: "desc" },
          });

          if (!activeSession) {
            throw Object.assign(new Error("NO_OPEN_SHIFT"), {
              statusCode: 400,
              payload: {
                message: "No OPEN shift session. Open a shift before processing refunds.",
              },
            });
          }

          // Load sale
          const sale = await tx.sale.findFirst({
            where: { id: body.saleId, merchantId, storeId },
            include: { items: true },
          });

          if (!sale) {
            throw Object.assign(new Error("SALE_NOT_FOUND"), {
              statusCode: 404,
              payload: { message: "Sale not found" },
            });
          }

          if (sale.status !== "COMPLETED") {
            throw Object.assign(new Error("INVALID_SALE_STATUS"), {
              statusCode: 400,
              payload: { message: `Cannot refund sale with status ${sale.status}` },
            });
          }

          // Already refunded qty per saleItemId
          const refunded = await tx.refundItem.groupBy({
            by: ["saleItemId"],
            where: { refund: { saleId: sale.id, merchantId, storeId } },
            _sum: { amount: true },
          });

          const refundedMap = new Map(
            refunded.map((r) => [r.saleItemId, r._sum.amount ?? 0])
          );

          // Calculate which items to refund based on requested amount
          const refundItemsCreate: Array<{
            saleItemId: string;
            productId: string;
            qty: number;
            amount: number;
          }> = [];

          let accumulatedAmount = 0;

          for (const si of sale.items) {
            if (accumulatedAmount >= requestedAmount) break;

            const alreadyRefunded = refundedMap.get(si.id) ?? 0;
            const remainingAmount = si.lineTotal - alreadyRefunded;

            if (remainingAmount <= 0) continue; // Already fully refunded

            // Calculate how much of this item to refund
            const needAmount = requestedAmount - accumulatedAmount;
            const refundAmount = Math.min(needAmount, remainingAmount);
            const refundQty = Math.floor((refundAmount / si.priceSnap) * 100) / 100; // 2 decimals

            if (refundQty > 0) {
              refundItemsCreate.push({
                saleItemId: si.id,
                productId: si.productId,
                qty: Math.max(1, Math.round(refundQty)), // At least 1 item
                amount: money(refundAmount),
              });
              accumulatedAmount = money(accumulatedAmount + refundAmount);
            }
          }

          if (refundItemsCreate.length === 0) {
            throw Object.assign(new Error("NO_ITEMS_TO_REFUND"), {
              statusCode: 400,
              payload: { message: "No items available to refund for the requested amount" },
            });
          }

          // ✅ Determine approval status based on refund policy
          const refundPolicy = await tx.refundPolicySettings.findUnique({
            where: { merchantId },
          });

          // Quick refunds from terminal always require approval
          const requiresApproval = true;

          const createdRefund = await tx.refund.create({
            data: {
              merchantId,
              storeId,
              saleId: sale.id,
              cashierId,
              shiftSessionId: activeSession.id,
              reason,
              restock: true,
              amount: accumulatedAmount,
              approvalStatus: "PENDING_APPROVAL",
              approvedAt: null,
              items: { create: refundItemsCreate },
            },
            include: { items: true },
          });

          // ✅ Restock: update Inventory + ledger IN
          for (const ri of createdRefund.items) {
            await tx.inventory.upsert({
              where: {
                merchantId_storeId_productId: {
                  merchantId,
                  storeId,
                  productId: ri.productId,
                },
              },
              update: {
                onHand: {
                  increment: ri.qty,
                },
              },
              create: {
                merchantId,
                storeId,
                productId: ri.productId,
                onHand: ri.qty,
              },
            });

            await tx.stockLedger.create({
              data: {
                merchantId,
                storeId,
                productId: ri.productId,
                type: "IN",
                qtyChange: ri.qty,
                reference: `REFUND:${createdRefund.id}`,
                note: `Refund from sale ${sale.id}`,
              },
            });
          }

          return createdRefund;
        });

        return reply.code(201).send({
          message: "Refund created successfully",
          refund,
        });
      } catch (e: any) {
        const statusCode = e.statusCode || 500;
        const payload = e.payload || { message: e.message || "Server error" };
        return reply.code(statusCode).send(payload);
      }
    }
  );
}