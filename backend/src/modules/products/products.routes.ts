import { FastifyInstance } from "fastify";
import { prisma } from "../../db/prisma";
import { authGuard } from "../../middlewares/authGuard";
import { tenantGuard } from "../../middlewares/tenantGuard";
import { requirePermission } from "../../middlewares/requirePermission";

export async function productRoutes(app: FastifyInstance) {

  app.post(
    "/products",
    {
      preHandler: [
        authGuard,
        tenantGuard,
        requirePermission("products:write"),
      ],
    },
    async (req, reply) => {
      const merchantId = req.user.merchantId;
      const body = req.body as any;

      const { name, price } = body;

      if (!name || !price) {
        return reply.code(400).send({ message: "Missing name or price" });
      }

      const product = await prisma.product.create({
        data: {
          name,
          price: Number(price),
          merchantId,
        },
      });

      return reply.code(201).send(product);
    }
  );

}