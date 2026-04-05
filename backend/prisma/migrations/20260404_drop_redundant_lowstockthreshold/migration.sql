-- Drop redundant lowStockThreshold columns from NotificationSettings and SalesSettings.
-- Store.lowStockThreshold is the single source of truth used by reports and inventory checks.
ALTER TABLE "NotificationSettings" DROP COLUMN IF EXISTS "lowStockThreshold";
ALTER TABLE "SalesSettings" DROP COLUMN IF EXISTS "lowStockThreshold";
