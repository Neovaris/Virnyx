import { prisma } from "../src/db/prisma";

async function main() {
  // Sum ledger by (merchantId, storeId, productId)
  const sums = await prisma.stockLedger.groupBy({
    by: ["merchantId", "storeId", "productId"],
    _sum: { qtyChange: true },
  });

  console.log(`Found ${sums.length} inventory buckets to backfill...`);

  // Upsert in batches to avoid huge transactions
  const batchSize = 200;
  for (let i = 0; i < sums.length; i += batchSize) {
    const batch = sums.slice(i, i + batchSize);

    await prisma.$transaction(
      batch.map((row) => {
        const onHand = row._sum.qtyChange ?? 0;
        return prisma.inventory.upsert({
          where: {
            merchantId_storeId_productId: {
              merchantId: row.merchantId,
              storeId: row.storeId,
              productId: row.productId,
            },
          },
          update: { onHand },
          create: {
            merchantId: row.merchantId,
            storeId: row.storeId,
            productId: row.productId,
            onHand,
          },
        });
      })
    );

    console.log(`Backfilled ${Math.min(i + batchSize, sums.length)}/${sums.length}`);
  }

  console.log("✅ Backfill complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });