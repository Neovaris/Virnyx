import { FastifyInstance } from "fastify";
import { authGuard } from "../../middlewares/authGuard";
import { tenantGuard } from "../../middlewares/tenantGuard";
import { requirePermission } from "../../middlewares/requirePermission";

export async function productRoutes(app: FastifyInstance) {
  app.get(
    "/products/test",
    {
      preHandler: [
        authGuard,
        tenantGuard,
        requirePermission("products:read")
      ]
    },
    async () => {
      return { message: "You can read products" };
    }
  );
}