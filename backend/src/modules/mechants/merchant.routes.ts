import { FastifyInstance } from "fastify";
import { authGuard } from "../../middlewares/authGuard";
import { tenantGuard } from "../../middlewares/tenantGuard";
import { prisma } from "../../db/prisma";

export async function merchantRoutes(app: FastifyInstance) {
  app.get("/merchants/me", { preHandler: [authGuard, tenantGuard] }, async (req) => {
    const merchantId = (req as any).merchantId as string;

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, name: true, createdAt: true },
    });

    return { merchant };
  });
}