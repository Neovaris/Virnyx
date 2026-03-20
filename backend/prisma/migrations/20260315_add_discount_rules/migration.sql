-- CreateTable
CREATE TABLE "DiscountRule" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "minOrderAmount" DOUBLE PRECISION,
    "minItemQty" INTEGER,
    "maxDiscount" DOUBLE PRECISION,
    "applicableToAll" BOOLEAN NOT NULL DEFAULT true,
    "applicableProductIds" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxUsesTotal" INTEGER,
    "maxUsesPerCustomer" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscountRule_merchantId_code_key" ON "DiscountRule"("merchantId", "code");

-- CreateIndex
CREATE INDEX "DiscountRule_merchantId_isActive_idx" ON "DiscountRule"("merchantId", "isActive");

-- CreateIndex
CREATE INDEX "DiscountRule_merchantId_code_idx" ON "DiscountRule"("merchantId", "code");

-- AddForeignKey
ALTER TABLE "DiscountRule" ADD CONSTRAINT "DiscountRule_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
