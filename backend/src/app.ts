import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import dotenv from "dotenv";
import { authRoutes } from "./modules/auth/auth.routes";
import { merchantRoutes } from "./modules/merchants/merchant.routes";
import { productRoutes } from "./modules/products/products.routes";

dotenv.config();

export function buildApp() {
  const app = Fastify({ logger: true });
  
  app.register(cors);
  app.register(jwt, { secret: process.env.JWT_SECRET || "supersecret"});
  
  app.get("/", async () => ({ message: "Virnyx POS Backend Running" }));
  
  app.register(authRoutes);
  app.register(merchantRoutes);
  app.register(productRoutes);

  return app;
}