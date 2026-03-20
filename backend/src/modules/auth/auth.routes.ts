import { FastifyInstance } from "fastify";
import { registerMerchantHandler, loginHandler, meHandler } from "./auth.controller";
import { authGuard } from "../../middlewares/authGuard";
import { getAuthRateLimiter } from "../../common/rateLimit";
import { createValidationMiddleware } from "../../middlewares/validation";
import { LoginSchema, RegisterMerchantSchema } from "../../common/validation";

export async function authRoutes(app: FastifyInstance) {
  const authRateLimiter = getAuthRateLimiter();
  
  // Apply strict rate limiting and validation to auth endpoints (5 attempts per 15 min)
  app.post(
    "/auth/register-merchant",
    {
      preHandler: [
        createValidationMiddleware(RegisterMerchantSchema),
        authRateLimiter,
      ],
    },
    registerMerchantHandler
  );

  app.post(
    "/auth/login",
    {
      preHandler: [
        createValidationMiddleware(LoginSchema),
        authRateLimiter,
      ],
    },
    loginHandler
  );

  app.get("/auth/me", { preHandler: [authGuard] }, meHandler);
}
