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

// Define permissions for each role
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

// Ensure permissions exist in the database (outside transactions)
async function ensurePermissionsExist() {
  for (const perm of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { description: perm.description },
      create: { key: perm.key, description: perm.description },
    });
  }
}

// Create roles for a merchant with proper permission assignments
// Must be called OUTSIDE of Prisma transactions
async function createRolesForMerchant(merchantId: string) {
  const createdRoles: Record<string, any> = {};

  // Fetch permissions once
  const allPermissions = await prisma.permission.findMany();
  const permissionMap = new Map(allPermissions.map((p) => [p.key, p]));

  for (const roleName of DEFAULT_ROLE_NAMES) {
    // Upsert role to avoid duplicates
    const role = await prisma.role.upsert({
      where: {
        merchantId_name: { merchantId, name: roleName },
      },
      update: {},
      create: { merchantId, name: roleName },
    });

    createdRoles[roleName] = role;

    // Get permission keys for this role
    const permissionKeys = ROLE_PERMISSIONS[roleName] || [];

    // Clear existing role-permissions (in case of upsert)
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    // Assign permissions to role using pre-fetched permissions
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

  // Ensure all permissions exist before registering merchant
  await ensurePermissionsExist();

  // Create merchant first
  const merchant = await prisma.merchant.create({
    data: { name: merchantName },
  });

  // Create roles for merchant (BEFORE user transaction)
  const roles = await createRolesForMerchant(merchant.id);

  // Create store and user in a transaction
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

    // Assign user to ADMIN role
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

  // Verify user has merchantId
  if (!user.merchantId) {
    return reply.code(400).send({
      message:
        "User account is missing merchant association. Please contact support.",
    });
  }

  // Fetch roles for this user
  const userRoles = await prisma.userRole.findMany({
    where: { userId: user.id },
    select: {
      role: {
        select: { name: true },
      },
    },
  });

  const roles = userRoles.map((ur) => ur.role.name);

  const token = await reply.jwtSign({
    sub: user.id,
    merchantId: user.merchantId,
    storeId: user.storeId || undefined,
    roles,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return reply.send({ token });
}

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
  const user = {
    ...userBase,
    storeName: store?.name || null,
  };

  return reply.send({ user, roles, permissions });
}

