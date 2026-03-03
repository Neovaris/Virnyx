// This script seeds the permissions and default roles for all merchants in the database.

import { prisma } from "./prisma";

async function seedPermissionsAndRoles() {
  const permissions = [
    "products:read",
    "products:write",
    "inventory:read",
    "inventory:write",
    "sales:read",
    "sales:write",
    "users:read",
    "users:write",
    "settings:read",
    "settings:write",
  ];

  // 1️⃣ Seed permissions
  for (const key of permissions) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }

  console.log("✅ Permissions seeded");

  // 2️⃣ Attach default roles to all merchants
  const merchants = await prisma.merchant.findMany({
    select: { id: true },
  });

  // Fetch perms once (no need to refetch per merchant)
  const allPerms = await prisma.permission.findMany();

  for (const merchant of merchants) {
    // Define roles with their permissions
    const roleDefs = [
      {
        name: "ADMIN",
        perms: permissions, // All permissions
      },
      {
        name: "MANAGER",
        perms: [
          "products:read",
          "products:write",
          "inventory:read",
          "inventory:write",
          "sales:read",
          "sales:write",
          "users:read",
        ],
      },
      {
        name: "STORE_MANAGER",
        perms: [
          "products:read",
          "inventory:read",
          "inventory:write",
          "sales:read",
          "sales:write",
        ],
      },
      {
        name: "CASHIER",
        perms: ["products:read", "inventory:read", "sales:read", "sales:write"],
      },
      {
        name: "SALES_SUPERVISOR",
        perms: ["products:read", "inventory:read", "sales:read", "sales:write"],
      },
    ];

    for (const roleDef of roleDefs) {
      const role = await prisma.role.upsert({
        where: {
          merchantId_name: { merchantId: merchant.id, name: roleDef.name },
        },
        update: {},
        create: {
          merchantId: merchant.id,
          name: roleDef.name,
        },
      });

      for (const perm of allPerms) {
        if (!roleDef.perms.includes(perm.key)) continue;

        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: perm.id,
          },
        });
      }
    }
  }

  console.log("✅ Roles + RolePermissions seeded");
}

seedPermissionsAndRoles()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
