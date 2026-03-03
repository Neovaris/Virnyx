"use client";

import { useEffect, useState } from "react";
import Guard from "@/components/admin/Guard";

type Merchant = {
  id: string;
  name: string;
  country: string | null;
  currency: string | null;
  timezone: string | null;
  receiptFooter: string | null;
  taxEnabled: boolean;
  taxRate: number;
  pricesIncludeTax: boolean;
};
type Store = {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  lowStockThreshold: number;
  receiptPrefix: string | null;
  openingCashDefault: number;
};
type PaymentMethods = {
  id: string;
  enableCash: boolean;
  enableCard: boolean;
  enableMobileMoney: boolean;
  enableCheck: boolean;
  enableBankTransfer: boolean;
  cardSurchargePercent: number;
  mobileMoneysSurchargePercent: number;
  checkProcessingFee: number;
  bankTransferFee: number;
};
type RefundPolicy = {
  id: string;
  refundWindowDays: number;
  maxRefundPercentage: number;
  requireApprovalAboveAmount: number;
  requireManagerApproval: boolean;
  requireAdminApproval: boolean;
  autoRestockItems: boolean;
  restockFeePercent: number;
  minRefundAmount: number;
  maxRefundsPerDay: number;
  printRefundReceipt: boolean;
  refundReceiptPrefix: string;
};
type ShiftManagement = {
  id: string;
  autoCloseTime: string | null;
  allowLateCloseMinutes: number;
  requireOpeningCash: boolean;
  requireClosingBalance: boolean;
  varianceTolerancePercent: number;
  toleranceAmount: number;
  requireApprovalForVariance: boolean;
  varianceApprovalThreshold: number;
  requireApprovalForOvertime: boolean;
  overtimeThresholdMinutes: number;
  maxShiftDurationMinutes: number;
  minBreakTimeMinutes: number;
};
type Notifications = {
  id: string;
  sendLowStockAlerts: boolean;
  lowStockThreshold: number;
  sendOutOfStockAlerts: boolean;
  enableEndOfDayReport: boolean;
  endOfDayReportTime: string;
  enableHighValueSaleAlert: boolean;
  highValueThreshold: number;
  enableUnusualTransactionAlert: boolean;
  enableErrorNotifications: boolean;
  enableRefundAlerts: boolean;
  notifyViaEmail: boolean;
  notifyViaSMS: boolean;
  notifyViaInApp: boolean;
  alertEmails: string;
  alertPhoneNumbers: string;
};
type Security = {
  id: string;
  sessionTimeoutMinutes: number;
  allowConcurrentSessions: boolean;
  maxSessionsPerUser: number;
  minPasswordLength: number;
  requireUppercase: boolean;
  requireNumbers: boolean;
  requireSpecialCharacters: boolean;
  passwordExpiryDays: number;
  preventPasswordReuse: boolean;
  previousPasswordsToCheck: number;
  enableTwoFactor: boolean;
  twoFactorMethod: string;
  maxFailedLoginAttempts: number;
  lockoutDurationMinutes: number;
  requireIPWhitelist: boolean;
  allowedIPs: string;
  logAllActions: boolean;
  retentionDays: number;
};
type Backup = {
  id: string;
  enableAutoBackup: boolean;
  backupFrequency: string;
  backupTime: string;
  backupDayOfWeek: number;
  backupDayOfMonth: number;
  retentionDays: number;
  maxBackupCount: number;
  backupDestination: string;
  cloudProvider: string | null;
  cloudBucketName: string | null;
  enableDatabaseExport: boolean;
  enableInvoiceExport: boolean;
  enableInventoryExport: boolean;
  enableFinancialExport: boolean;
};
type Receipt = {
  id: string;
  receiptWidth: string;
  useLogoOnReceipt: boolean;
  logoUrl: string | null;
  customHeader: string | null;
  customFooter: string | null;
  displayLogo: boolean;
  displayMerchantName: boolean;
  displayStoreName: boolean;
  displayTaxId: boolean;
  displayCashierName: boolean;
  displayReceiptNumber: boolean;
  displayTimestamp: boolean;
  showProductSKU: boolean;
  showProductDescription: boolean;
  showUnitPrice: boolean;
  showQuantity: boolean;
  showLineTotal: boolean;
  displaySubtotal: boolean;
  displayTaxBreakdown: boolean;
  displayTotal: boolean;
  displayChangeDue: boolean;
  showPaymentMethod: boolean;
  showPaymentReference: boolean;
  printerType: string;
  printBarcode: boolean;
  printQRCode: boolean;
  enableEmailReceipt: boolean;
  enableSMSReceipt: boolean;
};
type Sales = {
  id: string;
  allowNegativeStock: boolean;
  warnLowStock: boolean;
  lowStockThreshold: number;
  autoReorderPoint: number;
  priceRoundingMethod: string;
  enableDiscountApproval: boolean;
  discountApprovalThreshold: number;
  maxDiscountPercent: number;
  receiptNumberingMethod: string;
  nextReceiptNumber: number;
  receiptNumberPrefix: string | null;
  requireApprovalForVoid: boolean;
  voidApprovalThreshold: number;
  allowOfflineVoid: boolean;
  enableManualDiscount: boolean;
  enableVolumeDiscount: boolean;
  enableLoyaltyDiscount: boolean;
  displayItemTotalOnScreen: boolean;
  displayRunningTotal: boolean;
  requireCustomerName: boolean;
  requireCustomerPhone: boolean;
  maxTransactionAmount: number;
  minTransactionAmount: number;
};
type Integration = {
  id: string;
  enableAPI: boolean;
  apiKey: string | null;
  apiSecret: string | null;
  enableWebhookOnSale: boolean;
  enableWebhookOnRefund: boolean;
  enableWebhookOnPayment: boolean;
  enableWebhookOnInventory: boolean;
  enableSMS: boolean;
  smsProvider: string | null;
  enableEmail: boolean;
  emailProvider: string;
  enableInventorySync: boolean;
  inventorySyncFrequency: string;
  enableAccountingSync: boolean;
  accountingSystem: string | null;
  integratedServices: string;
};
type Tax = { taxEnabled: boolean; taxRate: number; pricesIncludeTax: boolean };

