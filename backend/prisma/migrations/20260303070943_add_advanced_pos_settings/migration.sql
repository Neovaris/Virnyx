-- CreateTable
CREATE TABLE "PaymentMethodSettings" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "enableCash" BOOLEAN NOT NULL DEFAULT true,
    "enableCard" BOOLEAN NOT NULL DEFAULT true,
    "enableMobileMoney" BOOLEAN NOT NULL DEFAULT true,
    "enableCheck" BOOLEAN NOT NULL DEFAULT false,
    "enableBankTransfer" BOOLEAN NOT NULL DEFAULT false,
    "cardSurchargePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mobileMoneysSurchargePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "checkProcessingFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bankTransferFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cardProcessorName" TEXT,
    "cardProcessorKey" TEXT,
    "cardProcessorSecret" TEXT,
    "mobileMoneyProvider" TEXT,
    "mobileMoneyApiKey" TEXT,
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankAccountName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethodSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundPolicySettings" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "refundWindowDays" INTEGER NOT NULL DEFAULT 30,
    "maxRefundPercentage" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "requireApprovalAboveAmount" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "requireManagerApproval" BOOLEAN NOT NULL DEFAULT true,
    "requireAdminApproval" BOOLEAN NOT NULL DEFAULT false,
    "autoRestockItems" BOOLEAN NOT NULL DEFAULT true,
    "restockFeePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minRefundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxRefundsPerDay" INTEGER NOT NULL DEFAULT 0,
    "printRefundReceipt" BOOLEAN NOT NULL DEFAULT true,
    "refundReceiptPrefix" TEXT NOT NULL DEFAULT 'REF-',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundPolicySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftManagementSettings" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "autoCloseTime" TEXT,
    "allowLateCloseMinutes" INTEGER NOT NULL DEFAULT 60,
    "requireOpeningCash" BOOLEAN NOT NULL DEFAULT true,
    "requireClosingBalance" BOOLEAN NOT NULL DEFAULT true,
    "varianceTolerancePercent" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "toleranceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requireApprovalForVariance" BOOLEAN NOT NULL DEFAULT true,
    "varianceApprovalThreshold" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "requireApprovalForOvertime" BOOLEAN NOT NULL DEFAULT false,
    "overtimeThresholdMinutes" INTEGER NOT NULL DEFAULT 120,
    "maxShiftDurationMinutes" INTEGER NOT NULL DEFAULT 480,
    "minBreakTimeMinutes" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftManagementSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSettings" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "sendLowStockAlerts" BOOLEAN NOT NULL DEFAULT true,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "sendOutOfStockAlerts" BOOLEAN NOT NULL DEFAULT true,
    "enableEndOfDayReport" BOOLEAN NOT NULL DEFAULT true,
    "endOfDayReportTime" TEXT NOT NULL DEFAULT '22:00',
    "enableHighValueSaleAlert" BOOLEAN NOT NULL DEFAULT true,
    "highValueThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enableUnusualTransactionAlert" BOOLEAN NOT NULL DEFAULT true,
    "enableErrorNotifications" BOOLEAN NOT NULL DEFAULT true,
    "enableRefundAlerts" BOOLEAN NOT NULL DEFAULT true,
    "notifyViaEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyViaSMS" BOOLEAN NOT NULL DEFAULT false,
    "notifyViaInApp" BOOLEAN NOT NULL DEFAULT true,
    "alertEmails" TEXT NOT NULL DEFAULT '',
    "alertPhoneNumbers" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecuritySettings" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 30,
    "allowConcurrentSessions" BOOLEAN NOT NULL DEFAULT false,
    "maxSessionsPerUser" INTEGER NOT NULL DEFAULT 1,
    "minPasswordLength" INTEGER NOT NULL DEFAULT 8,
    "requireUppercase" BOOLEAN NOT NULL DEFAULT true,
    "requireNumbers" BOOLEAN NOT NULL DEFAULT true,
    "requireSpecialCharacters" BOOLEAN NOT NULL DEFAULT false,
    "passwordExpiryDays" INTEGER NOT NULL DEFAULT 90,
    "preventPasswordReuse" BOOLEAN NOT NULL DEFAULT true,
    "previousPasswordsToCheck" INTEGER NOT NULL DEFAULT 5,
    "enableTwoFactor" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorMethod" TEXT NOT NULL DEFAULT 'TOTP',
    "maxFailedLoginAttempts" INTEGER NOT NULL DEFAULT 5,
    "lockoutDurationMinutes" INTEGER NOT NULL DEFAULT 15,
    "requireIPWhitelist" BOOLEAN NOT NULL DEFAULT false,
    "allowedIPs" TEXT NOT NULL DEFAULT '',
    "logAllActions" BOOLEAN NOT NULL DEFAULT true,
    "retentionDays" INTEGER NOT NULL DEFAULT 90,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecuritySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupSettings" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "enableAutoBackup" BOOLEAN NOT NULL DEFAULT true,
    "backupFrequency" TEXT NOT NULL DEFAULT 'DAILY',
    "backupTime" TEXT NOT NULL DEFAULT '02:00',
    "backupDayOfWeek" INTEGER NOT NULL DEFAULT 1,
    "backupDayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "retentionDays" INTEGER NOT NULL DEFAULT 30,
    "maxBackupCount" INTEGER NOT NULL DEFAULT 10,
    "backupDestination" TEXT NOT NULL DEFAULT 'LOCAL',
    "cloudProvider" TEXT,
    "cloudBucketName" TEXT,
    "cloudAccessKey" TEXT,
    "cloudSecretKey" TEXT,
    "enableDatabaseExport" BOOLEAN NOT NULL DEFAULT true,
    "enableInvoiceExport" BOOLEAN NOT NULL DEFAULT true,
    "enableInventoryExport" BOOLEAN NOT NULL DEFAULT true,
    "enableFinancialExport" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackupSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptSettings" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "receiptWidth" TEXT NOT NULL DEFAULT '80MM',
    "useLogoOnReceipt" BOOLEAN NOT NULL DEFAULT true,
    "logoUrl" TEXT,
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
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiptSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesSettings" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "allowNegativeStock" BOOLEAN NOT NULL DEFAULT false,
    "warnLowStock" BOOLEAN NOT NULL DEFAULT true,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "autoReorderPoint" INTEGER NOT NULL DEFAULT 0,
    "priceRoundingMethod" TEXT NOT NULL DEFAULT 'NONE',
    "enableDiscountApproval" BOOLEAN NOT NULL DEFAULT false,
    "discountApprovalThreshold" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "maxDiscountPercent" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "receiptNumberingMethod" TEXT NOT NULL DEFAULT 'SEQUENTIAL',
    "nextReceiptNumber" INTEGER NOT NULL DEFAULT 1,
    "receiptNumberPrefix" TEXT,
    "requireApprovalForVoid" BOOLEAN NOT NULL DEFAULT true,
    "voidApprovalThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "allowOfflineVoid" BOOLEAN NOT NULL DEFAULT false,
    "enableManualDiscount" BOOLEAN NOT NULL DEFAULT true,
    "enableVolumeDiscount" BOOLEAN NOT NULL DEFAULT false,
    "enableLoyaltyDiscount" BOOLEAN NOT NULL DEFAULT false,
    "displayItemTotalOnScreen" BOOLEAN NOT NULL DEFAULT true,
    "displayRunningTotal" BOOLEAN NOT NULL DEFAULT true,
    "requireCustomerName" BOOLEAN NOT NULL DEFAULT false,
    "requireCustomerPhone" BOOLEAN NOT NULL DEFAULT false,
    "maxTransactionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minTransactionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationSettings" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "enableAPI" BOOLEAN NOT NULL DEFAULT false,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "apiWebhookUrl" TEXT,
    "apiWebhookSecret" TEXT,
    "enableWebhookOnSale" BOOLEAN NOT NULL DEFAULT false,
    "enableWebhookOnRefund" BOOLEAN NOT NULL DEFAULT false,
    "enableWebhookOnPayment" BOOLEAN NOT NULL DEFAULT false,
    "enableWebhookOnInventory" BOOLEAN NOT NULL DEFAULT false,
    "enableSMS" BOOLEAN NOT NULL DEFAULT false,
    "smsProvider" TEXT,
    "smsApiKey" TEXT,
    "smsApiSecret" TEXT,
    "smsSenderName" TEXT,
    "enableEmail" BOOLEAN NOT NULL DEFAULT false,
    "emailProvider" TEXT NOT NULL DEFAULT 'SMTP',
    "emailSmtpHost" TEXT,
    "emailSmtpPort" INTEGER NOT NULL DEFAULT 587,
    "emailSmtpUser" TEXT,
    "emailSmtpPassword" TEXT,
    "emailFromAddress" TEXT,
    "emailFromName" TEXT,
    "enableInventorySync" BOOLEAN NOT NULL DEFAULT false,
    "inventorySyncFrequency" TEXT NOT NULL DEFAULT 'HOURLY',
    "externalInventorySystem" TEXT,
    "inventorySyncUrl" TEXT,
    "inventorySyncApiKey" TEXT,
    "enableAccountingSync" BOOLEAN NOT NULL DEFAULT false,
    "accountingSystem" TEXT,
    "accountingSyncApiKey" TEXT,
    "accountingSyncFrequency" TEXT NOT NULL DEFAULT 'DAILY',
    "integratedServices" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethodSettings_merchantId_key" ON "PaymentMethodSettings"("merchantId");

