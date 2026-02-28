import { prisma } from "./prisma";

async function seedPermissions() {
  const permissions = [
    "products:read",
    "products:write",
    "inventory:read",
    "inventory:write",
    "sales:read",
    "sales:write",
    "users:read",
    "users:write"
  ];

  for (const key of permissions) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }

  console.log("✅ Permissions seeded");
}

seedPermissions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());