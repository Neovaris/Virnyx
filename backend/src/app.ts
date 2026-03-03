import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
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

dotenv.config();

export function buildApp() {
  const app = Fastify({ logger: true });
  
  app.register(cors);
  app.register(jwt, { secret: process.env.JWT_SECRET || "supersecret"});
  
  app.get("/", async () => ({ message: "Virnyx POS Backend Running" }));
  
  app.register(authRoutes);
  app.register(merchantRoutes);
  app.register(productRoutes);
  app.register(inventoryRoutes);
  app.register(salesRoutes)
  app.register(reportsRoutes)
  app.register(refundsRoutes);
  app.register(sessionsRoutes);
  app.register(usersRoutes);
  app.register(receiptsRoutes);
  app.register(rolesRoutes);
  app.register(settingsRoutes);

  return app;
}