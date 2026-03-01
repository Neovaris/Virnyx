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

  for (const merchant of merchants) {
    const adminRole = await prisma.role.upsert({
      where: { merchantId_name: { merchantId: merchant.id, name: "ADMIN" } },
      update: {},
      create: {
        merchantId: merchant.id,
        name: "ADMIN",
      },
    });

    const cashierRole = await prisma.role.upsert({
      where: { merchantId_name: { merchantId: merchant.id, name: "CASHIER" } },
      update: {},
      create: {
        merchantId: merchant.id,
        name: "CASHIER",
      },
    });

    const allPerms = await prisma.permission.findMany();

    const adminPermKeys = permissions;
    const cashierPermKeys = [
      "products:read",
      "inventory:read",
      "sales:read",
      "sales:write",
    ];

    for (const perm of allPerms) {
      if (adminPermKeys.includes(perm.key)) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: adminRole.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: adminRole.id,
            permissionId: perm.id,
          },
        });
      }

      if (cashierPermKeys.includes(perm.key)) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: cashierRole.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: cashierRole.id,
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
  .finally(() => prisma.$disconnect());