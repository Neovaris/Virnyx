import { FastifyReply, FastifyRequest } from "fastify";

export function requirePermission(permissionKey: string) {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    const user = req.user as any;

    if (!user?.permissions) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const hasPermission = user.permissions.includes(permissionKey);

    if (!hasPermission) {
      return reply.code(403).send({ message: "Forbidden" });
    }
  };
}

export function requireAnyPermission(permissionKeys: string[]) {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    const user = req.user as any;

    if (!user?.permissions) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const hasAnyPermission = permissionKeys.some((key) =>
      user.permissions.includes(key),
    );

    if (!hasAnyPermission) {
      return reply.code(403).send({ message: "Forbidden" });
    }
  };
}
