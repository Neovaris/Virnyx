// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_ROLE_NAMES = ["ADMIN", "MANAGER", "CASHIER"] as const;

async function ensureRolesForMerchant(merchantId: string) {
  for (const name of DEFAULT_ROLE_NAMES) {
    await prisma.role.upsert({
      where: {
        merchantId_name: { merchantId, name }, // requires @@unique([merchantId, name])
      },
      update: {},
      create: { merchantId, name },
    });
  }
}

async function main() {
  const merchants = await prisma.merchant.findMany({ select: { id: true } });

  for (const m of merchants) {
    await ensureRolesForMerchant(m.id);
  }

  console.log("✅ Roles ensured for all merchants");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });