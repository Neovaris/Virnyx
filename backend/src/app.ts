import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import dotenv from "dotenv";

dotenv.config();

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors);
  app.register(jwt, {
    secret: process.env.JWT_SECRET || "supersecret"
  });

  app.get("/", async () => {
    return { message: "Virnyx POS Backend Running" };
  });

  return app;
}