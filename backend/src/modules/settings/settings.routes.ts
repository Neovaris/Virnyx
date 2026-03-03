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
function asBool(v: any) {
  return Boolean(v);
}

export async function settingsRoutes(app: FastifyInstance) {
  // =========================
  // MERCHANT SETTINGS
  // GET /settings/merchant
  // PATCH /settings/merchant
  // =========================
  app.get(
    "/settings/merchant",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:read")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;

      const m = await prisma.merchant.findFirst({
        where: { id: merchantId },
        select: {
          id: true,
          name: true,
          country: true,
          currency: true,
          timezone: true,
          receiptFooter: true,
          taxEnabled: true,
          taxRate: true,
          pricesIncludeTax: true,
          isActive: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return reply.send({ merchant: m });
    }
  );

  app.patch(
    "/settings/merchant",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const body = req.body as any;

      const data: any = {};

      if (body.name !== undefined) {
        const name = asString(body.name);
        if (!name) return reply.code(400).send({ message: "name cannot be empty" });
        data.name = name;
      }
      if (body.country !== undefined) data.country = asString(body.country) || null;
      if (body.currency !== undefined) data.currency = asString(body.currency) || null;
      if (body.timezone !== undefined) data.timezone = asString(body.timezone) || null;
      if (body.receiptFooter !== undefined) data.receiptFooter = asString(body.receiptFooter) || null;

      // tax fields allowed here too (but we also expose /settings/tax)
      if (body.taxEnabled !== undefined) data.taxEnabled = asBool(body.taxEnabled);
      if (body.taxRate !== undefined) {
        const n = asNumber(body.taxRate);
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          return reply.code(400).send({ message: "taxRate must be between 0 and 100" });
        }
        data.taxRate = n;
      }
      if (body.pricesIncludeTax !== undefined) data.pricesIncludeTax = asBool(body.pricesIncludeTax);

      if (!Object.keys(data).length) {
        return reply.code(400).send({ message: "No fields provided to update" });
      }

      await prisma.merchant.update({
        where: { id: merchantId },
        data,
      });

      const fresh = await prisma.merchant.findFirst({
        where: { id: merchantId },
        select: {
          id: true,
          name: true,
          country: true,
          currency: true,
          timezone: true,
          receiptFooter: true,
          taxEnabled: true,
          taxRate: true,
          pricesIncludeTax: true,
          updatedAt: true,
        },
      });

      return reply.send({ merchant: fresh });
    }
  );

  // =========================
  // STORE SETTINGS (current user's store)
  // GET /settings/store
  // PATCH /settings/store
  // =========================
  app.get(
    "/settings/store",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:read")] },
    async (req, reply) => {
      const { merchantId, storeId } = req.user as any;
      if (!storeId) return reply.code(400).send({ message: "User has no storeId" });

      const s = await prisma.store.findFirst({
        where: { id: storeId, merchantId },
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          phone: true,
          isActive: true,
          lowStockThreshold: true,
          receiptPrefix: true,
          openingCashDefault: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!s) return reply.code(404).send({ message: "Store not found" });
      return reply.send({ store: s });
    }
  );

  app.patch(
    "/settings/store",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:write")] },
    async (req, reply) => {
      const { merchantId, storeId } = req.user as any;
      if (!storeId) return reply.code(400).send({ message: "User has no storeId" });

      const body = req.body as any;
      const data: any = {};

      if (body.name !== undefined) {
        const name = asString(body.name);
        if (!name) return reply.code(400).send({ message: "name cannot be empty" });
        data.name = name;
      }
      if (body.code !== undefined) data.code = asString(body.code) || null;
      if (body.address !== undefined) data.address = asString(body.address) || null;
      if (body.phone !== undefined) data.phone = asString(body.phone) || null;

      if (body.lowStockThreshold !== undefined) {
        const n = asInt(body.lowStockThreshold);
        if (!Number.isFinite(n) || n < 0 || n > 999999) {
          return reply.code(400).send({ message: "lowStockThreshold must be an integer >= 0" });
        }
        data.lowStockThreshold = n;
      }

      if (body.receiptPrefix !== undefined) data.receiptPrefix = asString(body.receiptPrefix) || null;

      if (body.openingCashDefault !== undefined) {
        const n = asNumber(body.openingCashDefault);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "openingCashDefault must be >= 0" });
        }
        data.openingCashDefault = n;
      }

      if (!Object.keys(data).length) {
        return reply.code(400).send({ message: "No fields provided to update" });
      }

      const updated = await prisma.store.updateMany({
        where: { id: storeId, merchantId },
        data,
      });

      if (updated.count !== 1) return reply.code(404).send({ message: "Store not found" });

      const fresh = await prisma.store.findFirst({
        where: { id: storeId, merchantId },
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          phone: true,
          lowStockThreshold: true,
          receiptPrefix: true,
          openingCashDefault: true,
          updatedAt: true,
        },
      });

      return reply.send({ store: fresh });
    }
  );

  // =========================
  // TAX SETTINGS (merchant-level)
  // GET /settings/tax
  // PATCH /settings/tax
  // =========================
  app.get(
    "/settings/tax",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:read")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;

      const m = await prisma.merchant.findFirst({
        where: { id: merchantId },
        select: { taxEnabled: true, taxRate: true, pricesIncludeTax: true },
      });

      return reply.send({ tax: m });
    }
  );

  app.patch(
    "/settings/tax",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const body = req.body as any;

      const data: any = {};
      if (body.taxEnabled !== undefined) data.taxEnabled = asBool(body.taxEnabled);

      if (body.taxRate !== undefined) {
        const n = asNumber(body.taxRate);
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          return reply.code(400).send({ message: "taxRate must be between 0 and 100" });
        }
        data.taxRate = n;
      }

      if (body.pricesIncludeTax !== undefined) data.pricesIncludeTax = asBool(body.pricesIncludeTax);

      if (!Object.keys(data).length) {
        return reply.code(400).send({ message: "No fields provided to update" });
      }

      await prisma.merchant.update({ where: { id: merchantId }, data });

      const fresh = await prisma.merchant.findFirst({
        where: { id: merchantId },
        select: { taxEnabled: true, taxRate: true, pricesIncludeTax: true },
      });

      return reply.send({ tax: fresh });
    }
  );

  // =========================
  // PAYMENT METHOD SETTINGS
  // GET /settings/payment-methods
  // PATCH /settings/payment-methods
  // =========================
  app.get(
    "/settings/payment-methods",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:read")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;

      let settings = await prisma.paymentMethodSettings.findUnique({
        where: { merchantId },
      });

      // Create default if doesn't exist
      if (!settings) {
        settings = await prisma.paymentMethodSettings.create({
          data: { merchantId },
        });
      }

      return reply.send({ paymentMethods: settings });
    }
  );

  app.patch(
    "/settings/payment-methods",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const body = req.body as any;

      const data: any = {};

      if (body.enableCash !== undefined) data.enableCash = asBool(body.enableCash);
      if (body.enableCard !== undefined) data.enableCard = asBool(body.enableCard);
      if (body.enableMobileMoney !== undefined) data.enableMobileMoney = asBool(body.enableMobileMoney);
      if (body.enableCheck !== undefined) data.enableCheck = asBool(body.enableCheck);
      if (body.enableBankTransfer !== undefined) data.enableBankTransfer = asBool(body.enableBankTransfer);

      if (body.cardSurchargePercent !== undefined) {
        const n = asNumber(body.cardSurchargePercent);
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          return reply.code(400).send({ message: "cardSurchargePercent must be between 0 and 100" });
        }
        data.cardSurchargePercent = n;
      }
      if (body.mobileMoneysSurchargePercent !== undefined) {
        const n = asNumber(body.mobileMoneysSurchargePercent);
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          return reply.code(400).send({ message: "mobileMoneysSurchargePercent must be between 0 and 100" });
        }
        data.mobileMoneysSurchargePercent = n;
      }
      if (body.checkProcessingFee !== undefined) {
        const n = asNumber(body.checkProcessingFee);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "checkProcessingFee must be >= 0" });
        }
        data.checkProcessingFee = n;
      }
      if (body.bankTransferFee !== undefined) {
        const n = asNumber(body.bankTransferFee);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "bankTransferFee must be >= 0" });
        }
        data.bankTransferFee = n;
      }

      if (body.cardProcessorName !== undefined) data.cardProcessorName = asString(body.cardProcessorName) || null;
      if (body.cardProcessorKey !== undefined) data.cardProcessorKey = asString(body.cardProcessorKey) || null;
      if (body.cardProcessorSecret !== undefined) data.cardProcessorSecret = asString(body.cardProcessorSecret) || null;
      if (body.mobileMoneyProvider !== undefined) data.mobileMoneyProvider = asString(body.mobileMoneyProvider) || null;
      if (body.mobileMoneyApiKey !== undefined) data.mobileMoneyApiKey = asString(body.mobileMoneyApiKey) || null;
      if (body.bankName !== undefined) data.bankName = asString(body.bankName) || null;
      if (body.bankAccountNumber !== undefined) data.bankAccountNumber = asString(body.bankAccountNumber) || null;
      if (body.bankAccountName !== undefined) data.bankAccountName = asString(body.bankAccountName) || null;

      if (!Object.keys(data).length) {
        return reply.code(400).send({ message: "No fields provided to update" });
      }

      const settings = await prisma.paymentMethodSettings.upsert({
        where: { merchantId },
        update: data,
        create: { merchantId, ...data },
      });

      return reply.send({ paymentMethods: settings });
    }
  );

  // =========================
  // REFUND POLICY SETTINGS
  // GET /settings/refund-policy
  // PATCH /settings/refund-policy
  // =========================
  app.get(
    "/settings/refund-policy",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:read")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;

      let settings = await prisma.refundPolicySettings.findUnique({
        where: { merchantId },
      });

      if (!settings) {
        settings = await prisma.refundPolicySettings.create({
          data: { merchantId },
        });
      }

      return reply.send({ refundPolicy: settings });
    }
  );

  app.patch(
    "/settings/refund-policy",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const body = req.body as any;

      const data: any = {};

      if (body.refundWindowDays !== undefined) {
        const n = asInt(body.refundWindowDays);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "refundWindowDays must be >= 0" });
        }
        data.refundWindowDays = n;
      }
      if (body.maxRefundPercentage !== undefined) {
        const n = asNumber(body.maxRefundPercentage);
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          return reply.code(400).send({ message: "maxRefundPercentage must be between 0 and 100" });
        }
        data.maxRefundPercentage = n;
      }

      if (body.requireApprovalAboveAmount !== undefined) {
        const n = asNumber(body.requireApprovalAboveAmount);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "requireApprovalAboveAmount must be >= 0" });
        }
        data.requireApprovalAboveAmount = n;
      }
      if (body.requireManagerApproval !== undefined) data.requireManagerApproval = asBool(body.requireManagerApproval);
      if (body.requireAdminApproval !== undefined) data.requireAdminApproval = asBool(body.requireAdminApproval);
      if (body.autoRestockItems !== undefined) data.autoRestockItems = asBool(body.autoRestockItems);

      if (body.restockFeePercent !== undefined) {
        const n = asNumber(body.restockFeePercent);
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          return reply.code(400).send({ message: "restockFeePercent must be between 0 and 100" });
        }
        data.restockFeePercent = n;
      }
      if (body.minRefundAmount !== undefined) {
        const n = asNumber(body.minRefundAmount);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "minRefundAmount must be >= 0" });
        }
        data.minRefundAmount = n;
      }
      if (body.maxRefundsPerDay !== undefined) {
        const n = asInt(body.maxRefundsPerDay);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "maxRefundsPerDay must be >= 0" });
        }
        data.maxRefundsPerDay = n;
      }

      if (body.printRefundReceipt !== undefined) data.printRefundReceipt = asBool(body.printRefundReceipt);
      if (body.refundReceiptPrefix !== undefined) data.refundReceiptPrefix = asString(body.refundReceiptPrefix);

      if (!Object.keys(data).length) {
        return reply.code(400).send({ message: "No fields provided to update" });
      }

      const settings = await prisma.refundPolicySettings.upsert({
        where: { merchantId },
        update: data,
        create: { merchantId, ...data },
      });

      return reply.send({ refundPolicy: settings });
    }
  );

  // =========================
  // SHIFT MANAGEMENT SETTINGS
  // GET /settings/shift-management
  // PATCH /settings/shift-management
  // =========================
  app.get(
    "/settings/shift-management",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:read")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;

      let settings = await prisma.shiftManagementSettings.findUnique({
        where: { merchantId },
      });

      if (!settings) {
        settings = await prisma.shiftManagementSettings.create({
          data: { merchantId },
        });
      }

      return reply.send({ shiftManagement: settings });
    }
  );

  app.patch(
    "/settings/shift-management",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const body = req.body as any;

      const data: any = {};

      if (body.autoCloseTime !== undefined) data.autoCloseTime = asString(body.autoCloseTime) || null;
      if (body.allowLateCloseMinutes !== undefined) {
        const n = asInt(body.allowLateCloseMinutes);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "allowLateCloseMinutes must be >= 0" });
        }
        data.allowLateCloseMinutes = n;
      }
      if (body.requireOpeningCash !== undefined) data.requireOpeningCash = asBool(body.requireOpeningCash);
      if (body.requireClosingBalance !== undefined) data.requireClosingBalance = asBool(body.requireClosingBalance);

      if (body.varianceTolerancePercent !== undefined) {
        const n = asNumber(body.varianceTolerancePercent);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "varianceTolerancePercent must be >= 0" });
        }
        data.varianceTolerancePercent = n;
      }
      if (body.toleranceAmount !== undefined) {
        const n = asNumber(body.toleranceAmount);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "toleranceAmount must be >= 0" });
        }
        data.toleranceAmount = n;
      }

      if (body.requireApprovalForVariance !== undefined) data.requireApprovalForVariance = asBool(body.requireApprovalForVariance);
      if (body.varianceApprovalThreshold !== undefined) {
        const n = asNumber(body.varianceApprovalThreshold);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "varianceApprovalThreshold must be >= 0" });
        }
        data.varianceApprovalThreshold = n;
      }
      if (body.requireApprovalForOvertime !== undefined) data.requireApprovalForOvertime = asBool(body.requireApprovalForOvertime);
      if (body.overtimeThresholdMinutes !== undefined) {
        const n = asInt(body.overtimeThresholdMinutes);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "overtimeThresholdMinutes must be >= 0" });
        }
        data.overtimeThresholdMinutes = n;
      }

      if (body.maxShiftDurationMinutes !== undefined) {
        const n = asInt(body.maxShiftDurationMinutes);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "maxShiftDurationMinutes must be >= 0" });
        }
        data.maxShiftDurationMinutes = n;
      }
      if (body.minBreakTimeMinutes !== undefined) {
        const n = asInt(body.minBreakTimeMinutes);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "minBreakTimeMinutes must be >= 0" });
        }
        data.minBreakTimeMinutes = n;
      }

      if (!Object.keys(data).length) {
        return reply.code(400).send({ message: "No fields provided to update" });
      }

      const settings = await prisma.shiftManagementSettings.upsert({
        where: { merchantId },
        update: data,
        create: { merchantId, ...data },
      });

      return reply.send({ shiftManagement: settings });
    }
  );

  // =========================
  // NOTIFICATION SETTINGS
  // GET /settings/notifications
  // PATCH /settings/notifications
  // =========================
  app.get(
    "/settings/notifications",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:read")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;

      let settings = await prisma.notificationSettings.findUnique({
        where: { merchantId },
      });

      if (!settings) {
        settings = await prisma.notificationSettings.create({
          data: { merchantId },
        });
      }

      return reply.send({ notifications: settings });
    }
  );

  app.patch(
    "/settings/notifications",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const body = req.body as any;

      const data: any = {};

      if (body.sendLowStockAlerts !== undefined) data.sendLowStockAlerts = asBool(body.sendLowStockAlerts);
      if (body.lowStockThreshold !== undefined) {
        const n = asInt(body.lowStockThreshold);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "lowStockThreshold must be >= 0" });
        }
        data.lowStockThreshold = n;
      }
      if (body.sendOutOfStockAlerts !== undefined) data.sendOutOfStockAlerts = asBool(body.sendOutOfStockAlerts);

      if (body.enableEndOfDayReport !== undefined) data.enableEndOfDayReport = asBool(body.enableEndOfDayReport);
      if (body.endOfDayReportTime !== undefined) data.endOfDayReportTime = asString(body.endOfDayReportTime);
      if (body.enableHighValueSaleAlert !== undefined) data.enableHighValueSaleAlert = asBool(body.enableHighValueSaleAlert);
      if (body.highValueThreshold !== undefined) {
        const n = asNumber(body.highValueThreshold);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "highValueThreshold must be >= 0" });
        }
        data.highValueThreshold = n;
      }

      if (body.enableUnusualTransactionAlert !== undefined) data.enableUnusualTransactionAlert = asBool(body.enableUnusualTransactionAlert);
      if (body.enableErrorNotifications !== undefined) data.enableErrorNotifications = asBool(body.enableErrorNotifications);
      if (body.enableRefundAlerts !== undefined) data.enableRefundAlerts = asBool(body.enableRefundAlerts);

      if (body.notifyViaEmail !== undefined) data.notifyViaEmail = asBool(body.notifyViaEmail);
      if (body.notifyViaSMS !== undefined) data.notifyViaSMS = asBool(body.notifyViaSMS);
      if (body.notifyViaInApp !== undefined) data.notifyViaInApp = asBool(body.notifyViaInApp);

      if (body.alertEmails !== undefined) data.alertEmails = asString(body.alertEmails);
      if (body.alertPhoneNumbers !== undefined) data.alertPhoneNumbers = asString(body.alertPhoneNumbers);

      if (!Object.keys(data).length) {
        return reply.code(400).send({ message: "No fields provided to update" });
      }

      const settings = await prisma.notificationSettings.upsert({
        where: { merchantId },
        update: data,
        create: { merchantId, ...data },
      });

      return reply.send({ notifications: settings });
    }
  );

  // =========================
  // SECURITY SETTINGS
  // GET /settings/security
  // PATCH /settings/security
  // =========================
  app.get(
    "/settings/security",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:read")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;

      let settings = await prisma.securitySettings.findUnique({
        where: { merchantId },
      });

      if (!settings) {
        settings = await prisma.securitySettings.create({
          data: { merchantId },
        });
      }

      return reply.send({ security: settings });
    }
  );

  app.patch(
    "/settings/security",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const body = req.body as any;

      const data: any = {};

      if (body.sessionTimeoutMinutes !== undefined) {
        const n = asInt(body.sessionTimeoutMinutes);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "sessionTimeoutMinutes must be >= 0" });
        }
        data.sessionTimeoutMinutes = n;
      }
      if (body.allowConcurrentSessions !== undefined) data.allowConcurrentSessions = asBool(body.allowConcurrentSessions);
      if (body.maxSessionsPerUser !== undefined) {
        const n = asInt(body.maxSessionsPerUser);
        if (!Number.isFinite(n) || n < 1) {
          return reply.code(400).send({ message: "maxSessionsPerUser must be >= 1" });
        }
        data.maxSessionsPerUser = n;
      }

      if (body.minPasswordLength !== undefined) {
        const n = asInt(body.minPasswordLength);
        if (!Number.isFinite(n) || n < 1) {
          return reply.code(400).send({ message: "minPasswordLength must be >= 1" });
        }
        data.minPasswordLength = n;
      }
      if (body.requireUppercase !== undefined) data.requireUppercase = asBool(body.requireUppercase);
      if (body.requireNumbers !== undefined) data.requireNumbers = asBool(body.requireNumbers);
      if (body.requireSpecialCharacters !== undefined) data.requireSpecialCharacters = asBool(body.requireSpecialCharacters);
      if (body.passwordExpiryDays !== undefined) {
        const n = asInt(body.passwordExpiryDays);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "passwordExpiryDays must be >= 0" });
        }
        data.passwordExpiryDays = n;
      }
      if (body.preventPasswordReuse !== undefined) data.preventPasswordReuse = asBool(body.preventPasswordReuse);
      if (body.previousPasswordsToCheck !== undefined) {
        const n = asInt(body.previousPasswordsToCheck);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "previousPasswordsToCheck must be >= 0" });
        }
        data.previousPasswordsToCheck = n;
      }

      if (body.enableTwoFactor !== undefined) data.enableTwoFactor = asBool(body.enableTwoFactor);
      if (body.twoFactorMethod !== undefined) data.twoFactorMethod = asString(body.twoFactorMethod);

      if (body.maxFailedLoginAttempts !== undefined) {
        const n = asInt(body.maxFailedLoginAttempts);
        if (!Number.isFinite(n) || n < 1) {
          return reply.code(400).send({ message: "maxFailedLoginAttempts must be >= 1" });
        }
        data.maxFailedLoginAttempts = n;
      }
      if (body.lockoutDurationMinutes !== undefined) {
        const n = asInt(body.lockoutDurationMinutes);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "lockoutDurationMinutes must be >= 0" });
        }
        data.lockoutDurationMinutes = n;
      }
      if (body.requireIPWhitelist !== undefined) data.requireIPWhitelist = asBool(body.requireIPWhitelist);
      if (body.allowedIPs !== undefined) data.allowedIPs = asString(body.allowedIPs);

      if (body.logAllActions !== undefined) data.logAllActions = asBool(body.logAllActions);
      if (body.retentionDays !== undefined) {
        const n = asInt(body.retentionDays);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "retentionDays must be >= 0" });
        }
        data.retentionDays = n;
      }

      if (!Object.keys(data).length) {
        return reply.code(400).send({ message: "No fields provided to update" });
      }

      const settings = await prisma.securitySettings.upsert({
        where: { merchantId },
        update: data,
        create: { merchantId, ...data },
      });

      return reply.send({ security: settings });
    }
  );

  // =========================
  // BACKUP SETTINGS
  // GET /settings/backup
  // PATCH /settings/backup
  // =========================
  app.get(
    "/settings/backup",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:read")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;

      let settings = await prisma.backupSettings.findUnique({
        where: { merchantId },
      });

      if (!settings) {
        settings = await prisma.backupSettings.create({
          data: { merchantId },
        });
      }

      return reply.send({ backup: settings });
    }
  );

  app.patch(
    "/settings/backup",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const body = req.body as any;

      const data: any = {};

      if (body.enableAutoBackup !== undefined) data.enableAutoBackup = asBool(body.enableAutoBackup);
      if (body.backupFrequency !== undefined) data.backupFrequency = asString(body.backupFrequency);
      if (body.backupTime !== undefined) data.backupTime = asString(body.backupTime);
      if (body.backupDayOfWeek !== undefined) {
        const n = asInt(body.backupDayOfWeek);
        if (!Number.isFinite(n) || n < 1 || n > 7) {
          return reply.code(400).send({ message: "backupDayOfWeek must be between 1 and 7" });
        }
        data.backupDayOfWeek = n;
      }
      if (body.backupDayOfMonth !== undefined) {
        const n = asInt(body.backupDayOfMonth);
        if (!Number.isFinite(n) || n < 1 || n > 31) {
          return reply.code(400).send({ message: "backupDayOfMonth must be between 1 and 31" });
        }
        data.backupDayOfMonth = n;
      }

      if (body.retentionDays !== undefined) {
        const n = asInt(body.retentionDays);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "retentionDays must be >= 0" });
        }
        data.retentionDays = n;
      }
      if (body.maxBackupCount !== undefined) {
        const n = asInt(body.maxBackupCount);
        if (!Number.isFinite(n) || n < 1) {
          return reply.code(400).send({ message: "maxBackupCount must be >= 1" });
        }
        data.maxBackupCount = n;
      }

      if (body.backupDestination !== undefined) data.backupDestination = asString(body.backupDestination);
      if (body.cloudProvider !== undefined) data.cloudProvider = asString(body.cloudProvider) || null;
      if (body.cloudBucketName !== undefined) data.cloudBucketName = asString(body.cloudBucketName) || null;
      if (body.cloudAccessKey !== undefined) data.cloudAccessKey = asString(body.cloudAccessKey) || null;
      if (body.cloudSecretKey !== undefined) data.cloudSecretKey = asString(body.cloudSecretKey) || null;

      if (body.enableDatabaseExport !== undefined) data.enableDatabaseExport = asBool(body.enableDatabaseExport);
      if (body.enableInvoiceExport !== undefined) data.enableInvoiceExport = asBool(body.enableInvoiceExport);
      if (body.enableInventoryExport !== undefined) data.enableInventoryExport = asBool(body.enableInventoryExport);
      if (body.enableFinancialExport !== undefined) data.enableFinancialExport = asBool(body.enableFinancialExport);

      if (!Object.keys(data).length) {
        return reply.code(400).send({ message: "No fields provided to update" });
      }

      const settings = await prisma.backupSettings.upsert({
        where: { merchantId },
        update: data,
        create: { merchantId, ...data },
      });

      return reply.send({ backup: settings });
    }
  );

  // =========================
  // RECEIPT SETTINGS
  // GET /settings/receipt
  // PATCH /settings/receipt
  // =========================
  app.get(
    "/settings/receipt",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:read")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;

      let settings = await prisma.receiptSettings.findUnique({
        where: { merchantId },
      });

      if (!settings) {
        settings = await prisma.receiptSettings.create({
          data: { merchantId },
        });
      }

      return reply.send({ receipt: settings });
    }
  );

  app.patch(
    "/settings/receipt",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const body = req.body as any;

      const data: any = {};

      if (body.receiptWidth !== undefined) data.receiptWidth = asString(body.receiptWidth);
      if (body.useLogoOnReceipt !== undefined) data.useLogoOnReceipt = asBool(body.useLogoOnReceipt);
      if (body.logoUrl !== undefined) data.logoUrl = asString(body.logoUrl) || null;

      if (body.customHeader !== undefined) data.customHeader = asString(body.customHeader) || null;
      if (body.customFooter !== undefined) data.customFooter = asString(body.customFooter) || null;
      if (body.displayLogo !== undefined) data.displayLogo = asBool(body.displayLogo);
      if (body.displayMerchantName !== undefined) data.displayMerchantName = asBool(body.displayMerchantName);
      if (body.displayStoreName !== undefined) data.displayStoreName = asBool(body.displayStoreName);
      if (body.displayTaxId !== undefined) data.displayTaxId = asBool(body.displayTaxId);
      if (body.displayCashierName !== undefined) data.displayCashierName = asBool(body.displayCashierName);
      if (body.displayReceiptNumber !== undefined) data.displayReceiptNumber = asBool(body.displayReceiptNumber);
      if (body.displayTimestamp !== undefined) data.displayTimestamp = asBool(body.displayTimestamp);

      if (body.showProductSKU !== undefined) data.showProductSKU = asBool(body.showProductSKU);
      if (body.showProductDescription !== undefined) data.showProductDescription = asBool(body.showProductDescription);
      if (body.showUnitPrice !== undefined) data.showUnitPrice = asBool(body.showUnitPrice);
      if (body.showQuantity !== undefined) data.showQuantity = asBool(body.showQuantity);
      if (body.showLineTotal !== undefined) data.showLineTotal = asBool(body.showLineTotal);

      if (body.displaySubtotal !== undefined) data.displaySubtotal = asBool(body.displaySubtotal);
      if (body.displayTaxBreakdown !== undefined) data.displayTaxBreakdown = asBool(body.displayTaxBreakdown);
      if (body.displayTotal !== undefined) data.displayTotal = asBool(body.displayTotal);
      if (body.displayChangeDue !== undefined) data.displayChangeDue = asBool(body.displayChangeDue);

      if (body.showPaymentMethod !== undefined) data.showPaymentMethod = asBool(body.showPaymentMethod);
      if (body.showPaymentReference !== undefined) data.showPaymentReference = asBool(body.showPaymentReference);

      if (body.thankYouMessage !== undefined) data.thankYouMessage = asString(body.thankYouMessage) || null;
      if (body.returnsExchangeMessage !== undefined) data.returnsExchangeMessage = asString(body.returnsExchangeMessage) || null;
      if (body.discountMessage !== undefined) data.discountMessage = asString(body.discountMessage) || null;

      if (body.printerType !== undefined) data.printerType = asString(body.printerType);
      if (body.printBarcode !== undefined) data.printBarcode = asBool(body.printBarcode);
      if (body.printQRCode !== undefined) data.printQRCode = asBool(body.printQRCode);

      if (body.enableEmailReceipt !== undefined) data.enableEmailReceipt = asBool(body.enableEmailReceipt);
      if (body.enableSMSReceipt !== undefined) data.enableSMSReceipt = asBool(body.enableSMSReceipt);

      if (!Object.keys(data).length) {
        return reply.code(400).send({ message: "No fields provided to update" });
      }

      const settings = await prisma.receiptSettings.upsert({
        where: { merchantId },
        update: data,
        create: { merchantId, ...data },
      });

      return reply.send({ receipt: settings });
    }
  );

  // =========================
  // SALES SETTINGS
  // GET /settings/sales
  // PATCH /settings/sales
  // =========================
  app.get(
    "/settings/sales",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:read")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;

      let settings = await prisma.salesSettings.findUnique({
        where: { merchantId },
      });

      if (!settings) {
        settings = await prisma.salesSettings.create({
          data: { merchantId },
        });
      }

      return reply.send({ sales: settings });
    }
  );

  app.patch(
    "/settings/sales",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const body = req.body as any;

      const data: any = {};

      if (body.allowNegativeStock !== undefined) data.allowNegativeStock = asBool(body.allowNegativeStock);
      if (body.warnLowStock !== undefined) data.warnLowStock = asBool(body.warnLowStock);
      if (body.lowStockThreshold !== undefined) {
        const n = asInt(body.lowStockThreshold);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "lowStockThreshold must be >= 0" });
        }
        data.lowStockThreshold = n;
      }
      if (body.autoReorderPoint !== undefined) {
        const n = asInt(body.autoReorderPoint);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "autoReorderPoint must be >= 0" });
        }
        data.autoReorderPoint = n;
      }

      if (body.priceRoundingMethod !== undefined) data.priceRoundingMethod = asString(body.priceRoundingMethod);
      if (body.enableDiscountApproval !== undefined) data.enableDiscountApproval = asBool(body.enableDiscountApproval);
      if (body.discountApprovalThreshold !== undefined) {
        const n = asNumber(body.discountApprovalThreshold);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "discountApprovalThreshold must be >= 0" });
        }
        data.discountApprovalThreshold = n;
      }
      if (body.maxDiscountPercent !== undefined) {
        const n = asNumber(body.maxDiscountPercent);
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          return reply.code(400).send({ message: "maxDiscountPercent must be between 0 and 100" });
        }
        data.maxDiscountPercent = n;
      }

      if (body.receiptNumberingMethod !== undefined) data.receiptNumberingMethod = asString(body.receiptNumberingMethod);
      if (body.nextReceiptNumber !== undefined) {
        const n = asInt(body.nextReceiptNumber);
        if (!Number.isFinite(n) || n < 1) {
          return reply.code(400).send({ message: "nextReceiptNumber must be >= 1" });
        }
        data.nextReceiptNumber = n;
      }
      if (body.receiptNumberPrefix !== undefined) data.receiptNumberPrefix = asString(body.receiptNumberPrefix) || null;

      if (body.requireApprovalForVoid !== undefined) data.requireApprovalForVoid = asBool(body.requireApprovalForVoid);
      if (body.voidApprovalThreshold !== undefined) {
        const n = asNumber(body.voidApprovalThreshold);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "voidApprovalThreshold must be >= 0" });
        }
        data.voidApprovalThreshold = n;
      }
      if (body.allowOfflineVoid !== undefined) data.allowOfflineVoid = asBool(body.allowOfflineVoid);

      if (body.enableManualDiscount !== undefined) data.enableManualDiscount = asBool(body.enableManualDiscount);
      if (body.enableVolumeDiscount !== undefined) data.enableVolumeDiscount = asBool(body.enableVolumeDiscount);
      if (body.enableLoyaltyDiscount !== undefined) data.enableLoyaltyDiscount = asBool(body.enableLoyaltyDiscount);

      if (body.displayItemTotalOnScreen !== undefined) data.displayItemTotalOnScreen = asBool(body.displayItemTotalOnScreen);
      if (body.displayRunningTotal !== undefined) data.displayRunningTotal = asBool(body.displayRunningTotal);
      if (body.requireCustomerName !== undefined) data.requireCustomerName = asBool(body.requireCustomerName);
      if (body.requireCustomerPhone !== undefined) data.requireCustomerPhone = asBool(body.requireCustomerPhone);

      if (body.maxTransactionAmount !== undefined) {
        const n = asNumber(body.maxTransactionAmount);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "maxTransactionAmount must be >= 0" });
        }
        data.maxTransactionAmount = n;
      }
      if (body.minTransactionAmount !== undefined) {
        const n = asNumber(body.minTransactionAmount);
        if (!Number.isFinite(n) || n < 0) {
          return reply.code(400).send({ message: "minTransactionAmount must be >= 0" });
        }
        data.minTransactionAmount = n;
      }

      if (!Object.keys(data).length) {
        return reply.code(400).send({ message: "No fields provided to update" });
      }

      const settings = await prisma.salesSettings.upsert({
        where: { merchantId },
        update: data,
        create: { merchantId, ...data },
      });

      return reply.send({ sales: settings });
    }
  );

  // =========================
  // INTEGRATION SETTINGS
  // GET /settings/integration
  // PATCH /settings/integration
  // =========================
  app.get(
    "/settings/integration",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:read")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;

      let settings = await prisma.integrationSettings.findUnique({
        where: { merchantId },
      });

      if (!settings) {
        settings = await prisma.integrationSettings.create({
          data: { merchantId },
        });
      }

      return reply.send({ integration: settings });
    }
  );

  app.patch(
    "/settings/integration",
    { preHandler: [authGuard, tenantGuard, requirePermission("settings:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const body = req.body as any;

      const data: any = {};

      if (body.enableAPI !== undefined) data.enableAPI = asBool(body.enableAPI);
      if (body.apiKey !== undefined) data.apiKey = asString(body.apiKey) || null;
      if (body.apiSecret !== undefined) data.apiSecret = asString(body.apiSecret) || null;
      if (body.apiWebhookUrl !== undefined) data.apiWebhookUrl = asString(body.apiWebhookUrl) || null;
      if (body.apiWebhookSecret !== undefined) data.apiWebhookSecret = asString(body.apiWebhookSecret) || null;

      if (body.enableWebhookOnSale !== undefined) data.enableWebhookOnSale = asBool(body.enableWebhookOnSale);
      if (body.enableWebhookOnRefund !== undefined) data.enableWebhookOnRefund = asBool(body.enableWebhookOnRefund);
      if (body.enableWebhookOnPayment !== undefined) data.enableWebhookOnPayment = asBool(body.enableWebhookOnPayment);
      if (body.enableWebhookOnInventory !== undefined) data.enableWebhookOnInventory = asBool(body.enableWebhookOnInventory);

      if (body.enableSMS !== undefined) data.enableSMS = asBool(body.enableSMS);
      if (body.smsProvider !== undefined) data.smsProvider = asString(body.smsProvider) || null;
      if (body.smsApiKey !== undefined) data.smsApiKey = asString(body.smsApiKey) || null;
      if (body.smsApiSecret !== undefined) data.smsApiSecret = asString(body.smsApiSecret) || null;
      if (body.smsSenderName !== undefined) data.smsSenderName = asString(body.smsSenderName) || null;

      if (body.enableEmail !== undefined) data.enableEmail = asBool(body.enableEmail);
      if (body.emailProvider !== undefined) data.emailProvider = asString(body.emailProvider);
      if (body.emailSmtpHost !== undefined) data.emailSmtpHost = asString(body.emailSmtpHost) || null;
      if (body.emailSmtpPort !== undefined) {
        const n = asInt(body.emailSmtpPort);
        if (!Number.isFinite(n) || n < 1 || n > 65535) {
          return reply.code(400).send({ message: "emailSmtpPort must be between 1 and 65535" });
        }
        data.emailSmtpPort = n;
      }
      if (body.emailSmtpUser !== undefined) data.emailSmtpUser = asString(body.emailSmtpUser) || null;
      if (body.emailSmtpPassword !== undefined) data.emailSmtpPassword = asString(body.emailSmtpPassword) || null;
      if (body.emailFromAddress !== undefined) data.emailFromAddress = asString(body.emailFromAddress) || null;
      if (body.emailFromName !== undefined) data.emailFromName = asString(body.emailFromName) || null;

      if (body.enableInventorySync !== undefined) data.enableInventorySync = asBool(body.enableInventorySync);
      if (body.inventorySyncFrequency !== undefined) data.inventorySyncFrequency = asString(body.inventorySyncFrequency);
      if (body.externalInventorySystem !== undefined) data.externalInventorySystem = asString(body.externalInventorySystem) || null;
      if (body.inventorySyncUrl !== undefined) data.inventorySyncUrl = asString(body.inventorySyncUrl) || null;
      if (body.inventorySyncApiKey !== undefined) data.inventorySyncApiKey = asString(body.inventorySyncApiKey) || null;

      if (body.enableAccountingSync !== undefined) data.enableAccountingSync = asBool(body.enableAccountingSync);
      if (body.accountingSystem !== undefined) data.accountingSystem = asString(body.accountingSystem) || null;
      if (body.accountingSyncApiKey !== undefined) data.accountingSyncApiKey = asString(body.accountingSyncApiKey) || null;
      if (body.accountingSyncFrequency !== undefined) data.accountingSyncFrequency = asString(body.accountingSyncFrequency);

      if (body.integratedServices !== undefined) data.integratedServices = asString(body.integratedServices);

      if (!Object.keys(data).length) {
        return reply.code(400).send({ message: "No fields provided to update" });
      }

      const settings = await prisma.integrationSettings.upsert({
        where: { merchantId },
        update: data,
        create: { merchantId, ...data },
      });

      return reply.send({ integration: settings });
    }
  );
}