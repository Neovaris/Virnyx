-- DropIndex
DROP INDEX "Refund_merchantId_storeId_createdAt_idx";

-- DropIndex
DROP INDEX "Sale_merchantId_storeId_createdAt_idx";

-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "shiftSessionId" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "shiftSessionId" TEXT;

-- CreateIndex
CREATE INDEX "Refund_merchantId_storeId_shiftSessionId_createdAt_idx" ON "Refund"("merchantId", "storeId", "shiftSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "Sale_merchantId_storeId_shiftSessionId_createdAt_idx" ON "Sale"("merchantId", "storeId", "shiftSessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_shiftSessionId_fkey" FOREIGN KEY ("shiftSessionId") REFERENCES "ShiftSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_shiftSessionId_fkey" FOREIGN KEY ("shiftSessionId") REFERENCES "ShiftSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
