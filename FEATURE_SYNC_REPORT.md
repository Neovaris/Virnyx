# Feature Sync Report: Virnyx POS System
**Report Date:** March 15, 2026

## Executive Summary

This report analyzes feature synchronization across three integrated systems:
- **Terminal** (Flutter mobile/desktop POS app)
- **Backend** (Node.js/Fastify REST API)
- **Admin Panel** (Next.js management interface)

### Overall Status: ✅ WELL INTEGRATED
Most critical POS features are synchronized across all three systems, though some gaps exist in discounts/promotions and advanced reporting.

---

## 1. SALES & TRANSACTIONS

### Terminal (Flutter)
**Model/Screen:**
- `SalesApi` - Sales creation with offline support
- `CartController` - Cart state management
- `PaymentScreen` - Payment method selection & processing
- `SalesHistoryScreen` - View completed transactions
- **Features:**
  - ✅ Create sale with items, discounts, tax
  - ✅ Multiple payment methods (Cash, Card, MobileMoney)
  - ✅ Offline queuing with sync service
  - ✅ Receipt printing
  - ✅ Sales history/lookup

### Backend (Node.js)
**Module:** `sales`
**Routes:**
- `POST /sales` - Create sale (requires OPEN shift)
- `GET /sales` - List sales with pagination
- `GET /sales/:id` - Get sale details
- `PATCH /sales/:id` - Update sale status
- `GET /reports/sales` - Daily sales report
- **Features:**
  - ✅ Idempotency via `clientTxnId` (prevents duplicates)
  - ✅ Inventory decrement on sale
  - ✅ Payment method tracking
  - ✅ Sale status: COMPLETED, VOIDED, HELD
  - ✅ Receipt number generation

### Admin Panel (Next.js)
**Pages:**
- `/sales` - Sales list with date/status filters
- `/dashboard` - Daily sales overview
- `Sales details` - Receipt view with refund options
- **Features:**
  - ✅ Filter sales by date and status
  - ✅ Client-side receipt search
  - ✅ Link to refund functionality
  - ✅ Sales totals with breakdown by payment method

### Sync Status: ✅ COMPLETE
- All three systems handle basic sales flow
- Backend enforces shift requirement (guards against off-shift sales)
- Terminal properly queues offline sales
- Admin provides view-only access with refund workflow

**Potential Issues:**
- None identified

---

## 2. CART & CHECKOUT

### Terminal (Flutter)
**Models:**
- `CartState` - Cart line items, adjustments, discounts
- `CartLine` - Individual product in cart with qty/price
- `CartAdjustment` - Discount/promo with code tracking
- **Features:**
  - ✅ Add/remove items from cart
  - ✅ Adjust quantities
  - ✅ Apply line-level or total discounts
  - ✅ Tax calculations
  - ✅ Cart persistence in Riverpod state
  - ✅ Hold/park sales support

### Backend (Node.js)
**Integration in:**
- `sales.routes.ts` - Items array (productId, qty, price override)
- Payment handling alongside sale
- **Features:**
  - ✅ Item validation (product exists, price valid)
  - ✅ Line total calculation
  - ✅ Discount validation (>=0)
  - ✅ Tax calculation

### Admin Panel (Next.js)
- No cart UI (management tool, not POS)
- ✅ Can view items in completed sales receipts

### Sync Status: ✅ COMPLETE
- Terminal handles complex cart logic
- Backend validates items and calculations
- Both agree on structure: items array with productId, qty, optional price override

---

## 3. PRODUCTS & CATALOG

### Terminal (Flutter)
**API:**
- `ProductsApi.list()` - Fetches products (limit 200 for caching)
- **Models:**
  - `CatalogProduct` - Product in catalog
  - `CatalogState` - Cached product list
- **Features:**
  - ✅ Product search (local and API)
  - ✅ Category filtering
  - ✅ Product grid display
  - ✅ Barcode search

### Backend (Node.js)
**Module:** `products`
**Routes:**
- `POST /products` - Create product
- `GET /products` - List with search, sort, pagination
- `GET /products/:id` - Get one
- `PATCH /products/:id` - Update
- `DELETE /products/:id` - Soft delete (isDeleted flag)
- **Features:**
  - ✅ SKU & barcode unique per merchant
  - ✅ Search by name, SKU, barcode
  - ✅ Price tracking
  - ✅ Created/updated timestamps

