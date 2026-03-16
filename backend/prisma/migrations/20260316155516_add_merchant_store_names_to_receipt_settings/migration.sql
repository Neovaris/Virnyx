-- AlterTable
ALTER TABLE "ReceiptSettings" ADD COLUMN     "merchantName" TEXT NOT NULL DEFAULT 'VIRNYX POS',
ADD COLUMN     "storeName" TEXT NOT NULL DEFAULT 'Sales Receipt';
