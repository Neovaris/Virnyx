import { FastifyInstance } from "fastify";
import {
  createTestApp,
  cleanupDb,
  createTestMerchant,
  createTestProducts,
  createInventory,
  openShift,
} from "./testUtils";
import { prisma } from "../db/prisma";

describe("Refunds Routes - Critical Path Tests", () => {
  let app: FastifyInstance;
  let authToken: string;
  let merchantId: string;
  let storeId: string;
  let userId: string;
  let productIds: string[];
  let saleId: string;
  let saleItemIds: string[];

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Setup test data
    const { merchant, store, user } = await createTestMerchant(
      "refunds@test.com"
    );
    merchantId = merchant.id;
    storeId = store.id;
    userId = user.id;

    // Create test products
    const products = await createTestProducts(merchantId, 3);
    productIds = products.map((p) => p.id);

    // Create inventory for products
    for (const productId of productIds) {
      await createInventory(storeId, productId, 100);
    }

    // Open a shift
    await openShift(merchantId, storeId, userId);

    // Login and get token
    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "refunds@test.com",
        password: "password",
      },
    });

    authToken = JSON.parse(loginResponse.body).token;

    // Create a sale to refund
    const saleResponse = await app.inject({
      method: "POST",
      url: "/sales",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        items: [
          {
            productId: productIds[0],
            qty: 10,
            price: 100,
          },
          {
            productId: productIds[1],
            qty: 5,
            price: 150,
          },
        ],
        payments: [
          {
            method: "CASH",
            amount: 1750,
          },
        ],
      },
    });

    const saleBody = JSON.parse(saleResponse.body);
    saleId = saleBody.sale.id;

    // Get sale item IDs from the created sale
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: true },
    });

    saleItemIds = sale?.items.map((item) => item.id) || [];
  });

  afterEach(async () => {
    await cleanupDb();
  });

  describe("GET /sales/:id/refundable-items", () => {
    it("should return refundable items for a sale", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/sales/${saleId}/refundable-items`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.saleId).toBe(saleId);
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items.length).toBe(2); // We created 2 items
      expect(body.items[0].remainingQty).toBeGreaterThan(0);
    });

    it("should return 404 for non-existent sale", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/sales/non-existent-id/refundable-items`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /sales/:id/refunds", () => {
    it("should create a refund successfully", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/sales/${saleId}/refunds`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          items: [
            {
              saleItemId: saleItemIds[0],
              qty: 2,
            },
          ],
          reason: "Customer requested",
          restock: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.refund).toBeDefined();
      expect(body.refund.items).toHaveLength(1);
      expect(body.refund.totalAmount).toBe(200); // 2 items * 100
    });

    it("should handle multiple items in a refund", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/sales/${saleId}/refunds`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          items: [
            {
              saleItemId: saleItemIds[0],
              qty: 3,
            },
            {
              saleItemId: saleItemIds[1],
              qty: 2,
            },
          ],
          reason: "Bulk return",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.refund.items).toHaveLength(2);
      expect(body.refund.totalAmount).toBe(600); // (3 * 100) + (2 * 150)
    });

    it("should update inventory when restock is true", async () => {
      const inventoryBefore = await prisma.inventory.findFirst({
        where: { storeId, productId: productIds[0] },
      });

      const beforeQty = inventoryBefore?.onHand || 0;

      await app.inject({
        method: "POST",
        url: `/sales/${saleId}/refunds`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          items: [
            {
              saleItemId: saleItemIds[0],
              qty: 5,
            },
          ],
          restock: true,
        },
      });

      const inventoryAfter = await prisma.inventory.findFirst({
        where: { storeId, productId: productIds[0] },
      });

      const afterQty = inventoryAfter?.onHand || 0;
      expect(afterQty).toBe(beforeQty + 5);
    });

    it("should not update inventory when restock is false", async () => {
      const inventoryBefore = await prisma.inventory.findFirst({
        where: { storeId, productId: productIds[0] },
      });

      const beforeQty = inventoryBefore?.onHand || 0;

      await app.inject({
        method: "POST",
        url: `/sales/${saleId}/refunds`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          items: [
            {
              saleItemId: saleItemIds[0],
              qty: 5,
            },
          ],
          restock: false,
        },
      });

      const inventoryAfter = await prisma.inventory.findFirst({
        where: { storeId, productId: productIds[0] },
      });

      const afterQty = inventoryAfter?.onHand || 0;
      expect(afterQty).toBe(beforeQty); // Should remain unchanged
    });

    it("should fail with refund qty exceeding sold qty", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/sales/${saleId}/refunds`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          items: [
            {
              saleItemId: saleItemIds[0],
              qty: 100, // Only 10 were sold
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain("exceed");
    });

    it("should fail without required authentication", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/sales/${saleId}/refunds`,
        payload: {
          items: [
            {
              saleItemId: saleItemIds[0],
              qty: 1,
            },
          ],
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should fail with empty items array", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/sales/${saleId}/refunds`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          items: [],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Validation Error");
    });

    it("should validate refund payload", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/sales/${saleId}/refunds`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          items: [
            {
              saleItemId: saleItemIds[0],
              qty: -1, // Invalid negative qty
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Validation Error");
    });

    it("should fail with no active shift", async () => {
      // Close the active shift
      await prisma.shiftSession.updateMany({
        where: { cashierId: userId },
        data: { status: "CLOSED" },
      });

      const response = await app.inject({
        method: "POST",
        url: `/sales/${saleId}/refunds`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          items: [
            {
              saleItemId: saleItemIds[0],
              qty: 1,
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain("shift");
    });
  });
});