### Admin Panel (Next.js)
**Page:** `/products`
- **Features:**
  - ✅ Create product (name, price, SKU, barcode)
  - ✅ List with pagination & search
  - ✅ Edit product
  - ✅ Sort by name, price, date
  - ✅ Delete (soft delete)

### Sync Status: ✅ COMPLETE
- All three systems share same product model
- Backend enforcement of SKU/barcode uniqueness per merchant
- Terminal can search and display all products
- Admin can manage product master data

**Notes:**
- Inventory rows auto-created on product creation (ensures no null safety issues)

---

## 4. INVENTORY MANAGEMENT

### Terminal (Flutter)
**Provider:**
- `InventoryController` - Manages stock levels
- `InventoryItem` - Single product stock
- **Features:**
  - ✅ Load inventory on app startup
  - ✅ Check stock availability (before checkout)
  - ✅ Low stock detection
  - ✅ Out of stock checks

### Backend (Node.js)
**Module:** `inventory`
**Routes:**
- `GET /inventory` - List inventory with search, pagination, low stock filter
- `POST /inventory/adjust` - Manual stock adjustment
- `POST /inventory/restock-items` - Bulk restock (purchase orders)
- `POST /inventory/count` - Inventory count/reconciliation
- `GET /inventory/ledger` - Stock movement history
- **Models:**
  - `Inventory` - Current stock per product per store
  - `StockLedger` - Audit trail (IN, OUT, ADJUST)
- **Features:**
  - ✅ Atomic inventory decrement on sale (prevents oversell)
  - ✅ Stock ledger tracking (reference, note, createdBy)
  - ✅ Auto-restock on refund (configurable)
  - ✅ Low stock threshold warnings

### Admin Panel (Next.js)
**Page:** `/inventory`
- **Features:**
  - ✅ List inventory with QoH, reserved, available
  - ✅ Search products
  - ✅ Filter low stock items
  - ✅ Manual adjust (IN/OUT/ADJUST modes)
  - ✅ View stock ledger history
  - ✅ Restock entry

### Sync Status: ✅ COMPLETE
- Terminal reads stock, backend enforces atomically
- Admin can audit and adjust stock
- Ledger provides full history
- Refund auto-restock is configurable

**Integration Details:**
- Sale creation decrements inventory atomically (prevents race conditions)
- Refund auto-restocks by default (per settings)
- Manual adjustments logged with reference and notes

---

## 5. PAYMENT PROCESSING

### Terminal (Flutter)
**Models:**
- `PaymentMethod` enum: CASH, CARD, MOMO, SPLIT
- `PaymentScreen` - Renders to input tender, calculate change
- **Features:**
  - ✅ Multiple payment methods
  - ✅ Split payments (implied by UI structure)
  - ✅ Tendered/change calculation
  - ✅ Reference tracking (phone, order ref, etc.)

### Backend (Node.js)
**In Sales Module:**
- Payment array in sale (method, amount, reference)
- Payment model separate for detailed tracking
- **Features:**
  - ✅ Payment method validation (CASH, CARD, MOMO, SPLIT)
  - ✅ Amount tracking per method
  - ✅ Reference field (for provider transaction IDs)
  - ✅ Payment breakdown in reports

### Admin Panel (Next.js)
**Dashboard:**
- ✅ Payment breakdown by method (chart)
- ✅ Payment method analytics
- `/reports` - Payment method performance

### Sync Status: ✅ COMPLETE
- Payment methods consistent across all systems
- Backend validates, stores reference
- Terminal properly formats data
- Admin can report on payment mix

**Potential Enhancement:** Advanced payment processor integration (Stripe, Paystack) could be added via settings.

---

## 6. REFUNDS

### Terminal (Flutter)
**Feature:**
- ✅ Not directly exposed (mobile POS limitation)
- Refund request/history visible but creation handled by admin

