-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "rejectionReason" TEXT;

-- CreateIndex
CREATE INDEX "Refund_merchantId_storeId_approvalStatus_idx" ON "Refund"("merchantId", "storeId", "approvalStatus");
