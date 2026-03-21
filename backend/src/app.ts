import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import fastifyStatic from "@fastify/static";
import path from "path";
import dotenv from "dotenv";
import { authRoutes } from "./modules/auth/auth.routes";
import { merchantRoutes } from "./modules/merchants/merchant.routes";
import { productRoutes } from "./modules/products/products.routes";
import { inventoryRoutes } from "./modules/inventory/inventory.routes";
import { salesRoutes } from "./modules/sales/sales.routes";
import { reportsRoutes } from "./modules/reports/reports.routes";
import { refundsRoutes } from "./modules/refunds/refunds.routes";
import { sessionsRoutes } from "./modules/sessions/sessions.routes";
import { usersRoutes } from "./modules/users/users.routes";
import { receiptsRoutes } from "./modules/receipts/receipts.routes";
import { rolesRoutes } from "./modules/roles/roles.routes";
import { settingsRoutes } from "./modules/settings/settings.routes";
import { discountsRoutes } from "./modules/discounts/discounts.routes";
import {
  createHttpLogger,
  logInfo,
  createResponseLogger,
} from "./common/logger";
import { globalErrorHandler } from "./middlewares/errorHandler";
import { configureRateLimit } from "./common/rateLimit";

dotenv.config();

// Validate required environment variables at startup
function validateEnv() {
  const required = ["JWT_SECRET", "DATABASE_URL"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        `Please check your .env file.`,
    );
  }
}

validateEnv();

export async function buildApp() {
  const app = Fastify({ logger: false }); // Disable Fastify's default logger

  // Add logging middleware
  app.addHook("onRequest", createHttpLogger());
  app.addHook("onResponse", createResponseLogger());

  // Configure global rate limiting
  await configureRateLimit(app);

  app.register(cors, {
    origin: [
      "http://localhost:3000", // dev
      "https://virnyx.vercel.app", // production
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Register static file serving BEFORE JWT middleware (no auth needed)
  const publicDir = path.join(__dirname, "..", "public");
  app.register(fastifyStatic, {
    root: publicDir,
    prefix: "/public/",
  });

  app.register(jwt, { secret: process.env.JWT_SECRET! });

  app.get("/", async () => {
    logInfo("Server health check");
    return { message: "Virnyx POS Backend Running" };
  });

  app.register(authRoutes);
  app.register(merchantRoutes);
  app.register(productRoutes);
  app.register(inventoryRoutes);
  app.register(salesRoutes);
  app.register(reportsRoutes);
  app.register(refundsRoutes);
  app.register(sessionsRoutes);
  app.register(usersRoutes);
  app.register(receiptsRoutes);
  app.register(rolesRoutes);
  app.register(settingsRoutes);
  app.register(discountsRoutes);

  // Register global error handler
  app.setErrorHandler(globalErrorHandler);

  return app;
}
