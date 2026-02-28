-- CreateTable
CREATE TABLE "ReceiptCounter" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReceiptCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptCounter_merchantId_storeId_dateKey_key" ON "ReceiptCounter"("merchantId", "storeId", "dateKey");
