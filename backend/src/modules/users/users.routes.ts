// src/modules/users/users.routes.ts
import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "../../db/prisma";
import { authGuard } from "../../middlewares/authGuard";
import { tenantGuard } from "../../middlewares/tenantGuard";
import { requirePermission } from "../../middlewares/requirePermission";

const SALT_ROUNDS = 10;

function asString(v: any) {
  return String(v ?? "").trim();
}

function normalizeEmail(v: any) {
  return asString(v).toLowerCase();
}

function isValidEmail(email: string) {
  // simple check; good enough for v1
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function usersRoutes(app: FastifyInstance) {
  // =========================
  // CREATE USER (cashier/staff)
  // POST /users
  // =========================
  app.post(
    "/users",
    { preHandler: [authGuard, tenantGuard, requirePermission("users:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const body = req.body as any;

      const fullName = asString(body.fullName);
      const email = normalizeEmail(body.email);
      const phone = body.phone !== undefined ? asString(body.phone) : "";
      const storeId = body.storeId !== undefined ? asString(body.storeId) : "";
      const password = asString(body.password);

      if (!fullName) return reply.code(400).send({ message: "fullName is required" });
      if (!email || !isValidEmail(email)) return reply.code(400).send({ message: "Valid email is required" });
      if (!password || password.length < 6) {
        return reply.code(400).send({ message: "password must be at least 6 characters" });
      }

      try {
        const result = await prisma.$transaction(async (tx) => {
          // If storeId provided, ensure it belongs to merchant
          if (storeId) {
            const store = await tx.store.findFirst({
              where: { id: storeId, merchantId, isActive: true },
              select: { id: true },
            });
            if (!store) {
              throw Object.assign(new Error("STORE_NOT_FOUND"), {
                statusCode: 404,
                payload: { message: "Store not found for this merchant" },
              });
            }
          }

          const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

          const user = await tx.user.create({
            data: {
              merchantId,
              storeId: storeId || null,
              fullName,
              email,
              phone: phone || null,
              passwordHash,
              status: "active",
            },
            select: {
              id: true,
              merchantId: true,
              storeId: true,
              fullName: true,
              email: true,
              phone: true,
              status: true,
              createdAt: true,
            },
          });

          return user;
        });

        return reply.code(201).send({ user: result });
      } catch (e: any) {
        if (e?.statusCode && e?.payload) return reply.code(e.statusCode).send(e.payload);

        // Prisma unique error: email already exists
        if (e?.code === "P2002") return reply.code(409).send({ message: "Email already exists" });

        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    },
  );

  // =========================
  // LIST USERS (pagination + search)
  // GET /users?q=&page=&limit=
  // =========================
  app.get(
    "/users",
    { preHandler: [authGuard, tenantGuard, requirePermission("users:read")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const qp = req.query as any;

      const q = asString(qp.q);
      const page = Math.max(1, Math.trunc(Number(qp.page ?? 1)));
      const limit = Math.min(100, Math.max(1, Math.trunc(Number(qp.limit ?? 20))));
      const skip = (page - 1) * limit;

      const where: any = { merchantId };

      if (q) {
        where.OR = [
          { fullName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ];
      }

      const [items, total] = await prisma.$transaction([
        prisma.user.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          select: {
            id: true,
            storeId: true,
            fullName: true,
            email: true,
            phone: true,
            status: true,
            lastLoginAt: true,
            createdAt: true,
            userRoles: { include: { role: true } },
          },
        }),
        prisma.user.count({ where }),
      ]);

      return reply.send({
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        items: items.map((u) => ({
          ...u,
          roles: u.userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
          userRoles: undefined,
        })),
      });
    },
  );

  // =========================
  // GET USER
  // GET /users/:id
  // =========================
  app.get(
    "/users/:id",
    { preHandler: [authGuard, tenantGuard, requirePermission("users:read")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const { id } = req.params as any;

      const user = await prisma.user.findFirst({
        where: { id, merchantId },
        select: {
          id: true,
          storeId: true,
          fullName: true,
          email: true,
          phone: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          userRoles: { include: { role: true } },
        },
      });

      if (!user) return reply.code(404).send({ message: "User not found" });

      return reply.send({
        user: {
          ...user,
          roles: user.userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
          userRoles: undefined,
        },
      });
    },
  );

  // =========================
  // UPDATE USER (profile fields only)
  // PATCH /users/:id
  // =========================
  app.patch(
    "/users/:id",
    { preHandler: [authGuard, tenantGuard, requirePermission("users:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const { id } = req.params as any;
      const body = req.body as any;

      const data: any = {};
      if (body.fullName !== undefined) {
        const fullName = asString(body.fullName);
        if (!fullName) return reply.code(400).send({ message: "fullName cannot be empty" });
        data.fullName = fullName;
      }
      if (body.phone !== undefined) data.phone = asString(body.phone) || null;

      if (body.storeId !== undefined) {
        const storeId = asString(body.storeId);
        if (storeId) {
          const store = await prisma.store.findFirst({
            where: { id: storeId, merchantId, isActive: true },
            select: { id: true },
          });
          if (!store) return reply.code(404).send({ message: "Store not found for this merchant" });
          data.storeId = storeId;
        } else {
          data.storeId = null;
        }
      }

      if (Object.keys(data).length === 0) {
        return reply.code(400).send({ message: "No fields provided to update" });
      }

      const updated = await prisma.user.updateMany({
        where: { id, merchantId },
        data,
      });

      if (updated.count !== 1) return reply.code(404).send({ message: "User not found" });

      const fresh = await prisma.user.findFirst({
        where: { id, merchantId },
        select: { id: true, storeId: true, fullName: true, email: true, phone: true, status: true, createdAt: true },
      });

      return reply.send({ user: fresh });
    },
  );

  // =========================
  // DISABLE USER
  // PATCH /users/:id/disable
  // =========================
  app.patch(
    "/users/:id/disable",
    { preHandler: [authGuard, tenantGuard, requirePermission("users:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const { id } = req.params as any;

      const updated = await prisma.user.updateMany({
        where: { id, merchantId },
        data: { status: "disabled" },
      });

      if (updated.count !== 1) return reply.code(404).send({ message: "User not found" });
      return reply.send({ message: "User disabled" });
    },
  );

  // =========================
  // ENABLE USER
  // PATCH /users/:id/enable
  // =========================
  app.patch(
    "/users/:id/enable",
    { preHandler: [authGuard, tenantGuard, requirePermission("users:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const { id } = req.params as any;

      const updated = await prisma.user.updateMany({
        where: { id, merchantId },
        data: { status: "active" },
      });

      if (updated.count !== 1) return reply.code(404).send({ message: "User not found" });
      return reply.send({ message: "User enabled" });
    },
  );

  // =========================
  // RESET PASSWORD
  // POST /users/:id/reset-password
  // =========================
  app.post(
    "/users/:id/reset-password",
    { preHandler: [authGuard, tenantGuard, requirePermission("users:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const { id } = req.params as any;
      const body = req.body as any;

      const newPassword = asString(body.newPassword);
      if (!newPassword || newPassword.length < 6) {
        return reply.code(400).send({ message: "newPassword must be at least 6 characters" });
      }

      const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

      const updated = await prisma.user.updateMany({
        where: { id, merchantId },
        data: { passwordHash: hash },
      });

      if (updated.count !== 1) return reply.code(404).send({ message: "User not found" });

      return reply.send({ message: "Password reset successful" });
    },
  );

  // =========================
  // ASSIGN ROLE TO USER
  // POST /users/:id/roles
  // body: { roleId }
  // =========================
  app.post(
    "/users/:id/roles",
    { preHandler: [authGuard, tenantGuard, requirePermission("users:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const { id: userId } = req.params as any;
      const body = req.body as any;

      const roleId = asString(body.roleId);
      if (!roleId) return reply.code(400).send({ message: "roleId is required" });

      try {
        const result = await prisma.$transaction(async (tx) => {
          const user = await tx.user.findFirst({ where: { id: userId, merchantId }, select: { id: true } });
          if (!user) {
            throw Object.assign(new Error("USER_NOT_FOUND"), {
              statusCode: 404,
              payload: { message: "User not found" },
            });
          }

          const role = await tx.role.findFirst({ where: { id: roleId, merchantId }, select: { id: true, name: true } });
          if (!role) {
            throw Object.assign(new Error("ROLE_NOT_FOUND"), {
              statusCode: 404,
              payload: { message: "Role not found" },
            });
          }

          await tx.userRole.upsert({
            where: { userId_roleId: { userId, roleId } },
            update: {},
            create: { userId, roleId },
          });

          return { userId, roleId, roleName: role.name };
        });

        return reply.send({ message: "Role assigned", ...result });
      } catch (e: any) {
        if (e?.statusCode && e?.payload) return reply.code(e.statusCode).send(e.payload);
        return reply.code(500).send({ message: e?.message ?? "Server error" });
      }
    },
  );

  // =========================
  // REMOVE ROLE FROM USER
  // DELETE /users/:id/roles/:roleId
  // =========================
  app.delete(
    "/users/:id/roles/:roleId",
    { preHandler: [authGuard, tenantGuard, requirePermission("users:write")] },
    async (req, reply) => {
      const { merchantId } = req.user as any;
      const { id: userId, roleId } = req.params as any;

      // ensure user belongs to merchant (prevents cross-tenant deletes)
      const user = await prisma.user.findFirst({ where: { id: userId, merchantId }, select: { id: true } });
      if (!user) return reply.code(404).send({ message: "User not found" });

      await prisma.userRole.deleteMany({ where: { userId, roleId } });

      return reply.send({ message: "Role removed" });
    },
  );
}