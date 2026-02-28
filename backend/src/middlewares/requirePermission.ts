import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../db/prisma";

export function requirePermission(permissionKey: string) {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    const userId = req.user?.sub;

    const roles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePerms: {
              include: { permission: true }
            }
          }
        }
      }
    });

    const hasPermission = roles.some(role =>
      role.role.rolePerms.some(rp =>
        rp.permission.key === permissionKey
      )
    );

    if (!hasPermission) {
      return reply.code(403).send({ message: "Forbidden" });
    }
  };
}