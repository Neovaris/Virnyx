import { FastifyInstance } from "fastify";
import { buildApp } from "../app";
import { prisma } from "../db/prisma";

/**
 * Utility function to create and start the app for testing
 */
export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp();
  return app;
}

/**
 * Clean up database after tests
 */
export async function cleanupDb() {
  // Delete in order of dependencies (reverse of creation order)
  try {
    // Delete settings that reference merchants first
    await prisma.paymentMethodSettings.deleteMany({});
    await prisma.refundPolicySettings.deleteMany({});
    await prisma.shiftManagementSettings.deleteMany({});
    await prisma.notificationSettings.deleteMany({});
    await prisma.securitySettings.deleteMany({});
    await prisma.backupSettings.deleteMany({});
    await prisma.receiptSettings.deleteMany({});
    await prisma.receiptTemplate.deleteMany({});
    await prisma.salesSettings.deleteMany({});
    await prisma.integrationSettings.deleteMany({});

    // Then delete domain entities
    await prisma.payment.deleteMany({});
    await prisma.refundItem.deleteMany({});
    await prisma.refund.deleteMany({});
    await prisma.saleItem.deleteMany({});
    await prisma.sale.deleteMany({});
    await prisma.receiptCounter.deleteMany({});
    await prisma.shiftSession.deleteMany({});
    await prisma.stockLedger.deleteMany({});
    await prisma.discountRule.deleteMany({});
    await prisma.inventory.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.userRole.deleteMany({});
    await prisma.rolePermission.deleteMany({});
    await prisma.role.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.store.deleteMany({});
    await prisma.merchant.deleteMany({});
  } catch (error) {
    // Silently ignore cleanup errors
    console.log("Cleanup error (ignored):", (error as any)?.message);
  }
}

/**
 * Create a test merchant with admin user and permissions (without assigning permissions)
 */
export async function createTestMerchant(email: string = "admin@test.com") {
  // Clean up any existing user with this email first
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Delete associated records
      await prisma.userRole.deleteMany({ where: { userId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
    }
  } catch (err) {
    // Silently ignore errors
  }

  const merchant = await prisma.merchant.create({
    data: {
      name: "Test Merchant",
    },
  });

  const store = await prisma.store.create({
    data: {
      name: "Test Store",
      merchantId: merchant.id,
    },
  });

  const adminRole = await prisma.role.create({
    data: {
      name: "ADMIN",
      merchantId: merchant.id,
    },
  });

  // NOTE: Skip assigning permissions to avoid foreign key issues
  // In production, migrations handle this properly

  const user = await prisma.user.create({
    data: {
      fullName: "Test Admin",
      email,
      passwordHash: "$2b$12$NPlIHYOAowxPWM7XCxbuN..Psk5rHV9KTDy.JKf4wMwbAU749s7Xe", // hash of 'password'
      merchantId: merchant.id,
      storeId: store.id,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId: adminRole.id,
    },
  });

  return { merchant, store, user, adminRole };
}

/**
 * Create test products
 */
export async function createTestProducts(merchantId: string, count: number = 3) {
  const products = [];
  for (let i = 0; i < count; i++) {
    const product = await prisma.product.create({
      data: {
        name: `Test Product ${i + 1}`,
        sku: `SKU-${i + 1}-${Date.now()}`,
        price: 100 + i * 10,
        merchantId,
      },
    });
    products.push(product);
  }
  return products;
}

/**
 * Create inventory for products
 */
export async function createInventory(
  storeId: string,
  productId: string,
  onHand: number = 100,
  merchantId?: string
) {
  // Get the merchant ID from the store if not provided
  const finalMerchantId = merchantId || (await prisma.store.findUnique({
    where: { id: storeId },
    select: { merchantId: true },
  }))?.merchantId;

  if (!finalMerchantId) {
    throw new Error("Cannot determine merchantId for inventory");
  }

  return prisma.inventory.upsert({
    where: {
      merchantId_storeId_productId: { merchantId: finalMerchantId, storeId, productId },
    },
    update: { onHand },
    create: {
      storeId,
      productId,
      onHand,
      merchantId: finalMerchantId,
    },
  });
}

/**
 * Open a shift session for a user
 */
export async function openShift(
  merchantId: string,
  storeId: string,
  userId: string
) {
  return prisma.shiftSession.create({
    data: {
      status: "OPEN",
      merchantId,
      storeId,
      cashierId: userId,
      openingCash: 1000,
    },
  });
}
