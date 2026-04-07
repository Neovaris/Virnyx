import { FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcrypt";
import { prisma } from "../../db/prisma";

// All permissions available in the system
const ALL_PERMISSIONS = [
  { key: "users:read", description: "View users" },
  { key: "users:write", description: "Create, update, delete users" },
  { key: "discounts:read", description: "View discount rules" },
  {
    key: "discounts:write",
    description: "Create, update, delete discount rules",
  },
  { key: "settings:read", description: "View merchant settings" },
  { key: "settings:write", description: "Update merchant settings" },
  { key: "sales:read", description: "View sales" },
  { key: "sales:write", description: "Process sales and refunds" },
  { key: "products:read", description: "View products" },
  { key: "products:write", description: "Create, update, delete products" },
  { key: "inventory:read", description: "View inventory" },
  { key: "inventory:write", description: "Update inventory" },
  { key: "reports:read", description: "View reports" },
  { key: "receipts:read", description: "View receipts" },
  { key: "refunds:read", description: "View refunds" },
  { key: "refunds:write", description: "Process refunds" },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    "users:read",
    "users:write",
    "discounts:read",
    "discounts:write",
    "settings:read",
    "settings:write",
    "sales:read",
    "sales:write",
    "products:read",
    "products:write",
    "inventory:read",
    "inventory:write",
    "reports:read",
    "receipts:read",
    "refunds:read",
    "refunds:write",
  ],
  MANAGER: [
    "discounts:read",
    "discounts:write",
    "settings:read",
    "sales:read",
    "sales:write",
    "products:read",
    "products:write",
    "inventory:read",
    "inventory:write",
    "reports:read",
    "receipts:read",
    "refunds:read",
  ],
  CASHIER: [
    "discounts:read",
    "sales:read",
    "sales:write",
    "products:read",
    "inventory:read",
    "receipts:read",
  ],
};

const DEFAULT_ROLE_NAMES = ["ADMIN", "MANAGER", "CASHIER"] as const;

// Ensure permissions exist
async function ensurePermissionsExist() {
  for (const perm of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { description: perm.description },
      create: { key: perm.key, description: perm.description },
    });
  }
}

// Create roles + assign permissions
async function createRolesForMerchant(merchantId: string) {
  const createdRoles: Record<string, any> = {};

  const allPermissions = await prisma.permission.findMany();
  const permissionMap = new Map(allPermissions.map((p) => [p.key, p]));

  for (const roleName of DEFAULT_ROLE_NAMES) {
    const role = await prisma.role.upsert({
      where: {
        merchantId_name: { merchantId, name: roleName },
      },
      update: {},
      create: { merchantId, name: roleName },
    });

    createdRoles[roleName] = role;

    const permissionKeys = ROLE_PERMISSIONS[roleName] || [];

    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    for (const permKey of permissionKeys) {
      const permission = permissionMap.get(permKey);
      if (permission) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }
    }
  }

  return createdRoles;
}

// REGISTER
export async function registerMerchantHandler(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const body = req.body as any;

  const { merchantName, storeName, fullName, email, password } = body;

  if (!merchantName || !storeName || !fullName || !email || !password) {
    return reply.code(400).send({ message: "Missing required fields" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return reply.code(400).send({ message: "Email already in use" });

  const passwordHash = await bcrypt.hash(password, 12);

  await ensurePermissionsExist();

  const merchant = await prisma.merchant.create({
    data: { name: merchantName },
  });

  const roles = await createRolesForMerchant(merchant.id);

  const { user } = await prisma.$transaction(async (tx) => {
    const store = await tx.store.create({
      data: {
        name: storeName,
        merchantId: merchant.id,
      },
    });

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
      data: {
        userId: user.id,
        roleId: roles.ADMIN.id,
      },
    });

    return { user };
  });

  return reply.code(201).send({
    message: "Merchant registered successfully",
    merchantId: merchant.id,
    adminUserId: user.id,
  });
}

// LOGIN (🔥 UPGRADED)
export async function loginHandler(req: FastifyRequest, reply: FastifyReply) {
  const { email, password } = req.body as any;

  if (!email || !password)
    return reply.code(400).send({ message: "Missing email or password" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return reply.code(401).send({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return reply.code(401).send({ message: "Invalid credentials" });

  if (!user.merchantId) {
    return reply.code(400).send({
      message: "User missing merchant association",
    });
  }

  // 🔥 Fetch roles + permissions
  const userRoles = await prisma.userRole.findMany({
    where: { userId: user.id },
    include: {
      role: {
        include: {
          rolePerms: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  const roles = userRoles.map((ur) => ur.role.name);

  const permissions = Array.from(
    new Set(
      userRoles.flatMap((ur) =>
        ur.role.rolePerms.map((rp) => rp.permission.key),
      ),
    ),
  );

  // 🔥 JWT now carries permissions
  const token = await reply.jwtSign({
    sub: user.id,
    merchantId: user.merchantId,
    storeId: user.storeId,
    roles,
    permissions,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return reply.send({ token });
}

// ME (unchanged - already solid)
export async function meHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = (req.user as any).sub as string;

  const userWithRoles = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      status: true,
      merchantId: true,
      storeId: true,
      createdAt: true,
      lastLoginAt: true,

      store: {
        select: { name: true },
      },

      userRoles: {
        select: {
          role: {
            select: {
              name: true,
              rolePerms: {
                select: {
                  permission: { select: { key: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!userWithRoles) {
    return reply.code(401).send({ message: "User not found" });
  }

  if (userWithRoles.status === "disabled") {
    return reply.code(403).send({ message: "Account disabled" });
  }

  const roles = userWithRoles.userRoles.map((ur) => ur.role.name);

  const permissions = Array.from(
    new Set(
      userWithRoles.userRoles.flatMap((ur) =>
        ur.role.rolePerms.map((rp) => rp.permission.key),
      ),
    ),
  ).sort();

  const { userRoles, store, ...userBase } = userWithRoles;

  return reply.send({
    user: {
      ...userBase,
      storeName: store?.name || null,
    },
    roles,
    permissions,
  });
}