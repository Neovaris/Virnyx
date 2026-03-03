// src/modules/roles/roles.routes.ts
import { FastifyInstance } from "fastify";
import { prisma } from "../../db/prisma";
import { authGuard } from "../../middlewares/authGuard";
import { tenantGuard } from "../../middlewares/tenantGuard";
import { requirePermission } from "../../middlewares/requirePermission";

export async function rolesRoutes(app: FastifyInstance) {
  // GET /roles
  app.get(
    "/roles",
    { preHandler: [authGuard, tenantGuard, requirePermission("users:read")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;

      const roles = await prisma.role.findMany({
        where: { merchantId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });

      return reply.send({ items: roles });
    }
  );
}