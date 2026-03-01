/*
  Warnings:

  - Added the required column `saleItemId` to the `RefundItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RefundItem" ADD COLUMN     "saleItemId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "RefundItem_saleItemId_idx" ON "RefundItem"("saleItemId");

-- AddForeignKey
ALTER TABLE "RefundItem" ADD CONSTRAINT "RefundItem_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