const num = (v: any, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};

export default function SettingsPage() {
  const [tab, setTab] = useState("basic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [tax, setTax] = useState<Tax | null>(null);
  const [pm, setPM] = useState<PaymentMethods | null>(null);
  const [rp, setRP] = useState<RefundPolicy | null>(null);
  const [sm, setSM] = useState<ShiftManagement | null>(null);
  const [nt, setNT] = useState<Notifications | null>(null);
  const [sec, setSEC] = useState<Security | null>(null);
  const [bak, setBAK] = useState<Backup | null>(null);
  const [rec, setREC] = useState<Receipt | null>(null);
  const [sal, setSAL] = useState<Sales | null>(null);
  const [intg, setINT] = useState<Integration | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await Promise.all([
        fetch("/api/settings/merchant", { cache: "no-store" }),
        fetch("/api/settings/store", { cache: "no-store" }),
        fetch("/api/settings/tax", { cache: "no-store" }),
        fetch("/api/settings/payment-methods", { cache: "no-store" }),
        fetch("/api/settings/refund-policy", { cache: "no-store" }),
        fetch("/api/settings/shift-management", { cache: "no-store" }),
        fetch("/api/settings/notifications", { cache: "no-store" }),
        fetch("/api/settings/security", { cache: "no-store" }),
        fetch("/api/settings/backup", { cache: "no-store" }),
        fetch("/api/settings/receipt", { cache: "no-store" }),
        fetch("/api/settings/sales", { cache: "no-store" }),
        fetch("/api/settings/integration", { cache: "no-store" }),
      ]);

      const data = await Promise.all(res.map((r) => r.json().catch(() => ({}))));
      setMerchant(data[0].merchant ?? null);
      setStore(data[1].store ?? null);
      setTax(data[2].tax ?? null);
      setPM(data[3].paymentMethods ?? null);
      setRP(data[4].refundPolicy ?? null);
      setSM(data[5].shiftManagement ?? null);
      setNT(data[6].notifications ?? null);
      setSEC(data[7].security ?? null);
      setBAK(data[8].backup ?? null);
      setREC(data[9].receipt ?? null);
      setSAL(data[10].sales ?? null);
      setINT(data[11].integration ?? null);
    } catch (e: any) {
      setErr(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (endpoint: string, data: any, key: string, setter: any) => {
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/settings/${endpoint}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || "Save failed");
      setter(body[key] ?? null);
      setMsg("Saved ✅");
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-slate-400">Loading...</div>;

  return (
    <Guard perm="settings:read">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <div className="text-sm text-slate-400">POS Configuration</div>
          </div>
          <button
            onClick={load}
            className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm hover:bg-slate-900/60"
          >
            Refresh
          </button>
        </div>

        {err && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        )}
        {msg && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {msg}
          </div>
        )}

        <div className="flex gap-2 border-b border-slate-800 pb-4 overflow-x-auto">
          {[
            { k: "basic", n: "Basic" },
            { k: "store", n: "Store" },
            { k: "tax", n: "Tax" },
            { k: "payment-methods", n: "Payment" },
            { k: "refund-policy", n: "Refund" },
            { k: "shift-management", n: "Shift" },
            { k: "notifications", n: "Alerts" },
            { k: "security", n: "Security" },
            { k: "backup", n: "Backup" },
            { k: "receipt", n: "Receipt" },
            { k: "sales", n: "Sales" },
            { k: "integration", n: "Integration" },
          ].map(({ k, n }) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={[
                "px-3 py-2 text-sm rounded-lg whitespace-nowrap",
                tab === k
                  ? "bg-indigo-500/20 text-indigo-200 border-b-2 border-indigo-500"
                  : "text-slate-400 hover:text-slate-300",
              ].join(" ")}
            >
              {n}
            </button>
          ))}
        </div>

        {tab === "basic" && merchant && (
          <Sec
            title="Merchant"
            onSave={() => save("merchant", merchant, "merchant", setMerchant)}
            saving={saving}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Business name">
                <Input
                  value={merchant.name}
                  onChange={(e: string) => setMerchant({ ...merchant, name: e })}
                />
              </Field>
              <Field label="Country">
                <Input
                  value={merchant.country || ""}
                  onChange={(e: string) =>
                    setMerchant({ ...merchant, country: e || null })
                  }
                />
              </Field>
              <Field label="Currency">
                <Input
                  value={merchant.currency || ""}
                  onChange={(e: string) =>
                    setMerchant({ ...merchant, currency: e || null })
                  }
                />
              </Field>
              <Field label="Timezone">
                <Input
                  value={merchant.timezone || ""}
                  onChange={(e: string) =>
                    setMerchant({ ...merchant, timezone: e || null })
                  }
                />
              </Field>
            </div>
          </Sec>
        )}

        {tab === "store" && store && (
          <Sec title="Store" onSave={() => save("store", store, "store", setStore)} saving={saving}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Store name">
                <Input value={store.name} onChange={(e: string) => setStore({ ...store, name: e })} />
              </Field>
              <Field label="Code">
                <Input value={store.code || ""} onChange={(e: string) => setStore({ ...store, code: e || null })} />
              </Field>
              <Field label="Phone">
                <Input value={store.phone || ""} onChange={(e: string) => setStore({ ...store, phone: e || null })} />
              </Field>
              <Field label="Receipt prefix">
                <Input
                  value={store.receiptPrefix || ""}
                  onChange={(e: string) => setStore({ ...store, receiptPrefix: e || null })}
                />
              </Field>
              <Field label="Low stock threshold">
                <Input
                  type="number"
                  value={store.lowStockThreshold}
                  onChange={(e: string) =>
                    setStore({
                      ...store,
                      lowStockThreshold: Math.max(0, Math.trunc(num(e, 10))),
                    })
                  }
                />
              </Field>
              <Field label="Opening cash default">
                <Input
                  type="number"
                  step="0.01"
                  value={store.openingCashDefault}
                  onChange={(e: string) =>
                    setStore({ ...store, openingCashDefault: Math.max(0, num(e, 0)) })
                  }
                />
              </Field>
            </div>
          </Sec>
        )}

        {tab === "tax" && tax && (
          <Sec title="Tax" onSave={() => save("tax", tax, "tax", setTax)} saving={saving}>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Tax enabled">
                <Select
                  value={tax.taxEnabled ? "yes" : "no"}
                  onChange={(e: string) => setTax({ ...tax, taxEnabled: e === "yes" })}
                  options={[
                    { label: "No", value: "no" },
                    { label: "Yes", value: "yes" },
                  ]}
                />
              </Field>
              <Field label="Tax rate (%)">
                <Input
                  type="number"
                  value={tax.taxRate}
                  onChange={(e: string) =>
                    setTax({ ...tax, taxRate: Math.min(100, Math.max(0, num(e, 0))) })
                  }
                />
              </Field>
              <Field label="Prices include tax">
                <Select
                  value={tax.pricesIncludeTax ? "yes" : "no"}
                  onChange={(e: string) => setTax({ ...tax, pricesIncludeTax: e === "yes" })}
                  options={[
                    { label: "No", value: "no" },
                    { label: "Yes", value: "yes" },
                  ]}
                />
              </Field>
            </div>
          </Sec>
        )}

        {tab === "payment-methods" && pm && (
          <Sec
            title="Payment Methods"
            onSave={() => save("payment-methods", pm, "paymentMethods", setPM)}
            saving={saving}
          >
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm mb-3">Enabled Methods</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <Toggle label="Cash" checked={pm.enableCash} onChange={(v) => setPM({ ...pm, enableCash: v })} />
                  <Toggle label="Card" checked={pm.enableCard} onChange={(v) => setPM({ ...pm, enableCard: v })} />
                  <Toggle
                    label="Mobile Money"
                    checked={pm.enableMobileMoney}
                    onChange={(v) => setPM({ ...pm, enableMobileMoney: v })}
                  />
                  <Toggle label="Check" checked={pm.enableCheck} onChange={(v) => setPM({ ...pm, enableCheck: v })} />
                  <Toggle
                    label="Bank Transfer"
                    checked={pm.enableBankTransfer}
                    onChange={(v) => setPM({ ...pm, enableBankTransfer: v })}
                  />
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-3">Surcharges (%)</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Card">
                    <Input
                      type="number"
                      value={pm.cardSurchargePercent}
                      onChange={(e: string) => setPM({ ...pm, cardSurchargePercent: Math.max(0, num(e, 0)) })}
                    />
                  </Field>
                  <Field label="Mobile Money">
                    <Input
                      type="number"
                      value={pm.mobileMoneysSurchargePercent}
                      onChange={(e: string) =>
                        setPM({ ...pm, mobileMoneysSurchargePercent: Math.max(0, num(e, 0)) })
                      }
                    />
                  </Field>
                  <Field label="Check Fee">
                    <Input
                      type="number"
                      step="0.01"
                      value={pm.checkProcessingFee}
                      onChange={(e: string) => setPM({ ...pm, checkProcessingFee: Math.max(0, num(e, 0)) })}
                    />
                  </Field>
                  <Field label="Bank Transfer Fee">
                    <Input
                      type="number"
                      step="0.01"
                      value={pm.bankTransferFee}
                      onChange={(e: string) => setPM({ ...pm, bankTransferFee: Math.max(0, num(e, 0)) })}
                    />
                  </Field>
                </div>
              </div>
            </div>
          </Sec>
        )}

        {tab === "refund-policy" && rp && (
          <Sec title="Refund Policy" onSave={() => save("refund-policy", rp, "refundPolicy", setRP)} saving={saving}>
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Refund Window (days)">
                  <Input
                    type="number"
                    value={rp.refundWindowDays}
                    onChange={(e: string) => setRP({ ...rp, refundWindowDays: Math.max(0, Math.trunc(num(e, 30))) })}
                  />
                </Field>
                <Field label="Max Refund (%)">
                  <Input
                    type="number"
                    value={rp.maxRefundPercentage}
                    onChange={(e: string) =>
                      setRP({ ...rp, maxRefundPercentage: Math.min(100, Math.max(0, num(e, 100))) })
                    }
                  />
                </Field>
                <Field label="Require Approval Above (GHS)">
                  <Input
                    type="number"
                    step="0.01"
                    value={rp.requireApprovalAboveAmount}
                    onChange={(e: string) =>
                      setRP({ ...rp, requireApprovalAboveAmount: Math.max(0, num(e, 1000)) })
                    }
                  />
                </Field>
                <Field label="Min Refund (GHS)">
                  <Input
                    type="number"
                    step="0.01"
                    value={rp.minRefundAmount}
                    onChange={(e: string) => setRP({ ...rp, minRefundAmount: Math.max(0, num(e, 0)) })}
                  />
                </Field>
                <Field label="Restock Fee (%)">
                  <Input
                    type="number"
                    value={rp.restockFeePercent}
                    onChange={(e: string) => setRP({ ...rp, restockFeePercent: Math.max(0, num(e, 0)) })}
                  />
                </Field>
                <Field label="Max Per Day (0=unlimited)">
                  <Input
                    type="number"
                    value={rp.maxRefundsPerDay}
                    onChange={(e: string) =>
                      setRP({ ...rp, maxRefundsPerDay: Math.max(0, Math.trunc(num(e, 0))) })
                    }
                  />
                </Field>
              </div>

              <div className="space-y-2">
                <Toggle
                  label="Require Manager Approval"
                  checked={rp.requireManagerApproval}
                  onChange={(v) => setRP({ ...rp, requireManagerApproval: v })}
                />
                <Toggle
                  label="Require Admin Approval"
                  checked={rp.requireAdminApproval}
                  onChange={(v) => setRP({ ...rp, requireAdminApproval: v })}
                />
                <Toggle
                  label="Auto Restock Items"
                  checked={rp.autoRestockItems}
                  onChange={(v) => setRP({ ...rp, autoRestockItems: v })}
                />
                <Toggle
                  label="Print Refund Receipt"
                  checked={rp.printRefundReceipt}
                  onChange={(v) => setRP({ ...rp, printRefundReceipt: v })}
                />
              </div>
            </div>
          </Sec>
        )}

        {tab === "shift-management" && sm && (
          <Sec
            title="Shift Management"
            onSave={() => save("shift-management", sm, "shiftManagement", setSM)}
            saving={saving}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Auto Close (HH:MM)">
                <Input
                  value={sm.autoCloseTime || ""}
                  onChange={(e: string) => setSM({ ...sm, autoCloseTime: e || null })}
                  placeholder="22:00"
                />
              </Field>
              <Field label="Allow Late Close (min)">
                <Input
                  type="number"
                  value={sm.allowLateCloseMinutes}
                  onChange={(e: string) =>
                    setSM({ ...sm, allowLateCloseMinutes: Math.max(0, Math.trunc(num(e, 60))) })
                  }
                />
              </Field>
              <Field label="Max Duration (min)">
                <Input
                  type="number"
                  value={sm.maxShiftDurationMinutes}
                  onChange={(e: string) =>
                    setSM({ ...sm, maxShiftDurationMinutes: Math.max(0, Math.trunc(num(e, 480))) })
                  }
                />
              </Field>
              <Field label="Min Break (min)">
                <Input
                  type="number"
                  value={sm.minBreakTimeMinutes}
                  onChange={(e: string) =>
                    setSM({ ...sm, minBreakTimeMinutes: Math.max(0, Math.trunc(num(e, 30))) })
                  }
                />
              </Field>
              <Field label="Variance (%)">
                <Input
                  type="number"
                  step="0.1"
                  value={sm.varianceTolerancePercent}
                  onChange={(e: string) => setSM({ ...sm, varianceTolerancePercent: Math.max(0, num(e, 2)) })}
                />
              </Field>
              <Field label="Variance Threshold (GHS)">
                <Input
                  type="number"
                  step="0.01"
                  value={sm.varianceApprovalThreshold}
                  onChange={(e: string) => setSM({ ...sm, varianceApprovalThreshold: Math.max(0, num(e, 100)) })}
                />
              </Field>
            </div>

            <div className="space-y-2 mt-4">
              <Toggle
                label="Require Opening Cash"
                checked={sm.requireOpeningCash}
                onChange={(v) => setSM({ ...sm, requireOpeningCash: v })}
              />
              <Toggle
                label="Require Closing Balance"
                checked={sm.requireClosingBalance}
                onChange={(v) => setSM({ ...sm, requireClosingBalance: v })}
              />
              <Toggle
                label="Require Approval for Variance"
                checked={sm.requireApprovalForVariance}
                onChange={(v) => setSM({ ...sm, requireApprovalForVariance: v })}
              />
              <Toggle
                label="Require Approval for Overtime"
                checked={sm.requireApprovalForOvertime}
                onChange={(v) => setSM({ ...sm, requireApprovalForOvertime: v })}
              />
            </div>
          </Sec>
        )}

        {tab === "notifications" && nt && (
          <Sec title="Notifications" onSave={() => save("notifications", nt, "notifications", setNT)} saving={saving}>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm">Stock Alerts</h3>
                <div className="space-y-2 mt-2">
                  <Toggle
                    label="Low Stock"
                    checked={nt.sendLowStockAlerts}
                    onChange={(v) => setNT({ ...nt, sendLowStockAlerts: v })}
                  />
                  <Toggle
                    label="Out of Stock"
                    checked={nt.sendOutOfStockAlerts}
                    onChange={(v) => setNT({ ...nt, sendOutOfStockAlerts: v })}
                  />
                  <Field label="Low Stock Threshold">
                    <Input
                      type="number"
                      value={nt.lowStockThreshold}
                      onChange={(e: string) =>
                        setNT({ ...nt, lowStockThreshold: Math.max(0, Math.trunc(num(e, 10))) })
                      }
                    />
                  </Field>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm">Sales Alerts</h3>
                <div className="space-y-2 mt-2">
                  <Toggle
                    label="End of Day Report"
                    checked={nt.enableEndOfDayReport}
                    onChange={(v) => setNT({ ...nt, enableEndOfDayReport: v })}
                  />
                  <Toggle
                    label="High Value Sale"
                    checked={nt.enableHighValueSaleAlert}
                    onChange={(v) => setNT({ ...nt, enableHighValueSaleAlert: v })}
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Report Time (HH:MM)">
                      <Input
                        value={nt.endOfDayReportTime}
                        onChange={(e: string) => setNT({ ...nt, endOfDayReportTime: e })}
                      />
                    </Field>
                    <Field label="High Value Threshold">
                      <Input
                        type="number"
                        step="0.01"
                        value={nt.highValueThreshold}
                        onChange={(e: string) =>
                          setNT({ ...nt, highValueThreshold: Math.max(0, num(e, 0)) })
                        }
                      />
                    </Field>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm">Channels</h3>
                <div className="space-y-2 mt-2">
                  <Toggle
                    label="Email"
                    checked={nt.notifyViaEmail}
                    onChange={(v) => setNT({ ...nt, notifyViaEmail: v })}
                  />
                  <Toggle label="SMS" checked={nt.notifyViaSMS} onChange={(v) => setNT({ ...nt, notifyViaSMS: v })} />
                  <Toggle
                    label="In-App"
                    checked={nt.notifyViaInApp}
                    onChange={(v) => setNT({ ...nt, notifyViaInApp: v })}
                  />
                </div>
              </div>
            </div>
          </Sec>
        )}

        {tab === "security" && sec && (
          <Sec title="Security" onSave={() => save("security", sec, "security", setSEC)} saving={saving}>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm">Sessions</h3>
                <div className="grid gap-3 md:grid-cols-2 mt-2">
                  <Field label="Timeout (min)">
                    <Input
                      type="number"
                      value={sec.sessionTimeoutMinutes}
                      onChange={(e: string) =>
                        setSEC({ ...sec, sessionTimeoutMinutes: Math.max(0, Math.trunc(num(e, 30))) })
                      }
                    />
                  </Field>
                  <Field label="Max Sessions">
                    <Input
                      type="number"
                      value={sec.maxSessionsPerUser}
                      onChange={(e: string) =>
                        setSEC({ ...sec, maxSessionsPerUser: Math.max(1, Math.trunc(num(e, 1))) })
                      }
                    />
                  </Field>
                </div>
                <Toggle
                  label="Allow Concurrent Sessions"
                  checked={sec.allowConcurrentSessions}
                  onChange={(v) => setSEC({ ...sec, allowConcurrentSessions: v })}
                />
              </div>

              <div>
                <h3 className="font-semibold text-sm">Password Policy</h3>
                <div className="grid gap-3 md:grid-cols-2 mt-2">
                  <Field label="Min Length">
                    <Input
                      type="number"
                      value={sec.minPasswordLength}
                      onChange={(e: string) =>
                        setSEC({ ...sec, minPasswordLength: Math.max(1, Math.trunc(num(e, 8))) })
                      }
                    />
                  </Field>
                  <Field label="Expiry (days)">
                    <Input
                      type="number"
                      value={sec.passwordExpiryDays}
                      onChange={(e: string) =>
                        setSEC({ ...sec, passwordExpiryDays: Math.max(0, Math.trunc(num(e, 90))) })
                      }
                    />
                  </Field>
                </div>

                <div className="space-y-2 mt-2">
                  <Toggle
                    label="Require Uppercase"
                    checked={sec.requireUppercase}
                    onChange={(v) => setSEC({ ...sec, requireUppercase: v })}
                  />
                  <Toggle
                    label="Require Numbers"
                    checked={sec.requireNumbers}
                    onChange={(v) => setSEC({ ...sec, requireNumbers: v })}
                  />
                  <Toggle
                    label="Require Special Characters"
                    checked={sec.requireSpecialCharacters}
                    onChange={(v) => setSEC({ ...sec, requireSpecialCharacters: v })}
                  />
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm">Login</h3>
                <div className="grid gap-3 md:grid-cols-2 mt-2">
                  <Field label="Max Failed Attempts">
                    <Input
                      type="number"
                      value={sec.maxFailedLoginAttempts}
                      onChange={(e: string) =>
                        setSEC({ ...sec, maxFailedLoginAttempts: Math.max(1, Math.trunc(num(e, 5))) })
                      }
                    />
                  </Field>
                  <Field label="Lockout (min)">
                    <Input
                      type="number"
                      value={sec.lockoutDurationMinutes}
                      onChange={(e: string) =>
                        setSEC({ ...sec, lockoutDurationMinutes: Math.max(0, Math.trunc(num(e, 15))) })
                      }
                    />
                  </Field>
                </div>
              </div>
            </div>
          </Sec>
        )}

        {tab === "backup" && bak && (
          <Sec title="Backup" onSave={() => save("backup", bak, "backup", setBAK)} saving={saving}>
            <div className="space-y-4">
              <Toggle
                label="Enable Auto Backup"
                checked={bak.enableAutoBackup}
                onChange={(v) => setBAK({ ...bak, enableAutoBackup: v })}
              />

              {bak.enableAutoBackup && (
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Frequency">
                    <Select
                      value={bak.backupFrequency}
                      onChange={(e: string) => setBAK({ ...bak, backupFrequency: e })}
                      options={[
                        { label: "DAILY", value: "DAILY" },
                        { label: "WEEKLY", value: "WEEKLY" },
                        { label: "MONTHLY", value: "MONTHLY" },
                      ]}
                    />
                  </Field>
                  <Field label="Time (HH:MM)">
                    <Input value={bak.backupTime} onChange={(e: string) => setBAK({ ...bak, backupTime: e })} />
                  </Field>
                  <Field label="Retention (days)">
                    <Input
                      type="number"
                      value={bak.retentionDays}
                      onChange={(e: string) => setBAK({ ...bak, retentionDays: Math.max(0, Math.trunc(num(e, 30))) })}
                    />
                  </Field>
                  <Field label="Max Count">
                    <Input
                      type="number"
                      value={bak.maxBackupCount}
                      onChange={(e: string) =>
                        setBAK({ ...bak, maxBackupCount: Math.max(1, Math.trunc(num(e, 10))) })
                      }
                    />
                  </Field>
                </div>
              )}

              <div className="grid gap-2 md:grid-cols-2">
                <Toggle
                  label="Database export"
                  checked={bak.enableDatabaseExport}
                  onChange={(v) => setBAK({ ...bak, enableDatabaseExport: v })}
                />
                <Toggle
                  label="Invoices export"
                  checked={bak.enableInvoiceExport}
                  onChange={(v) => setBAK({ ...bak, enableInvoiceExport: v })}
                />
                <Toggle
                  label="Inventory export"
                  checked={bak.enableInventoryExport}
                  onChange={(v) => setBAK({ ...bak, enableInventoryExport: v })}
                />
                <Toggle
                  label="Financial export"
                  checked={bak.enableFinancialExport}
                  onChange={(v) => setBAK({ ...bak, enableFinancialExport: v })}
                />
              </div>
            </div>
          </Sec>
        )}

        {tab === "receipt" && rec && (
          <Sec title="Receipt" onSave={() => save("receipt", rec, "receipt", setREC)} saving={saving}>
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Width">
                  <Select
                    value={rec.receiptWidth}
                    onChange={(e: string) => setREC({ ...rec, receiptWidth: e })}
                    options={[
                      { label: "80MM", value: "80MM" },
                      { label: "58MM", value: "58MM" },
                    ]}
                  />
                </Field>
                <Field label="Printer">
                  <Select
                    value={rec.printerType}
                    onChange={(e: string) => setREC({ ...rec, printerType: e })}
                    options={[
                      { label: "THERMAL", value: "THERMAL" },
                      { label: "INKJET", value: "INKJET" },
                      { label: "GENERIC", value: "GENERIC" },
                    ]}
                  />
                </Field>
              </div>

              <div className="space-y-2">
                <Toggle label="Display Logo" checked={rec.displayLogo} onChange={(v) => setREC({ ...rec, displayLogo: v })} />
                <Toggle
                  label="Display Merchant"
                  checked={rec.displayMerchantName}
                  onChange={(v) => setREC({ ...rec, displayMerchantName: v })}
                />
                <Toggle
                  label="Display Store"
                  checked={rec.displayStoreName}
                  onChange={(v) => setREC({ ...rec, displayStoreName: v })}
                />
                <Toggle
                  label="Display Cashier"
                  checked={rec.displayCashierName}
                  onChange={(v) => setREC({ ...rec, displayCashierName: v })}
                />
                <Toggle label="Print Barcode" checked={rec.printBarcode} onChange={(v) => setREC({ ...rec, printBarcode: v })} />
                <Toggle
                  label="Email Receipt"
                  checked={rec.enableEmailReceipt}
                  onChange={(v) => setREC({ ...rec, enableEmailReceipt: v })}
                />
              </div>
            </div>
          </Sec>
        )}

        {tab === "sales" && sal && (
          <Sec title="Sales" onSave={() => save("sales", sal, "sales", setSAL)} saving={saving}>
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Low Stock Threshold">
                  <Input
                    type="number"
                    value={sal.lowStockThreshold}
                    onChange={(e: string) =>
                      setSAL({ ...sal, lowStockThreshold: Math.max(0, Math.trunc(num(e, 10))) })
                    }
                  />
                </Field>
                <Field label="Max Discount (%)">
                  <Input
                    type="number"
                    value={sal.maxDiscountPercent}
                    onChange={(e: string) =>
                      setSAL({ ...sal, maxDiscountPercent: Math.min(100, Math.max(0, num(e, 50))) })
                    }
                  />
                </Field>
                <Field label="Auto Reorder Point">
                  <Input
                    type="number"
                    value={sal.autoReorderPoint}
                    onChange={(e: string) =>
                      setSAL({ ...sal, autoReorderPoint: Math.max(0, Math.trunc(num(e, 0))) })
                    }
                  />
                </Field>
                <Field label="Next Receipt #">
                  <Input
                    type="number"
                    value={sal.nextReceiptNumber}
                    onChange={(e: string) =>
                      setSAL({ ...sal, nextReceiptNumber: Math.max(1, Math.trunc(num(e, 1))) })
                    }
                  />
                </Field>
                <Field label="Max Transaction">
                  <Input
                    type="number"
                    step="0.01"
                    value={sal.maxTransactionAmount}
                    onChange={(e: string) => setSAL({ ...sal, maxTransactionAmount: Math.max(0, num(e, 0)) })}
                  />
                </Field>
                <Field label="Min Transaction">
                  <Input
                    type="number"
                    step="0.01"
                    value={sal.minTransactionAmount}
                    onChange={(e: string) => setSAL({ ...sal, minTransactionAmount: Math.max(0, num(e, 0)) })}
                  />
                </Field>
              </div>

              <div className="space-y-2">
                <Toggle
                  label="Allow Negative Stock"
                  checked={sal.allowNegativeStock}
                  onChange={(v) => setSAL({ ...sal, allowNegativeStock: v })}
                />
                <Toggle
                  label="Enable Manual Discount"
                  checked={sal.enableManualDiscount}
                  onChange={(v) => setSAL({ ...sal, enableManualDiscount: v })}
                />
                <Toggle
                  label="Require Void Approval"
                  checked={sal.requireApprovalForVoid}
                  onChange={(v) => setSAL({ ...sal, requireApprovalForVoid: v })}
                />
                <Toggle
                  label="Display Item Total"
                  checked={sal.displayItemTotalOnScreen}
                  onChange={(v) => setSAL({ ...sal, displayItemTotalOnScreen: v })}
                />
              </div>
            </div>
          </Sec>
        )}

        {tab === "integration" && intg && (
          <Sec title="Integration" onSave={() => save("integration", intg, "integration", setINT)} saving={saving}>
            <div className="space-y-4">
              <Toggle label="Enable API" checked={intg.enableAPI} onChange={(v) => setINT({ ...intg, enableAPI: v })} />
              <Toggle label="Enable SMS" checked={intg.enableSMS} onChange={(v) => setINT({ ...intg, enableSMS: v })} />
              <Toggle
                label="Enable Email"
                checked={intg.enableEmail}
                onChange={(v) => setINT({ ...intg, enableEmail: v })}
              />
              <Toggle
                label="Enable Inventory Sync"
                checked={intg.enableInventorySync}
                onChange={(v) => setINT({ ...intg, enableInventorySync: v })}
              />
              <Toggle
                label="Enable Accounting Sync"
                checked={intg.enableAccountingSync}
                onChange={(v) => setINT({ ...intg, enableAccountingSync: v })}
              />

              {intg.enableAPI && (
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="API Key">
                    <Input
                      type="password"
                      value={intg.apiKey || ""}
                      onChange={(e: string) => setINT({ ...intg, apiKey: e || null })}
                    />
                  </Field>
                  <Field label="API Secret">
                    <Input
                      type="password"
                      value={intg.apiSecret || ""}
                      onChange={(e: string) => setINT({ ...intg, apiSecret: e || null })}
                    />
                  </Field>
                </div>
              )}

              {intg.enableInventorySync && (
                <Field label="Sync Frequency">
                  <Select
                    value={intg.inventorySyncFrequency}
                    onChange={(e: string) => setINT({ ...intg, inventorySyncFrequency: e })}
                    options={[
                      { label: "REALTIME", value: "REALTIME" },
                      { label: "HOURLY", value: "HOURLY" },
                      { label: "DAILY", value: "DAILY" },
                    ]}
                  />
                </Field>
              )}

              {intg.enableAccountingSync && (
                <Field label="System">
                  <Select
                    value={intg.accountingSystem || ""}
                    onChange={(e: string) => setINT({ ...intg, accountingSystem: e || null })}
                    options={[
                      { label: "XERO", value: "XERO" },
                      { label: "QUICKBOOKS", value: "QUICKBOOKS" },
                      { label: "MYOB", value: "MYOB" },
                    ]}
                  />
                </Field>
              )}
            </div>
          </Sec>
        )}
      </div>
    </Guard>
  );
}

