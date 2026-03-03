-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "pricesIncludeTax" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "receiptFooter" TEXT,
ADD COLUMN     "taxEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "openingCashDefault" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "receiptPrefix" TEXT;
