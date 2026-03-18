-- CreateTable ReceiptTemplate
CREATE TABLE "ReceiptTemplate" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    
    -- Template content (copy of fields from ReceiptSettings)
    "receiptWidth" TEXT NOT NULL DEFAULT '80MM',
    "useLogoOnReceipt" BOOLEAN NOT NULL DEFAULT true,
    "logoUrl" TEXT,
    "merchantName" TEXT NOT NULL DEFAULT 'VIRNYX POS',
    "storeName" TEXT NOT NULL DEFAULT 'Sales Receipt',
    
    "customHeader" TEXT,
    "customFooter" TEXT,
    "displayLogo" BOOLEAN NOT NULL DEFAULT true,
    "displayMerchantName" BOOLEAN NOT NULL DEFAULT true,
    "displayStoreName" BOOLEAN NOT NULL DEFAULT true,
    "displayTaxId" BOOLEAN NOT NULL DEFAULT false,
    "displayCashierName" BOOLEAN NOT NULL DEFAULT true,
    "displayReceiptNumber" BOOLEAN NOT NULL DEFAULT true,
    "displayTimestamp" BOOLEAN NOT NULL DEFAULT true,
    
    "showProductSKU" BOOLEAN NOT NULL DEFAULT false,
    "showProductDescription" BOOLEAN NOT NULL DEFAULT true,
    "showUnitPrice" BOOLEAN NOT NULL DEFAULT true,
    "showQuantity" BOOLEAN NOT NULL DEFAULT true,
    "showLineTotal" BOOLEAN NOT NULL DEFAULT true,
    
    "displaySubtotal" BOOLEAN NOT NULL DEFAULT true,
    "displayTaxBreakdown" BOOLEAN NOT NULL DEFAULT true,
    "displayTotal" BOOLEAN NOT NULL DEFAULT true,
    "displayChangeDue" BOOLEAN NOT NULL DEFAULT true,
    
    "showPaymentMethod" BOOLEAN NOT NULL DEFAULT true,
    "showPaymentReference" BOOLEAN NOT NULL DEFAULT false,
    
    "thankYouMessage" TEXT,
    "returnsExchangeMessage" TEXT,
    "discountMessage" TEXT,
    
    "printerType" TEXT NOT NULL DEFAULT 'THERMAL',
    "printBarcode" BOOLEAN NOT NULL DEFAULT true,
    "printQRCode" BOOLEAN NOT NULL DEFAULT false,
    
    "enableEmailReceipt" BOOLEAN NOT NULL DEFAULT false,
    "enableSMSReceipt" BOOLEAN NOT NULL DEFAULT false,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReceiptTemplate_merchantId_idx" ON "ReceiptTemplate"("merchantId");

-- Create unique constraint
CREATE UNIQUE INDEX "ReceiptTemplate_merchantId_name_key" ON "ReceiptTemplate"("merchantId", "name");

-- Add foreign key
ALTER TABLE "ReceiptTemplate" ADD CONSTRAINT "ReceiptTemplate_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add activeTemplateId to ReceiptSettings
ALTER TABLE "ReceiptSettings" ADD COLUMN "activeTemplateId" TEXT;

-- Create index for activeTemplateId
CREATE INDEX "ReceiptSettings_activeTemplateId_idx" ON "ReceiptSettings"("activeTemplateId");