-- CreateIndex
CREATE INDEX "PaymentMethodSettings_merchantId_idx" ON "PaymentMethodSettings"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "RefundPolicySettings_merchantId_key" ON "RefundPolicySettings"("merchantId");

-- CreateIndex
CREATE INDEX "RefundPolicySettings_merchantId_idx" ON "RefundPolicySettings"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftManagementSettings_merchantId_key" ON "ShiftManagementSettings"("merchantId");

-- CreateIndex
CREATE INDEX "ShiftManagementSettings_merchantId_idx" ON "ShiftManagementSettings"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSettings_merchantId_key" ON "NotificationSettings"("merchantId");

-- CreateIndex
CREATE INDEX "NotificationSettings_merchantId_idx" ON "NotificationSettings"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "SecuritySettings_merchantId_key" ON "SecuritySettings"("merchantId");

-- CreateIndex
CREATE INDEX "SecuritySettings_merchantId_idx" ON "SecuritySettings"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "BackupSettings_merchantId_key" ON "BackupSettings"("merchantId");

-- CreateIndex
CREATE INDEX "BackupSettings_merchantId_idx" ON "BackupSettings"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptSettings_merchantId_key" ON "ReceiptSettings"("merchantId");

-- CreateIndex
CREATE INDEX "ReceiptSettings_merchantId_idx" ON "ReceiptSettings"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesSettings_merchantId_key" ON "SalesSettings"("merchantId");

-- CreateIndex
CREATE INDEX "SalesSettings_merchantId_idx" ON "SalesSettings"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationSettings_merchantId_key" ON "IntegrationSettings"("merchantId");

-- CreateIndex
CREATE INDEX "IntegrationSettings_merchantId_idx" ON "IntegrationSettings"("merchantId");

-- AddForeignKey
ALTER TABLE "PaymentMethodSettings" ADD CONSTRAINT "PaymentMethodSettings_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundPolicySettings" ADD CONSTRAINT "RefundPolicySettings_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftManagementSettings" ADD CONSTRAINT "ShiftManagementSettings_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSettings" ADD CONSTRAINT "NotificationSettings_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecuritySettings" ADD CONSTRAINT "SecuritySettings_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackupSettings" ADD CONSTRAINT "BackupSettings_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptSettings" ADD CONSTRAINT "ReceiptSettings_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesSettings" ADD CONSTRAINT "SalesSettings_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationSettings" ADD CONSTRAINT "IntegrationSettings_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
