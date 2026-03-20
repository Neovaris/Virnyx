-- Add unique constraint to ReceiptTemplate
CREATE UNIQUE INDEX "ReceiptTemplate_merchantId_name_key" ON "ReceiptTemplate"("merchantId", "name");
