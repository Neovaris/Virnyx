-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'Uncategorized';

-- CreateIndex
CREATE INDEX "ReceiptTemplate_isDefault_idx" ON "ReceiptTemplate"("isDefault");
