import { FastifyReply, FastifyRequest } from "fastify";

export async function tenantGuard(req: FastifyRequest, reply: FastifyReply) {
  // requires authGuard to run first (so req.user exists)
  const merchantId = req.user?.merchantId;

  if (!merchantId) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  // attach for convenience (optional)
  (req as any).merchantId = merchantId;
}