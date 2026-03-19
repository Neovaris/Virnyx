import { FastifyReply, FastifyRequest } from "fastify";

export async function authGuard(req: FastifyRequest, reply: FastifyReply) {
  try {
    // First try to verify JWT from Authorization header
    await req.jwtVerify();
  } catch (headerError) {
    // If header auth fails, try to get token from cookies (if cookies plugin is available)
    const token = ((req as any).cookies?.token);
    if (!token) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    try {
      // Manually verify the token from cookie
      req.user = await req.server.jwt.verify(token);
    } catch {
      return reply.code(401).send({ message: "Unauthorized" });
    }
  }
}