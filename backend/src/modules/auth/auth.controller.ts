import { FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcrypt";
import { prisma } from "../../db/prisma";
import type { PrismaClient } from "@prisma/client";

export async function registerMerchantHandler(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const body = req.body as any;

  const merchantName = body.merchantName as string;
  const storeName = body.storeName as string;
  const fullName = body.fullName as string;
  const email = body.email as string;
  const password = body.password as string;

  if (!merchantName || !storeName || !fullName || !email || !password) {
    return reply.code(400).send({ message: "Missing required fields" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return reply.code(400).send({ message: "Email already in use" });

  const passwordHash = await bcrypt.hash(password, 12);

  const { merchant, user } = await prisma.$transaction(async (tx: PrismaClient) => {
    const merchant = await tx.merchant.create({
      data: { name: merchantName },
    });

    const store = await tx.store.create({
      data: {
        name: storeName,
        merchantId: merchant.id,
      },
    });

    const adminRole = await tx.role.create({
      data: {
        name: "ADMIN",
        merchantId: merchant.id,
      },
    });

    const allPermissions = await tx.permission.findMany();

    for (const perm of allPermissions) {
      await tx.rolePermission.create({
        data: {
          roleId: adminRole.id,
          permissionId: perm.id,
        },
      });
    }

    const user = await tx.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        merchantId: merchant.id,
        storeId: store.id,
      },
    });

    await tx.userRole.create({
      data: { userId: user.id, roleId: adminRole.id },
    });

    return { merchant, user };
  });

  return reply.code(201).send({
    message: "Merchant registered successfully",
    merchantId: merchant.id,
    adminUserId: user.id,
  });
}

export async function loginHandler(req: FastifyRequest, reply: FastifyReply) {
  const body = req.body as any;
  const email = body.email as string;
  const password = body.password as string;

  if (!email || !password)
    return reply.code(400).send({ message: "Missing email or password" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return reply.code(401).send({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return reply.code(401).send({ message: "Invalid credentials" });

  // update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = await reply.jwtSign({
    sub: user.id,
    merchantId: user.merchantId,
    storeId: user.storeId,
  });

  return reply.send({ token });
}

export async function meHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req.user as any).sub as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      merchantId: true,
      storeId: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  return reply.send({ user });
}
