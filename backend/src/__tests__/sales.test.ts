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

describe("Sales Routes - Critical Path Tests", () => {
  let app: FastifyInstance;
  let authToken: string;
  let merchantId: string;
  let storeId: string;
  let userId: string;
  let productIds: string[];

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Setup test data
    const { merchant, store, user } = await createTestMerchant(
      "sales@test.com"
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
        email: "sales@test.com",
        password: "password",
      },
    });

    if (loginResponse.statusCode === 200) {
      const body = JSON.parse(loginResponse.body);
      authToken = body.token;
    }
  });

  afterEach(async () => {
    await cleanupDb();
  });

  describe("POST /sales", () => {
    it("should create a sale successfully", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/sales",
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          items: [
            {
              productId: productIds[0],
              qty: 5,
              price: 100,
            },
          ],
          payments: [
            {
              method: "CASH",
              amount: 500,
            },
          ],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.sale).toBeDefined();
      expect(body.sale.status).toBe("COMPLETED");
      expect(body.sale.total).toBe(500);
    });

    it("should handle multiple items in a sale", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/sales",
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          items: [
            {
              productId: productIds[0],
              qty: 2,
              price: 100,
            },
            {
              productId: productIds[1],
              qty: 3,
              price: 150,
            },
          ],
          payments: [
            {
              method: "CASH",
              amount: 650,
            },
          ],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.sale.items).toHaveLength(2);
      expect(body.sale.total).toBe(650);
    });

    it("should handle discount codes", async () => {
      // Create a discount rule
      await prisma.discountRule.create({
        data: {
          name: "Save 10 Percent",
          code: "SAVE10",
          type: "PERCENTAGE",
          value: 10,
          merchantId,
        },
      });

      const response = await app.inject({
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
          ],
          payments: [
            {
              method: "CASH",
              amount: 900, // 1000 - 10% = 900
            },
          ],
          discountPromoCode: "SAVE10",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.sale.discount).toBeGreaterThan(0);
    });

    it("should fail with invalid promo code", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/sales",
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          items: [
            {
              productId: productIds[0],
              qty: 1,
              price: 100,
            },
          ],
          payments: [
            {
              method: "CASH",
              amount: 100,
            },
          ],
          discountPromoCode: "INVALID",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain("invalid");
    });

    it("should fail with insufficient inventory", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/sales",
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          items: [
            {
              productId: productIds[0],
              qty: 500, // More than available (100)
              price: 100,
            },
          ],
          payments: [
            {
              method: "CASH",
              amount: 500,
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain("insufficient");
    });

    it("should fail without required authentication", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/sales",
        payload: {
          items: [
            {
              productId: productIds[0],
              qty: 1,
              price: 100,
            },
          ],
          payments: [
            {
              method: "CASH",
              amount: 100,
            },
          ],
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should fail with no active shift", async () => {
      // Close the active shift
      await prisma.shiftSession.updateMany({
        where: { cashierId: userId },
        data: { status: "CLOSED" },
      });

      const response = await app.inject({
        method: "POST",
        url: "/sales",
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          items: [
            {
              productId: productIds[0],
              qty: 1,
              price: 100,
            },
          ],
          payments: [
            {
              method: "CASH",
              amount: 100,
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain("shift");
    });

    it("should validate request payload", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/sales",
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          items: [], // Empty items
          payments: [
            {
              method: "CASH",
              amount: 100,
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Validation Error");
    });
  });

  describe("GET /sales", () => {
    it("should retrieve sales list", async () => {
      // Create a sale first
      await app.inject({
        method: "POST",
        url: "/sales",
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          items: [
            {
              productId: productIds[0],
              qty: 1,
              price: 100,
            },
          ],
          payments: [
            {
              method: "CASH",
              amount: 100,
            },
          ],
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/sales",
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });
  });
});