### Backend (Node.js)
**Module:** `refunds`
**Routes:**
- `GET /sales/:id/refundable-items` - Items available to refund
- `POST /sales/:id/refunds` - Create refund
- `GET /refunds` - List refunds
- **Features:**
  - ✅ Partial item refunds
  - ✅ Refund reason tracking
  - ✅ Optional auto-restock
  - ✅ Shift session linking
  - ✅ Strict: requires OPEN shift
  - ✅ Full audit trail

### Admin Panel (Next.js)
**Page:** `/refunds`
- **Features:**
  - ✅ Search sales by receipt or date
  - ✅ Show refundable items
  - ✅ Create refund with selected items
  - ✅ Refund reason/note
  - ✅ View refund history

### Sync Status: ✅ COMPLETE
- Terminal doesn't create refunds (admin/manager only)
- Backend enforces refund rules (OPEN shift, sale status)
- Admin provides full refund workflow
- Inventory auto-restocks on refund (default true, configurable)

**Notes:**
- Refund window configurable in settings (default 30 days)
- Optional approval workflows can be added via RefundPolicySettings

---

## 7. SHIFTS & SESSIONS

### Terminal (Flutter)
**API:**
- `ShiftApi.openShift()` - Open shift with opening cash
- `ShiftApi.getActiveShift()` - Get current shift
- `ShiftApi.getShiftSummary()` - Daily close summary
- **Screens:**
  - `OpenShiftScreen` - Open shift
  - `ShiftCloseSummaryScreen` - Close shift with variance calculation
- **Features:**
  - ✅ Opening cash tracking
  - ✅ Shift summary (sales, refunds, payments by method)
  - ✅ Closing cash reconciliation
  - ✅ Variance calculation
  - ✅ Shift notes

### Backend (Node.js)
**Module:** `sessions`
**Routes:**
- `POST /sessions/open` - Open shift (cashier tied)
- `GET /sessions/active` - Current shift
- `GET /sessions/history` - Shift list with pagination/date filter
- `GET /sessions/:id` - Shift summary with sales breakdown
- `POST /sessions/:id/close` - Close shift (validate variance)
- **Features:**
  - ✅ 1 OPEN shift per cashier per store
  - ✅ Opening/closing cash tracking
  - ✅ Expected cash vs. closing cash variance
  - ✅ Tied to all sales/refunds
  - ✅ Shift status: OPEN, CLOSED

### Admin Panel (Next.js)
**Page:** `/shifts`
- **Features:**
  - ✅ List shifts with filters (status, date range)
  - ✅ View shift summary
  - ✅ Opening/closing cash
  - ✅ Variance tracking

### Sync Status: ✅ COMPLETE
- Terminal enforces shift requirement before sales
- Backend validates OPEN status on transaction creation
- Admin can audit all shifts

**Guard Mechanism:**
- Sales/refunds require active OPEN shift (enforced in backend)
- Prevents off-shift transactions

---

## 8. USER MANAGEMENT

### Terminal (Flutter)
**Model:**
- `UserData` - Current user info (id, email, roles)
- **Features:**
  - ✅ Login with email/password
  - ✅ Session token management
  - ✅ User display in shift summary

### Backend (Node.js)
**Module:** `users`
**Routes:**
- `POST /users` - Create user (cashier/staff)
- `GET /users` - List users with search
- `GET /users/:id` - Get one
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Soft delete
- `PATCH /users/:id/roles` - Assign roles
- **Features:**
  - ✅ Email unique per merchant
  - ✅ Password hashing (bcrypt)
  - ✅ Store assignment
  - ✅ Status tracking (active/disabled)
  - ✅ Last login timestamp

### Admin Panel (Next.js)
**Page:** `/users`
- **Features:**
  - ✅ Create user
  - ✅ Edit user (name, email, phone, password)
  - ✅ Assign roles
  - ✅ Disable/enable user
  - ✅ View last login time
  - ✅ Search and filter

### Sync Status: ✅ COMPLETE
- Backend enforces email uniqueness
- Terminal uses credentials for login
- Admin manages all users
- Role assignments integrated

---

## 9. ROLES & PERMISSIONS

### Terminal (Flutter)
**Display:**
- ✅ User roles shown in profile
- Permissions enforced server-side

