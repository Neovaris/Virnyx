# Admin Panel - Quick Reference Guide

## 🎓 How to Use the New Features

### View All Shifts

**Path:** Admin Panel → Shifts (left sidebar)

**What you'll see:**
- Table of all shifts by date (newest first)
- Columns: Cashier name, opened time, closed time, sales count, total revenue, status

**To filter shifts:**
1. Select **Status**: All, Open, or Closed
2. Enter **From Date**: When the shift started
3. Enter **To Date**: When the shift ended
4. Click **Reset** to clear all filters

**To see shift details:**
1. Click **Details** button on any shift row
2. A modal will appear showing:
   - Who was the cashier
   - When they opened/closed the shift
   - How much cash they opened with
   - How much cash they counted at close
   - All sales made during the shift
   - Any refunds processed
   - How they were paid (cash vs card vs mobile money)
   - Any notes added

**Cash Drawer Reconciliation:**
- **Opening Cash**: How much cash was in the drawer at opening
- **Cash Sales**: How much cash transactions totaled
- **Cash Refunds**: How much was refunded in cash
- **Expected Cash** = Opening Cash + Cash Sales - Cash Refunds
- **Closing Cash**: Actual cash counted at close
- **Difference**: If closing ≠ expected, this is highlighted in yellow ⚠️

---

### Check Cashier Performance

**Path:** Admin Panel → Cashiers

**What you'll see:**
- Grid cards of each cashier on your team
- By default sorted by who made the most money

**Metrics shown:**
- Name and email
- Total revenue (big green number)
- Total shifts worked
- Number of sales they made
- Average per transaction
- Total refunds they processed
- % of transactions that were refunded

**Sorting options:**
- **Revenue** (default) - Who made the most money
- **Sales** - Who processed the most transactions
- **Name** - Alphabetical by first name

**To see more details:**
1. Click on any cashier card
2. Click "View Shifts" to see all their shifts in the detailed shifts page

**Team Summary (bottom):**
- Total number of cashiers
- Combined revenue from all cashiers
- Total transactions across team
- Average revenue per cashier

---

### Dashboard Overview

**Path:** Admin Panel → Dashboard

**What you'll see at a glance (updated daily):**

**Today's Performance:**
- How many sales happened today
- How much revenue came in
- What was the average sale amount

**Monthly & Yearly Trends:**
- Sales and revenue for this month
- Sales and revenue for this year

**Inventory Status:**
- Total items you have in stock
- What all that inventory is worth (dollar value)
- How many items are low stock (warning level)
- How many items are completely out
  - Click "View inventory" to reorder

**Top Performers:**
- Your best cashiers ranked by revenue
- Shows how many sales and revenue for each

**Quick Links:**
- Fast buttons to Shifts, Sales, Inventory, and Cashiers

---

### Generate Reports

**Path:** Admin Panel → Reports

**Select a time period:**
- **Today** - Just today's numbers
- **Week** - Last 7 days
- **Month** - Last 30 days (or calendar month)
- **Year** - Last 12 months (or calendar year)

**Reports show:**
- Total number of sales in that period
- Total revenue in that period (in green)
- Average per transaction
- Number of sales

**Sales Summary section:**
- Detailed breakdown of:
  - Number of transactions
  - Revenue
  - Average value per sale

**Business Insights:**
- Contextual information based on time period selected

**Top Performing Cashiers:**
- Top 5 cashiers in the time period you selected
- Shows their sales count and revenue

**Export Reports (coming soon):**
- Download as CSV for spreadsheet
- Download as PDF for printing/sharing
- Email report automatically

---

## 🎯 Common Tasks

### Task: Find a Specific Shift

1. Go to **Shifts** page
2. Use date filters to narrow down:
   - If shift was yesterday: click From Date and select yesterday
   - If shift was last week: select From Date a week ago, To Date today
3. Scroll through table or use pagination
4. Click **Details** to verify it's the right shift

### Task: Check if a Cashier is Honest with Cash

1. Go to **Shifts** page
2. Filter Status = "CLOSED" to see only completed shifts
3. Click **Details** on one of their shifts
4. Look at **Cash Drawer** section:
   - If **Difference** is 0 or highlighted green → Perfect match ✅
   - If **Difference** is highlighted yellow → Cash shortage or overage ⚠️

### Task: Find Your Best Performer

1. Go to **Cashiers** page
2. Default shows by **Revenue** (best first)
3. Look at the top card
4. That's your top earner/most productive cashier

### Task: Compare This Month vs Last Month

1. Go to **Reports** page
2. Click **Month** tab
3. See this month's numbers
4. Mentally compare to what you remember from last month
5. (Future: will show visual comparison)

### Task: Export Sales Data

1. Go to **Reports** page
2. Select desired time period
3. Click **Export as CSV** (coming soon)
4. Open in Excel/Google Sheets for further analysis

### Task: Check Inventory Value

1. Go to **Dashboard**
2. Look at **Inventory** section (bottom of page)
3. See "**Inventory Value**" - that's how much your stock is worth
4. If concerned about low stock, click to **Inventory** page

---

## ⚙️ Settings & Permissions

**Who can access admin features?**
- Only users with **Admin or Manager role**
- Users must have **reports:read permission**

**If you don't see admin pages:**
1. Check your user role (should be Admin or Manager)
2. Ask your store owner to grant reports:read permission
3. Log out and log back in to refresh permissions

---

## 📊 Data Meanings

| Term | Meaning | Example |
|------|---------|---------|
| **Sales** | Number of transactions | 45 sales = 45 receipts printed |
| **Revenue** | Total money from sales | $3,765.00 = how much money came in |
| **Refunds** | Money given back to customers | $50 = customer returned items |
| **Payment Methods** | How customer paid | CASH, CARD, MOBILE MONEY |
| **Shift** | Period when a cashier works | 8am - 5pm Monday |
| **Closed Shift** | Shift is finished & reconciled | Cashier counted cash and closed |
| **Open Shift** | Shift still in progress | Cashier is currently working |
| **Difference** | Cash count discrepancy | $25 extra or $10 short |

---

## ❓ FAQ

**Q: Can I reopen a closed shift?**
A: Not currently, but this is in development

**Q: Can I see individual item sales?**
A: Go to Sales page to see transaction details

**Q: Can I see transaction history for a specific customer?**
A: This will be added in a future version

**Q: How often are metrics updated?**
A: Refresh the page to see latest data

**Q: Can I compare different time periods?**
A: Currently you can view them separately. Click between Today/Week/Month/Year to compare

**Q: What if cash doesn't match?**
A: Check the shift details. If the difference is significant, review the cashier's training or procedures

---

## 🔔 Alerts & Warnings

### Yellow Alert on Cash Drawer
- **Means:** The cash counted doesn't match expected amount
- **Action:** Review with cashier to find discrepancy
- **Common causes:**
  - Miscounted cash
  - Missed transaction
  - Refund not recorded
  - Manager gave cash to cashier during shift

### Low Stock Alert
- **Means:** Item is below reorder point
- **Action:** Go to Inventory and reorder
- **Next:** This will show auto-order suggestions

### High Refund Rate
- **Means:** Cashier is refunding many transactions (e.g., 5%+)
- **Action:** Review with cashier to ensure items are right quality
- **Next:** This will show automatic quality alerts

---

**For support or questions, contact your store owner or tech support.**

Last updated: March 13, 2026
