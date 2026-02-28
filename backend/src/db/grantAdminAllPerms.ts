import { prisma } from "../db/prisma";

async function main() {
  // Update this with your merchantId from /auth/me
  const merchantId = "be4ccc57-2a0f-468d-9524-ab92a5ddd218";

  const adminRole = await prisma.role.findFirst({
    where: { merchantId, name: "ADMIN" },
  });

  if (!adminRole) throw new Error("ADMIN role not found");

  const perms = await prisma.permission.findMany();

  for (const perm of perms) {
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

  console.log("✅ ADMIN granted all permissions");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());