### Backend (Node.js)
**Modules:** `roles`, plus `requirePermission` middleware
**Routes:**
- `GET /roles` - List roles with permissions
- `POST /roles` - Create role
- `PATCH /roles/:id` - Update role
- `GET /roles/:id/permissions` - Get permissions
- **Middleware:**
  - `requirePermission("sales:write")` - API endpoint protection
  - `requirePermission("inventory:read")` - Feature-level access
- **Permissions:** (examples)
  - sales:read, sales:write
  - inventory:read, inventory:adjust
  - products:read, products:write
  - refunds:read, refunds:write
  - users:read, users:write
  - settings:read, settings:write
  - reports:read

### Admin Panel (Next.js)
**Component:**
- `UserRoleEditor` - Role assignment UI
- **Features:**
  - ✅ Assign multiple roles to user
  - ✅ Role-based access to pages (Guard component)

### Sync Status: ✅ COMPLETE
- Backend enforces permissions
- Frontend respects access levels
- Roles tied to resources (sales, inventory, users, etc.)

**Notes:**
- Permissions are resource:action (read/write)
- Evaluated at API middleware level
- Admin can view/manage roles

---

## 10. SETTINGS & CONFIGURATION

### Terminal (Flutter)
**State:**
- `MerchantSettings` - Merchant-level config
- `MerchantSettingsProvider` - Caches settings
- **Accessible:**
  - Tax settings
  - Receipt footer
  - Currency/timezone

### Backend (Node.js)
**Module:** `settings`
**Routes:**
- `GET /settings/merchant` - Read merchant settings
- `PATCH /settings/merchant` - Update basic settings
- Advanced settings endpoints for:
  - `/settings/payment` - Payment method toggles, surcharges
  - `/settings/refunds` - Refund policy
  - `/settings/shifts` - Shift management rules
  - `/settings/notifications` - Alert configuration
  - `/settings/security` - System security
  - `/settings/backup` - Backup settings
  - `/settings/receipt` - Receipt formatting
  - `/settings/sales` - Sales behavior
  - `/settings/integration` - 3rd-party integrations

**Models:**
- `Merchant` - Basic settings (currency, timezone, tax)
- `PaymentMethodSettings` - Payment processors, surcharges
- `RefundPolicySettings` - Refund windows, approvals
- `ShiftManagementSettings` - Variance tolerance, auto-close times
- `NotificationSettings` - Alert recipients, channels
- `SecuritySettings` - (additional fields visible in schema)
- `BackupSettings` - Backup frequency, retention
- `ReceiptSettings` - Format, footer, printer config
- `SalesSettings` - Rounding, holds, discounts
- `IntegrationSettings` - 3rd-party API keys

### Admin Panel (Next.js)
**Page:** `/settings`
- Visible in code structure but content not shown
- **Expected Features:**
  - ✅ Merchant info (name, currency, timezone)
  - ✅ Tax settings
  - ✅ Receipt configuration
  - ✅ Payment method setup

### Sync Status: ⚠️ PARTIAL
- Basic merchant settings synced
- Advanced settings modeled in backend
- Admin panel may not expose all settings (needs verification)

**Gap:** Settings UI in admin-panel appears minimal. Terminal may not load all advanced settings.

---

## 11. REPORTS & ANALYTICS

### Terminal (Flutter)
**Reports:**
- ✅ Daily shift summary (sales totals, payment breakdown)
- ✅ Hourly sales buckets for shift close
- ✅ Top products by revenue

### Backend (Node.js)
**Module:** `reports`
**Routes:**
- `GET /reports/daily` - Z-report: daily sales, refunds, payment breakdown, top products
- `GET /reports/sales` - Hourly breakdown
- `GET /reports/cashiers` - Cashier performance
- `GET /reports/refunds` - Refund report
- `GET /reports/inventory` - Stock status
- **Features:**
  - ✅ Date filtering
  - ✅ Payment method breakdown
  - ✅ Cashier productivity
  - ✅ Product popularity
  - ✅ Refund summaries
  - ✅ Low stock alerts

### Admin Panel (Next.js)
**Pages:**
- `/dashboard` - KPIs: today vs yesterday, sales trends, top cashiers
- `/reports` - Comprehensive analytics (date range selector, metric cards)
- Embedded in other pages (sales, refunds, inventory)
- **Features:**
  - ✅ Daily/monthly/yearly metrics
  - ✅ Revenue, transaction counts
  - ✅ Cashier rankings
  - ✅ Payment method mix
  - ✅ Inventory value & low stock

