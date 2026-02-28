import { FastifyInstance } from "fastify";
import { registerMerchantHandler, loginHandler, meHandler } from "./auth.controller";
import { authGuard } from "../../middlewares/authGuard";

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register-merchant", registerMerchantHandler);
  app.post("/auth/login", loginHandler);
  app.get("/auth/me", { preHandler: [authGuard] }, meHandler);
}