function Sec({
  title,
  onSave,
  saving,
  children,
}: {
  title: string;
  onSave: () => void;
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Guard perm="settings:write">
          <button
            disabled={saving}
            onClick={onSave}
            className="rounded-xl border border-indigo-500/30 bg-indigo-500/20 px-4 py-2 text-sm hover:bg-indigo-500/30 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </Guard>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-slate-400">{label}</div>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  type = "text",
  step = "1",
  placeholder = "",
}: any) {
  return (
    <input
      type={type}
      step={step}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/**
 * ✅ Modern Toggle (no checkbox UI)
 * - Click anywhere on the row to toggle
 * - Keyboard accessible (Enter/Space)
 */
function Toggle({
  label,
  checked,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled ? "true" : "false"}
      tabIndex={disabled ? -1 : 0}
      onClick={() => {
        if (disabled) return;
        onChange(!checked);
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      className={[
        "flex items-center justify-between gap-3 rounded-xl border px-3 py-2",
        "border-slate-800 bg-slate-950/30",
        "transition-colors",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-slate-950/50",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="text-sm text-slate-300">{label}</div>
        {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
      </div>

      <div
        className={[
          "relative h-6 w-11 rounded-full border transition-colors",
          checked ? "bg-emerald-500/30 border-emerald-500/40" : "bg-slate-900/60 border-slate-700/60",
        ].join(" ")}
      >
        <div
          className={[
            "absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full transition-transform",
            checked ? "translate-x-5 bg-emerald-200" : "translate-x-0 bg-slate-300",
          ].join(" ")}
          style={{ left: 2 }}
        />
      </div>
    </div>
  );
}