### Sync Status: ✅ COMPLETE
- Backend provides rich reporting API
- Terminal uses daily report for shift close
- Admin displays comprehensive analytics

---

## 12. OFFLINE SUPPORT & SYNC

### Terminal (Flutter)
**Services:**
- `OfflineSyncService` - Queues transactions offline
- `OfflineDb` - Local SQLite storage
- `OfflineDetector` - Connectivity awareness
- `QueuedSale` models
- **Features:**
  - ✅ Queue sales when offline
  - ✅ Queue refunds when offline
  - ✅ Sync when reconnected
  - ✅ Idempotency key tracking
  - ✅ Retry logic

### Backend (Node.js)
**Integration:**
- `clientTxnId` in sale creation for idempotency
- Merged with duplicate detection
- **Features:**
  - ✅ Prevents duplicate sales on reconnect
  - ✅ Retur existing sale if idempotent key matches

### Admin Panel (Next.js)
- No offline support (web-based)

### Sync Status: ✅ COMPLETE
- Terminal robustly handles offline scenarios
- Backend supports idempotent re-submission
- Queued sales eventually sync on reconnect

---

## 13. RECEIPTS

### Terminal (Flutter)
**Services:**
- `ReceiptPrintService` - Prints to thermal printer or writes to file
- **Features:**
  - ✅ Thermal printer support
  - ✅ Receipt formatting with merchant/store info
  - ✅ Item listing with totals
  - ✅ Payment breakdown
  - ✅ Shift session info

### Backend (Node.js)
**Module:** `receipts`
**Routes:**
- `GET /receipts/:saleId` - Retrieve receipt data with full context
- **Features:**
  - ✅ Complete sale + items + payments
  - ✅ Refund history
  - ✅ Store/merchant metadata
  - ✅ Cashier info (if captured)

### Admin Panel (Next.js)
**In Sales Page:**
- ✅ View receipt data
- ✅ Link to refund screens

### Sync Status: ✅ COMPLETE
- Terminal generates receipts with item and payment details
- Backend provides API for receipt data
- Admin can view receipt details

---

## 14. DISCOUNTS & PROMOTIONS

### Terminal (Flutter)
**Model:**
- `CartAdjustment` - Discount with promo code, amount, label
- **Features:**
  - ✅ Line-item discounts
  - ✅ Cart-level discounts
  - ✅ Promo code tracking
  - ✅ Discount notes

### Backend (Node.js)
**Integration:**
- Discount field in Sale
- No dedicated discount rule engine
- **Features:**
  - ✅ Discount amount stored with sale
  - ✅ Discount not automatically calculated (manual input from terminal)

### Admin Panel (Next.js)
- ✅ View discount on receipts
- No discount configuration or rule management

### Sync Status: ⚠️ GAPS DETECTED
**Gaps:**
- ❌ No promo code validation on backend
- ❌ No discount rule engine (buy-1-get-1, percentage off, etc.)
- ❌ No automatic discount application
- ❌ Discount management UI missing from admin
- ❌ No discount audit trail

**Recommendation:** Implement:
1. `DiscountRule` model in backend (active, type, condition, value)
2. Discount validation API endpoint
3. Discount rule admin UI
4. Automatic application in terminal (optional)

---

## 15. MULTI-STORE SUPPORT

### Terminal (Flutter)
**Model:**
- User tied to store (storeId)
- All transactions scoped to user's store
- **Features:**
  - ✅ Store display in UI
  - ✅ Inventory per store
  - ✅ Shift per store

### Backend (Node.js)
**Design:**
- Merchant has many stores
- All tables include storeId
- User can be assigned to store (nullable)
- **Features:**
  - ✅ Data isolation per store
  - ✅ Cross-store reporting available to managers

### Admin Panel (Next.js)
- ✅ Multi-store user management
- ✅ Reports scoped to user's store
- Admin users can see across stores

### Sync Status: ✅ COMPLETE
- All systems support multi-store
- Data properly scoped
- Users confined to store unless elevated

---

## 16. DATA MODELS COMPARISON

| Feature | Terminal | Backend | Admin |
|---------|----------|---------|-------|
| Sale | SalesApi | Sale, SaleItem, Payment | ✅ View |
| Product | CatalogProduct | Product | ✅ CRUD |
| Inventory | InventoryItem | Inventory, StockLedger | ✅ View, Adjust |
| User | UserData | User, UserRole | ✅ CRUD |
| Role | (display only) | Role, Permission | ✅ View/Assign |
| Shift | OpenedShift | ShiftSession | ✅ View |
| Refund | (request only) | Refund, RefundItem | ✅ Create |
| Receipt | Receipt model | (via sale) | ✅ View |
| Settings | MerchantSettings | 9+ settings models | ⚠️ Partial |
| StockLedger | (internal) | StockLedger | ✅ View |

---

## ISSUES & GAPS SUMMARY

### 🔴 High Priority
1. **Discount Rule Engine Missing** - No backend validation of promo codes or automatic discounts
   - **Impact:** Discounts are manual only, no enforcement
   - **Recommendation:** Add DiscountRule model, validation endpoint, calculate endpoint

2. **Settings UI Incomplete** - Admin panel may not expose all advanced settings
   - **Impact:** Cannot configure payment processors, refund policies, notifications
   - **Recommendation:** Complete `/settings` page with forms for all setting models

### 🟡 Medium Priority
3. **Refund Approval Workflow** - Backend models support approval rules, but not implemented
   - **Impact:** Refunds auto-approved, no manager sign-off
   - **Recommendation:** Add approval state, notification routing, manager review UI

4. **Shift Variance Tolerance** - Models support configurable variance, needs admin UI
   - **Impact:** Cannot set acceptance criteria for cash discrepancies
   - **Recommendation:** Add shift settings form to admin

### 🟢 Low Priority
5. **Receipt Customization** - Settings allow custom footer/prefix, but admin UI minimal
   - **Impact:** Limited receipt branding
   - **Recommendation:** Enhance receipt settings UI

---

## API ENDPOINT SUMMARY

### Backend Routes by Module

| Module | Endpoints | Count |
|--------|-----------|-------|
| Auth | login, register, me | 3 |
| Sales | create, list, get, update, search | 5+ |
| Products | CRUD, list | 5 |
| Inventory | list, adjust, restock, count, ledger | 5+ |
| Refunds | list, create, get refundable items | 3+ |
| Sessions | open, active, history, close, summary | 5+ |
| Reports | daily, sales, cashiers, refunds, inventory, hourly | 6+ |
| Users | CRUD, list, roles | 5+ |
| Roles | list, CRUD, permissions | 4+ |
| Settings | merchant, payment, refunds, shifts, notifications, security, backup, receipt, sales, integration | 10+ |
| Receipts | reprint | 1 |
| **TOTAL** | | **~52+ endpoints** |

---

## RECOMMENDATIONS

### Immediate (Next Sprint)
1. ✅ Complete discount rule engine
2. ✅ Finish settings admin UI
3. ✅ Add refund approval workflow

### Short Term (2-3 Sprints)
1. ✅ Implement shift variance tolerance rules
2. ✅ Add receipt customization UI
3. ✅ Enhance reporting (more date ranges, export)

### Long Term (Future)
1. ✅ Payment processor integrations (Stripe, Paystack)
2. ✅ Loyalty program
3. ✅ Customer management
4. ✅ Advanced inventory (reorder points, suppliers)

---

## CONCLUSION

The Virnyx POS system has a **solid foundation** with well-structured backend APIs, a feature-rich Flutter terminal app, and a functional admin panel. Most core POS features are properly synchronized across all three systems:

- ✅ Sales & transactions
- ✅ Inventory management  
- ✅ Shift & session management
- ✅ User & role management
- ✅ Product catalog
- ✅ Refunds (basic workflow)
- ✅ Reports & analytics
- ✅ Offline support

**Key gaps to address:**
- Discount/promotion rule engine
- Advanced settings UI
- Approval workflows
- Some configuration features partially implemented

The architecture is scalable and properly enforces business rules at the API level (offline sync, inventory atomicity, shift requirements, etc.).
