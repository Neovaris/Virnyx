"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Guard from "@/components/admin/Guard";
import { SkeletonSettings } from "@/components/admin/SkeletonLoader";
import Image from "next/image";

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
  merchantName: string;
  storeName: string;
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

type Tax = {
  taxEnabled: boolean;
  taxRate: number;
  pricesIncludeTax: boolean;
};

const num = (v: unknown, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};

const tabs = [
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
] as const;

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
  const [logoUploading, setLogoUploading] = useState(false);

  const applyLoadedSettings = useCallback((data: Record<string, unknown>[]) => {
    setMerchant((data[0]?.merchant as Merchant | undefined) ?? null);
    setStore((data[1]?.store as Store | undefined) ?? null);
    setTax((data[2]?.tax as Tax | undefined) ?? null);
    setPM((data[3]?.paymentMethods as PaymentMethods | undefined) ?? null);
    setRP((data[4]?.refundPolicy as RefundPolicy | undefined) ?? null);
    setSM((data[5]?.shiftManagement as ShiftManagement | undefined) ?? null);
    setNT((data[6]?.notifications as Notifications | undefined) ?? null);
    setSEC((data[7]?.security as Security | undefined) ?? null);
    setBAK((data[8]?.backup as Backup | undefined) ?? null);
    setREC((data[9]?.receipt as Receipt | undefined) ?? null);
    setSAL((data[10]?.sales as Sales | undefined) ?? null);
    setINT((data[11]?.integration as Integration | undefined) ?? null);
  }, []);

  const uploadReceiptLogo = async (file: File) => {
    setLogoUploading(true);
    setErr(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/receipt-logo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || "Upload failed");

      if (body.url) {
        setREC({ ...rec!, logoUrl: body.url });
        setMsg("Logo uploaded successfully");
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLogoUploading(false);
    }
  };

  const load = useCallback(async (
    options: { showLoading?: boolean; clearStatus?: boolean } = {},
  ) => {
    const { showLoading = true, clearStatus = true } = options;

    if (showLoading) {
      setLoading(true);
    }
    if (clearStatus) {
      setErr(null);
      setMsg(null);
    }

    try {
      const res = await Promise.all([
        fetch("/api/settings/merchant", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/settings/store", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/settings/tax", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/settings/payment-methods", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/settings/refund-policy", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/settings/shift-management", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/settings/notifications", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/settings/security", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/settings/backup", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/settings/receipt", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/settings/sales", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/settings/integration", {
          cache: "no-store",
          credentials: "include",
        }),
      ]);

      const data = await Promise.all(
        res.map((r) => r.json().catch(() => ({}))),
      );

      applyLoadedSettings(data as Record<string, unknown>[]);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Load failed");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [applyLoadedSettings]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async <T,>(
    endpoint: string,
    data: T,
    key: string,
    setter: (value: T | null) => void,
  ) => {
    setSaving(true);
    setErr(null);
    setMsg(null);

    try {
      const res = await fetch(`/api/settings/${endpoint}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || "Save failed");

      const typedBody = body as Record<string, unknown>;
      setter((typedBody[key] as T | undefined) ?? null);
      setMsg("Saved successfully.");

      // Refresh the rest of the settings without blanking the page state.
      await load({ showLoading: false, clearStatus: false });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const receiptPreview = useMemo(() => {
    if (!rec) return null;
    return rec;
  }, [rec]);

  if (loading) {
    return (
      <Guard perm="settings:read">
        <SkeletonSettings />
      </Guard>
    );
  }

  return (
    <Guard perm="settings:read">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Settings
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Configure your POS system behavior, payment methods, receipts,
              security, notifications, and integrations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-900/70 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>
        {err && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-center gap-2">
            <svg
              className="w-5 h-5 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span>{err}</span>
          </div>
        )}
        {msg && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 flex items-center gap-2">
            <svg
              className="w-5 h-5 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>{msg}</span>
          </div>
        )}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Configuration Sections
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {tabs.map(({ k, n }) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={[
                  "rounded-xl px-3 py-2.5 text-xs font-medium transition whitespace-nowrap",
                  tab === k
                    ? "bg-indigo-500/25 text-indigo-100 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.5)] border border-indigo-400/40"
                    : "text-slate-300 border border-slate-800 hover:bg-slate-900/60 hover:border-slate-700",
                ].join(" ")}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        {tab === "basic" && merchant && (
          <Sec
            title="Merchant Profile"
            description="Core business information used across your POS system."
            onSave={() => save("merchant", merchant, "merchant", setMerchant)}
            saving={saving}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Business name">
                <Input
                  value={merchant.name}
                  onChange={(e) => setMerchant({ ...merchant, name: e })}
                />
              </Field>

              <Field label="Country">
                <Input
                  value={merchant.country || ""}
                  onChange={(e) =>
                    setMerchant({ ...merchant, country: e || null })
                  }
                />
              </Field>

              <Field label="Currency" hint="Example: GHS, USD, NGN">
                <Input
                  value={merchant.currency || ""}
                  onChange={(e) =>
                    setMerchant({ ...merchant, currency: e || null })
                  }
                />
              </Field>

              <Field label="Timezone">
                <Input
                  value={merchant.timezone || ""}
                  onChange={(e) =>
                    setMerchant({ ...merchant, timezone: e || null })
                  }
                />
              </Field>
            </div>
          </Sec>
        )}
        {tab === "store" && store && (
          <Sec
            title="Store Settings"
            description="Configure location-specific defaults and store-level settings."
            onSave={() => save("store", store, "store", setStore)}
            saving={saving}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Store name">
                <Input
                  value={store.name}
                  onChange={(e) => setStore({ ...store, name: e })}
                />
              </Field>

              <Field label="Store code">
                <Input
                  value={store.code || ""}
                  onChange={(e) => setStore({ ...store, code: e || null })}
                />
              </Field>

              <Field label="Phone">
                <Input
                  value={store.phone || ""}
                  onChange={(e) => setStore({ ...store, phone: e || null })}
                />
              </Field>

              <Field label="Receipt prefix">
                <Input
                  value={store.receiptPrefix || ""}
                  onChange={(e) =>
                    setStore({ ...store, receiptPrefix: e || null })
                  }
                />
              </Field>

              <Field
                label="Store low stock threshold"
                hint="Saved on the store record and used as the default inventory threshold for this store."
              >
                <Input
                  type="number"
                  value={store.lowStockThreshold}
                  onChange={(e) =>
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
                  onChange={(e) =>
                    setStore({
                      ...store,
                      openingCashDefault: Math.max(0, num(e, 0)),
                    })
                  }
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Address">
                  <TextArea
                    rows={3}
                    value={store.address || ""}
                    onChange={(e) => setStore({ ...store, address: e || null })}
                    placeholder="Store address"
                  />
                </Field>
              </div>
            </div>
          </Sec>
        )}
        {tab === "tax" && tax && (
          <Sec
            title="Tax Rules"
            description="Define tax behavior and whether prices should include tax by default."
            onSave={() => save("tax", tax, "tax", setTax)}
            saving={saving}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Tax enabled">
                <Select
                  value={tax.taxEnabled ? "yes" : "no"}
                  onChange={(e) => setTax({ ...tax, taxEnabled: e === "yes" })}
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
                  onChange={(e) =>
                    setTax({
                      ...tax,
                      taxRate: Math.min(100, Math.max(0, num(e, 0))),
                    })
                  }
                />
              </Field>

              <Field label="Prices include tax">
                <Select
                  value={tax.pricesIncludeTax ? "yes" : "no"}
                  onChange={(e) =>
                    setTax({ ...tax, pricesIncludeTax: e === "yes" })
                  }
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
            description="Enable accepted payment types and define surcharges or fees."
            onSave={() => save("payment-methods", pm, "paymentMethods", setPM)}
            saving={saving}
          >
            <div className="space-y-4">
              <SubSec title="Enabled Methods">
                <div className="grid gap-3 md:grid-cols-2">
                  <Toggle
                    label="Cash"
                    checked={pm.enableCash}
                    onChange={(v) => setPM({ ...pm, enableCash: v })}
                  />
                  <Toggle
                    label="Card"
                    checked={pm.enableCard}
                    onChange={(v) => setPM({ ...pm, enableCard: v })}
                  />
                  <Toggle
                    label="Mobile Money"
                    checked={pm.enableMobileMoney}
                    onChange={(v) => setPM({ ...pm, enableMobileMoney: v })}
                  />
                  <Toggle
                    label="Check"
                    checked={pm.enableCheck}
                    onChange={(v) => setPM({ ...pm, enableCheck: v })}
                  />
                  <Toggle
                    label="Bank Transfer"
                    checked={pm.enableBankTransfer}
                    onChange={(v) => setPM({ ...pm, enableBankTransfer: v })}
                  />
                </div>
              </SubSec>

              <SubSec title="Fees & Surcharges">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Card surcharge (%)">
                    <Input
                      type="number"
                      value={pm.cardSurchargePercent}
                      onChange={(e) =>
                        setPM({
                          ...pm,
                          cardSurchargePercent: Math.max(0, num(e, 0)),
                        })
                      }
                    />
                  </Field>

                  <Field label="Mobile Money surcharge (%)">
                    <Input
                      type="number"
                      value={pm.mobileMoneysSurchargePercent}
                      onChange={(e) =>
                        setPM({
                          ...pm,
                          mobileMoneysSurchargePercent: Math.max(0, num(e, 0)),
                        })
                      }
                    />
                  </Field>

                  <Field label="Check processing fee">
                    <Input
                      type="number"
                      step="0.01"
                      value={pm.checkProcessingFee}
                      onChange={(e) =>
                        setPM({
                          ...pm,
                          checkProcessingFee: Math.max(0, num(e, 0)),
                        })
                      }
                    />
                  </Field>

                  <Field label="Bank transfer fee">
                    <Input
                      type="number"
                      step="0.01"
                      value={pm.bankTransferFee}
                      onChange={(e) =>
                        setPM({
                          ...pm,
                          bankTransferFee: Math.max(0, num(e, 0)),
                        })
                      }
                    />
                  </Field>
                </div>
              </SubSec>
            </div>
          </Sec>
        )}
        {tab === "refund-policy" && rp && (
          <Sec
            title="Refund Policy"
            description="Set refund limits, approval rules, and restocking behavior."
            onSave={() => save("refund-policy", rp, "refundPolicy", setRP)}
            saving={saving}
          >
            <div className="space-y-4">
              <SubSec title="Limits">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Refund window (days)">
                    <Input
                      type="number"
                      value={rp.refundWindowDays}
                      onChange={(e) =>
                        setRP({
                          ...rp,
                          refundWindowDays: Math.max(0, Math.trunc(num(e, 30))),
                        })
                      }
                    />
                  </Field>

                  <Field label="Max refund (%)">
                    <Input
                      type="number"
                      value={rp.maxRefundPercentage}
                      onChange={(e) =>
                        setRP({
                          ...rp,
                          maxRefundPercentage: Math.min(
                            100,
                            Math.max(0, num(e, 100)),
                          ),
                        })
                      }
                    />
                  </Field>

                  <Field label="Require approval above (GHS)">
                    <Input
                      type="number"
                      step="0.01"
                      value={rp.requireApprovalAboveAmount}
                      onChange={(e) =>
                        setRP({
                          ...rp,
                          requireApprovalAboveAmount: Math.max(0, num(e, 1000)),
                        })
                      }
                    />
                  </Field>

                  <Field label="Minimum refund (GHS)">
                    <Input
                      type="number"
                      step="0.01"
                      value={rp.minRefundAmount}
                      onChange={(e) =>
                        setRP({
                          ...rp,
                          minRefundAmount: Math.max(0, num(e, 0)),
                        })
                      }
                    />
                  </Field>

                  <Field label="Restock fee (%)">
                    <Input
                      type="number"
                      value={rp.restockFeePercent}
                      onChange={(e) =>
                        setRP({
                          ...rp,
                          restockFeePercent: Math.max(0, num(e, 0)),
                        })
                      }
                    />
                  </Field>

                  <Field label="Max refunds/day (0 = unlimited)">
                    <Input
                      type="number"
                      value={rp.maxRefundsPerDay}
                      onChange={(e) =>
                        setRP({
                          ...rp,
                          maxRefundsPerDay: Math.max(0, Math.trunc(num(e, 0))),
                        })
                      }
                    />
                  </Field>
                </div>
              </SubSec>

              <SubSec title="Approval & Receipt">
                <div className="grid gap-3 md:grid-cols-2">
                  <Toggle
                    label="Require Manager Approval"
                    checked={rp.requireManagerApproval}
                    onChange={(v) =>
                      setRP({ ...rp, requireManagerApproval: v })
                    }
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

                <div className="mt-4">
                  <Field label="Refund receipt prefix">
                    <Input
                      value={rp.refundReceiptPrefix}
                      onChange={(e) => setRP({ ...rp, refundReceiptPrefix: e })}
                    />
                  </Field>
                </div>
              </SubSec>
            </div>
          </Sec>
        )}
        {tab === "shift-management" && sm && (
          <Sec
            title="Shift Management"
            description="Configure opening, closing, variance, and overtime rules."
            onSave={() =>
              save("shift-management", sm, "shiftManagement", setSM)
            }
            saving={saving}
          >
            <div className="space-y-4">
              <SubSec title="Schedule & Limits">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Auto close time (HH:MM)">
                    <Input
                      value={sm.autoCloseTime || ""}
                      onChange={(e) =>
                        setSM({ ...sm, autoCloseTime: e || null })
                      }
                      placeholder="22:00"
                    />
                  </Field>

                  <Field label="Allow late close (min)">
                    <Input
                      type="number"
                      value={sm.allowLateCloseMinutes}
                      onChange={(e) =>
                        setSM({
                          ...sm,
                          allowLateCloseMinutes: Math.max(
                            0,
                            Math.trunc(num(e, 60)),
                          ),
                        })
                      }
                    />
                  </Field>

                  <Field label="Max shift duration (min)">
                    <Input
                      type="number"
                      value={sm.maxShiftDurationMinutes}
                      onChange={(e) =>
                        setSM({
                          ...sm,
                          maxShiftDurationMinutes: Math.max(
                            0,
                            Math.trunc(num(e, 480)),
                          ),
                        })
                      }
                    />
                  </Field>

                  <Field label="Min break time (min)">
                    <Input
                      type="number"
                      value={sm.minBreakTimeMinutes}
                      onChange={(e) =>
                        setSM({
                          ...sm,
                          minBreakTimeMinutes: Math.max(
                            0,
                            Math.trunc(num(e, 30)),
                          ),
                        })
                      }
                    />
                  </Field>

                  <Field label="Overtime threshold (min)">
                    <Input
                      type="number"
                      value={sm.overtimeThresholdMinutes}
                      onChange={(e) =>
                        setSM({
                          ...sm,
                          overtimeThresholdMinutes: Math.max(
                            0,
                            Math.trunc(num(e, 0)),
                          ),
                        })
                      }
                    />
                  </Field>
                </div>
              </SubSec>

              <SubSec title="Variance Controls">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Variance tolerance (%)">
                    <Input
                      type="number"
                      step="0.1"
                      value={sm.varianceTolerancePercent}
                      onChange={(e) =>
                        setSM({
                          ...sm,
                          varianceTolerancePercent: Math.max(0, num(e, 2)),
                        })
                      }
                    />
                  </Field>

                  <Field label="Tolerance amount">
                    <Input
                      type="number"
                      step="0.01"
                      value={sm.toleranceAmount}
                      onChange={(e) =>
                        setSM({
                          ...sm,
                          toleranceAmount: Math.max(0, num(e, 0)),
                        })
                      }
                    />
                  </Field>

                  <Field label="Variance approval threshold">
                    <Input
                      type="number"
                      step="0.01"
                      value={sm.varianceApprovalThreshold}
                      onChange={(e) =>
                        setSM({
                          ...sm,
                          varianceApprovalThreshold: Math.max(0, num(e, 100)),
                        })
                      }
                    />
                  </Field>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
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
                    onChange={(v) =>
                      setSM({ ...sm, requireApprovalForVariance: v })
                    }
                  />
                  <Toggle
                    label="Require Approval for Overtime"
                    checked={sm.requireApprovalForOvertime}
                    onChange={(v) =>
                      setSM({ ...sm, requireApprovalForOvertime: v })
                    }
                  />
                </div>
              </SubSec>
            </div>
          </Sec>
        )}
        {tab === "notifications" && nt && (
          <Sec
            title="Alerts & Notifications"
            description="Decide what should trigger alerts and how administrators are notified."
            onSave={() => save("notifications", nt, "notifications", setNT)}
            saving={saving}
          >
            <div className="space-y-4">
              <SubSec title="Inventory Alerts">
                <div className="grid gap-3 md:grid-cols-2">
                  <Toggle
                    label="Low Stock Alerts"
                    checked={nt.sendLowStockAlerts}
                    onChange={(v) => setNT({ ...nt, sendLowStockAlerts: v })}
                  />
                  <Toggle
                    label="Out of Stock Alerts"
                    checked={nt.sendOutOfStockAlerts}
                    onChange={(v) => setNT({ ...nt, sendOutOfStockAlerts: v })}
                  />
                </div>

                <div className="mt-4 text-xs text-slate-500">
                  Uses Store low stock threshold to trigger alerts.
                </div>
              </SubSec>

              <SubSec title="Sales & Operational Alerts">
                <div className="grid gap-3 md:grid-cols-2">
                  <Toggle
                    label="End of Day Report"
                    checked={nt.enableEndOfDayReport}
                    onChange={(v) => setNT({ ...nt, enableEndOfDayReport: v })}
                  />
                  <Toggle
                    label="High Value Sale Alert"
                    checked={nt.enableHighValueSaleAlert}
                    onChange={(v) =>
                      setNT({ ...nt, enableHighValueSaleAlert: v })
                    }
                  />
                  <Toggle
                    label="Unusual Transaction Alert"
                    checked={nt.enableUnusualTransactionAlert}
                    onChange={(v) =>
                      setNT({ ...nt, enableUnusualTransactionAlert: v })
                    }
                  />
                  <Toggle
                    label="Error Notifications"
                    checked={nt.enableErrorNotifications}
                    onChange={(v) =>
                      setNT({ ...nt, enableErrorNotifications: v })
                    }
                  />
                  <Toggle
                    label="Refund Alerts"
                    checked={nt.enableRefundAlerts}
                    onChange={(v) => setNT({ ...nt, enableRefundAlerts: v })}
                  />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Report time (HH:MM)">
                    <Input
                      value={nt.endOfDayReportTime}
                      onChange={(e) => setNT({ ...nt, endOfDayReportTime: e })}
                    />
                  </Field>

                  <Field label="High value threshold">
                    <Input
                      type="number"
                      step="0.01"
                      value={nt.highValueThreshold}
                      onChange={(e) =>
                        setNT({
                          ...nt,
                          highValueThreshold: Math.max(0, num(e, 0)),
                        })
                      }
                    />
                  </Field>
                </div>
              </SubSec>

              <SubSec title="Delivery Channels">
                <div className="grid gap-3 md:grid-cols-2">
                  <Toggle
                    label="Notify via Email"
                    checked={nt.notifyViaEmail}
                    onChange={(v) => setNT({ ...nt, notifyViaEmail: v })}
                  />
                  <Toggle
                    label="Notify via SMS"
                    checked={nt.notifyViaSMS}
                    onChange={(v) => setNT({ ...nt, notifyViaSMS: v })}
                  />
                  <Toggle
                    label="Notify via In-App"
                    checked={nt.notifyViaInApp}
                    onChange={(v) => setNT({ ...nt, notifyViaInApp: v })}
                  />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Alert emails">
                    <TextArea
                      rows={3}
                      value={nt.alertEmails}
                      onChange={(e) => setNT({ ...nt, alertEmails: e })}
                      placeholder="admin@company.com, ops@company.com"
                    />
                  </Field>

                  <Field label="Alert phone numbers">
                    <TextArea
                      rows={3}
                      value={nt.alertPhoneNumbers}
                      onChange={(e) => setNT({ ...nt, alertPhoneNumbers: e })}
                      placeholder="+233..."
                    />
                  </Field>
                </div>
              </SubSec>
            </div>
          </Sec>
        )}
        {tab === "security" && sec && (
          <Sec
            title="Security"
            description="Manage session behavior, password policies, login protection, and auditing."
            onSave={() => save("security", sec, "security", setSEC)}
            saving={saving}
          >
            <div className="space-y-4">
              <SubSec title="Sessions">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Session timeout (min)">
                    <Input
                      type="number"
                      value={sec.sessionTimeoutMinutes}
                      onChange={(e) =>
                        setSEC({
                          ...sec,
                          sessionTimeoutMinutes: Math.max(
                            0,
                            Math.trunc(num(e, 30)),
                          ),
                        })
                      }
                    />
                  </Field>

                  <Field label="Max sessions per user">
                    <Input
                      type="number"
                      value={sec.maxSessionsPerUser}
                      onChange={(e) =>
                        setSEC({
                          ...sec,
                          maxSessionsPerUser: Math.max(
                            1,
                            Math.trunc(num(e, 1)),
                          ),
                        })
                      }
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <Toggle
                    label="Allow Concurrent Sessions"
                    checked={sec.allowConcurrentSessions}
                    onChange={(v) =>
                      setSEC({ ...sec, allowConcurrentSessions: v })
                    }
                  />
                </div>
              </SubSec>

              <SubSec title="Password Policy">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Minimum password length">
                    <Input
                      type="number"
                      value={sec.minPasswordLength}
                      onChange={(e) =>
                        setSEC({
                          ...sec,
                          minPasswordLength: Math.max(1, Math.trunc(num(e, 8))),
                        })
                      }
                    />
                  </Field>

                  <Field label="Password expiry (days)">
                    <Input
                      type="number"
                      value={sec.passwordExpiryDays}
                      onChange={(e) =>
                        setSEC({
                          ...sec,
                          passwordExpiryDays: Math.max(
                            0,
                            Math.trunc(num(e, 90)),
                          ),
                        })
                      }
                    />
                  </Field>

                  <Field label="Previous passwords to check">
                    <Input
                      type="number"
                      value={sec.previousPasswordsToCheck}
                      onChange={(e) =>
                        setSEC({
                          ...sec,
                          previousPasswordsToCheck: Math.max(
                            0,
                            Math.trunc(num(e, 5)),
                          ),
                        })
                      }
                    />
                  </Field>

                  <Field label="2FA method">
                    <Select
                      value={sec.twoFactorMethod}
                      onChange={(e) => setSEC({ ...sec, twoFactorMethod: e })}
                      options={[
                        { label: "SMS", value: "SMS" },
                        { label: "EMAIL", value: "EMAIL" },
                        { label: "AUTH_APP", value: "AUTH_APP" },
                      ]}
                    />
                  </Field>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
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
                    onChange={(v) =>
                      setSEC({ ...sec, requireSpecialCharacters: v })
                    }
                  />
                  <Toggle
                    label="Prevent Password Reuse"
                    checked={sec.preventPasswordReuse}
                    onChange={(v) =>
                      setSEC({ ...sec, preventPasswordReuse: v })
                    }
                  />
                  <Toggle
                    label="Enable Two Factor"
                    checked={sec.enableTwoFactor}
                    onChange={(v) => setSEC({ ...sec, enableTwoFactor: v })}
                  />
                </div>
              </SubSec>

              <SubSec title="Login Protection & Audit">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Max failed attempts">
                    <Input
                      type="number"
                      value={sec.maxFailedLoginAttempts}
                      onChange={(e) =>
                        setSEC({
                          ...sec,
                          maxFailedLoginAttempts: Math.max(
                            1,
                            Math.trunc(num(e, 5)),
                          ),
                        })
                      }
                    />
                  </Field>

                  <Field label="Lockout duration (min)">
                    <Input
                      type="number"
                      value={sec.lockoutDurationMinutes}
                      onChange={(e) =>
                        setSEC({
                          ...sec,
                          lockoutDurationMinutes: Math.max(
                            0,
                            Math.trunc(num(e, 15)),
                          ),
                        })
                      }
                    />
                  </Field>

                  <Field label="Retention days">
                    <Input
                      type="number"
                      value={sec.retentionDays}
                      onChange={(e) =>
                        setSEC({
                          ...sec,
                          retentionDays: Math.max(0, Math.trunc(num(e, 90))),
                        })
                      }
                    />
                  </Field>

                  <Field label="Allowed IPs">
                    <TextArea
                      rows={3}
                      value={sec.allowedIPs}
                      onChange={(e) => setSEC({ ...sec, allowedIPs: e })}
                      placeholder="One IP or CIDR per line"
                    />
                  </Field>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Toggle
                    label="Require IP Whitelist"
                    checked={sec.requireIPWhitelist}
                    onChange={(v) => setSEC({ ...sec, requireIPWhitelist: v })}
                  />
                  <Toggle
                    label="Log All Actions"
                    checked={sec.logAllActions}
                    onChange={(v) => setSEC({ ...sec, logAllActions: v })}
                  />
                </div>
              </SubSec>
            </div>
          </Sec>
        )}
        {tab === "backup" && bak && (
          <Sec
            title="Backup"
            description="Configure automatic backups, retention, and export coverage."
            onSave={() => save("backup", bak, "backup", setBAK)}
            saving={saving}
          >
            <div className="space-y-4">
              <SubSec title="Automation">
                <div className="grid gap-3">
                  <Toggle
                    label="Enable Auto Backup"
                    checked={bak.enableAutoBackup}
                    onChange={(v) => setBAK({ ...bak, enableAutoBackup: v })}
                  />
                </div>

                {bak.enableAutoBackup && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Frequency">
                      <Select
                        value={bak.backupFrequency}
                        onChange={(e) => setBAK({ ...bak, backupFrequency: e })}
                        options={[
                          { label: "DAILY", value: "DAILY" },
                          { label: "WEEKLY", value: "WEEKLY" },
                          { label: "MONTHLY", value: "MONTHLY" },
                        ]}
                      />
                    </Field>

                    <Field label="Backup time (HH:MM)">
                      <Input
                        value={bak.backupTime}
                        onChange={(e) => setBAK({ ...bak, backupTime: e })}
                      />
                    </Field>

                    <Field label="Day of week">
                      <Input
                        type="number"
                        value={bak.backupDayOfWeek}
                        onChange={(e) =>
                          setBAK({
                            ...bak,
                            backupDayOfWeek: Math.max(0, Math.trunc(num(e, 0))),
                          })
                        }
                      />
                    </Field>

                    <Field label="Day of month">
                      <Input
                        type="number"
                        value={bak.backupDayOfMonth}
                        onChange={(e) =>
                          setBAK({
                            ...bak,
                            backupDayOfMonth: Math.max(
                              1,
                              Math.trunc(num(e, 1)),
                            ),
                          })
                        }
                      />
                    </Field>

                    <Field label="Retention days">
                      <Input
                        type="number"
                        value={bak.retentionDays}
                        onChange={(e) =>
                          setBAK({
                            ...bak,
                            retentionDays: Math.max(0, Math.trunc(num(e, 30))),
                          })
                        }
                      />
                    </Field>

                    <Field label="Max backup count">
                      <Input
                        type="number"
                        value={bak.maxBackupCount}
                        onChange={(e) =>
                          setBAK({
                            ...bak,
                            maxBackupCount: Math.max(1, Math.trunc(num(e, 10))),
                          })
                        }
                      />
                    </Field>

                    <Field label="Backup destination">
                      <Input
                        value={bak.backupDestination}
                        onChange={(e) =>
                          setBAK({ ...bak, backupDestination: e })
                        }
                      />
                    </Field>

                    <Field label="Cloud provider">
                      <Input
                        value={bak.cloudProvider || ""}
                        onChange={(e) =>
                          setBAK({ ...bak, cloudProvider: e || null })
                        }
                      />
                    </Field>

                    <div className="md:col-span-2">
                      <Field label="Cloud bucket name">
                        <Input
                          value={bak.cloudBucketName || ""}
                          onChange={(e) =>
                            setBAK({ ...bak, cloudBucketName: e || null })
                          }
                        />
                      </Field>
                    </div>
                  </div>
                )}
              </SubSec>

              <SubSec title="Export Coverage">
                <div className="grid gap-3 md:grid-cols-2">
                  <Toggle
                    label="Database Export"
                    checked={bak.enableDatabaseExport}
                    onChange={(v) =>
                      setBAK({ ...bak, enableDatabaseExport: v })
                    }
                  />
                  <Toggle
                    label="Invoice Export"
                    checked={bak.enableInvoiceExport}
                    onChange={(v) => setBAK({ ...bak, enableInvoiceExport: v })}
                  />
                  <Toggle
                    label="Inventory Export"
                    checked={bak.enableInventoryExport}
                    onChange={(v) =>
                      setBAK({ ...bak, enableInventoryExport: v })
                    }
                  />
                  <Toggle
                    label="Financial Export"
                    checked={bak.enableFinancialExport}
                    onChange={(v) =>
                      setBAK({ ...bak, enableFinancialExport: v })
                    }
                  />
                </div>
              </SubSec>
            </div>
          </Sec>
        )}
        {tab === "receipt" && rec && merchant && store && (
          <Sec
            title="Receipt Template"
            description="Customize branding, footer text, logo, and what appears on printed or digital receipts."
            onSave={() => save("receipt", rec, "receipt", setREC)}
            saving={saving}
          >
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <SubSec
                  title="Branding"
                  description="Control the logo and business text shown at the top and bottom of the receipt."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Receipt width">
                      <Select
                        value={rec.receiptWidth}
                        onChange={(e) => setREC({ ...rec, receiptWidth: e })}
                        options={[
                          { label: "80MM", value: "80MM" },
                          { label: "58MM", value: "58MM" },
                        ]}
                      />
                    </Field>

                    <Field label="Printer type">
                      <Select
                        value={rec.printerType}
                        onChange={(e) => setREC({ ...rec, printerType: e })}
                        options={[
                          { label: "THERMAL", value: "THERMAL" },
                          { label: "INKJET", value: "INKJET" },
                          { label: "GENERIC", value: "GENERIC" },
                        ]}
                      />
                    </Field>

                    <Field label="Merchant name on receipt">
                      <input
                        type="text"
                        value={rec.merchantName || ""}
                        onChange={(e) =>
                          setREC({ ...rec, merchantName: e.target.value })
                        }
                        placeholder="VIRNYX POS"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </Field>

                    <Field label="Store name on receipt">
                      <input
                        type="text"
                        value={rec.storeName || ""}
                        onChange={(e) =>
                          setREC({ ...rec, storeName: e.target.value })
                        }
                        placeholder="Sales Receipt"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </Field>

                    <Field
                      label="Receipt Logo"
                      hint="Upload an image file (PNG, JPG, SVG recommended for best print results)"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <label className="relative inline-block">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const f = e.currentTarget.files?.[0];
                                if (f) {
                                  if (f.size > 5 * 1024 * 1024) {
                                    setErr("File must be smaller than 5MB");
                                    return;
                                  }
                                  uploadReceiptLogo(f);
                                }
                              }}
                              disabled={logoUploading}
                              className="hidden"
                            />
                            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm font-medium text-slate-200 cursor-pointer hover:bg-slate-900/80 disabled:opacity-60 disabled:cursor-not-allowed transition">
                              {logoUploading ? (
                                <>
                                  <svg
                                    className="w-4 h-4 animate-spin"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    />
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                  </svg>
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M12 4v16m8-8H4"
                                    />
                                  </svg>
                                  Choose Image
                                </>
                              )}
                            </span>
                          </label>
                          {rec.logoUrl && (
                            <button
                              onClick={() => setREC({ ...rec, logoUrl: null })}
                              className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-200 hover:bg-red-500/20 transition"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        {rec.logoUrl && (
                          <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/40 p-3">
                            <Image
                              src={rec.logoUrl}
                              alt="Receipt logo preview"
                              width={64}
                              height={64}
                              className="rounded-lg object-contain bg-slate-950/50"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-400">
                                Current logo
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {rec.logoUrl}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </Field>

                    <Field label="Use logo on receipt">
                      <Select
                        value={rec.useLogoOnReceipt ? "yes" : "no"}
                        onChange={(e) =>
                          setREC({ ...rec, useLogoOnReceipt: e === "yes" })
                        }
                        options={[
                          { label: "No", value: "no" },
                          { label: "Yes", value: "yes" },
                        ]}
                      />
                    </Field>

                    <div className="md:col-span-2">
                      <Field
                        label="Custom header"
                        hint="Shown near the top of the receipt."
                      >
                        <TextArea
                          rows={3}
                          value={rec.customHeader || ""}
                          onChange={(e) =>
                            setREC({ ...rec, customHeader: e || null })
                          }
                          placeholder="Welcome to Virnyx Mart"
                        />
                      </Field>
                    </div>

                    <div className="md:col-span-2">
                      <Field
                        label="Custom footer"
                        hint="Thank-you note, return policy, or social links."
                      >
                        <TextArea
                          rows={4}
                          value={rec.customFooter || ""}
                          onChange={(e) =>
                            setREC({ ...rec, customFooter: e || null })
                          }
                          placeholder="Thank you for shopping with us."
                        />
                      </Field>
                    </div>
                  </div>
                </SubSec>

                <SubSec
                  title="Header & Business Details"
                  description="Choose what merchant and transaction details to display."
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <Toggle
                      label="Display Logo"
                      checked={rec.displayLogo}
                      onChange={(v) => setREC({ ...rec, displayLogo: v })}
                    />
                    <Toggle
                      label="Display Merchant Name"
                      checked={rec.displayMerchantName}
                      onChange={(v) =>
                        setREC({ ...rec, displayMerchantName: v })
                      }
                    />
                    <Toggle
                      label="Display Store Name"
                      checked={rec.displayStoreName}
                      onChange={(v) => setREC({ ...rec, displayStoreName: v })}
                    />
                    <Toggle
                      label="Display Tax ID"
                      checked={rec.displayTaxId}
                      onChange={(v) => setREC({ ...rec, displayTaxId: v })}
                    />
                    <Toggle
                      label="Display Cashier Name"
                      checked={rec.displayCashierName}
                      onChange={(v) =>
                        setREC({ ...rec, displayCashierName: v })
                      }
                    />
                    <Toggle
                      label="Display Receipt Number"
                      checked={rec.displayReceiptNumber}
                      onChange={(v) =>
                        setREC({ ...rec, displayReceiptNumber: v })
                      }
                    />
                    <Toggle
                      label="Display Timestamp"
                      checked={rec.displayTimestamp}
                      onChange={(v) => setREC({ ...rec, displayTimestamp: v })}
                    />
                  </div>
                </SubSec>

                <SubSec
                  title="Items & Totals"
                  description="Choose which line item and totals data should be shown."
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <Toggle
                      label="Show Product SKU"
                      checked={rec.showProductSKU}
                      onChange={(v) => setREC({ ...rec, showProductSKU: v })}
                    />
                    <Toggle
                      label="Show Product Description"
                      checked={rec.showProductDescription}
                      onChange={(v) =>
                        setREC({ ...rec, showProductDescription: v })
                      }
                    />
                    <Toggle
                      label="Show Unit Price"
                      checked={rec.showUnitPrice}
                      onChange={(v) => setREC({ ...rec, showUnitPrice: v })}
                    />
                    <Toggle
                      label="Show Quantity"
                      checked={rec.showQuantity}
                      onChange={(v) => setREC({ ...rec, showQuantity: v })}
                    />
                    <Toggle
                      label="Show Line Total"
                      checked={rec.showLineTotal}
                      onChange={(v) => setREC({ ...rec, showLineTotal: v })}
                    />
                    <Toggle
                      label="Display Subtotal"
                      checked={rec.displaySubtotal}
                      onChange={(v) => setREC({ ...rec, displaySubtotal: v })}
                    />
                    <Toggle
                      label="Display Tax Breakdown"
                      checked={rec.displayTaxBreakdown}
                      onChange={(v) =>
                        setREC({ ...rec, displayTaxBreakdown: v })
                      }
                    />
                    <Toggle
                      label="Display Total"
                      checked={rec.displayTotal}
                      onChange={(v) => setREC({ ...rec, displayTotal: v })}
                    />
                    <Toggle
                      label="Display Change Due"
                      checked={rec.displayChangeDue}
                      onChange={(v) => setREC({ ...rec, displayChangeDue: v })}
                    />
                    <Toggle
                      label="Show Payment Method"
                      checked={rec.showPaymentMethod}
                      onChange={(v) => setREC({ ...rec, showPaymentMethod: v })}
                    />
                    <Toggle
                      label="Show Payment Reference"
                      checked={rec.showPaymentReference}
                      onChange={(v) =>
                        setREC({ ...rec, showPaymentReference: v })
                      }
                    />
                  </div>
                </SubSec>

                <SubSec
                  title="Output Options"
                  description="Control barcode, QR, and digital delivery options."
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <Toggle
                      label="Print Barcode"
                      checked={rec.printBarcode}
                      onChange={(v) => setREC({ ...rec, printBarcode: v })}
                    />
                    <Toggle
                      label="Print QR Code"
                      checked={rec.printQRCode}
                      onChange={(v) => setREC({ ...rec, printQRCode: v })}
                    />
                    <Toggle
                      label="Enable Email Receipt"
                      checked={rec.enableEmailReceipt}
                      onChange={(v) =>
                        setREC({ ...rec, enableEmailReceipt: v })
                      }
                    />
                    <Toggle
                      label="Enable SMS Receipt"
                      checked={rec.enableSMSReceipt}
                      onChange={(v) => setREC({ ...rec, enableSMSReceipt: v })}
                    />
                  </div>
                </SubSec>
              </div>

              <div>
                <div className="sticky top-4">
                  <SubSec
                    title="Live Preview"
                    description="A simple preview of how your receipt may look."
                  >
                    <div className="rounded-2xl bg-white p-5 text-black shadow-xl">
                      {receiptPreview?.displayLogo &&
                      receiptPreview?.useLogoOnReceipt &&
                      receiptPreview?.logoUrl ? (
                        <div className="mb-3 flex justify-center">
                          {receiptPreview.logoUrl && (
                            <Image
                              src={receiptPreview.logoUrl}
                              alt="Receipt logo"
                              width={64}
                              height={64}
                              className="max-h-16 w-auto object-contain"
                            />
                          )}
                        </div>
                      ) : null}

                      {receiptPreview?.displayMerchantName ? (
                        <div className="text-center text-lg font-bold">
                          {merchant.name || "Merchant Name"}
                        </div>
                      ) : null}

                      {receiptPreview?.displayStoreName ? (
                        <div className="text-center text-sm">
                          {store.name || "Store Name"}
                        </div>
                      ) : null}

                      {receiptPreview?.customHeader ? (
                        <div className="mt-2 whitespace-pre-wrap text-center text-xs text-slate-700">
                          {receiptPreview.customHeader}
                        </div>
                      ) : null}

                      <div className="my-4 border-t border-dashed border-slate-400" />

                      <div className="space-y-1 text-xs">
                        {receiptPreview?.displayReceiptNumber ? (
                          <div className="flex justify-between">
                            <span>Receipt #</span>
                            <span>
                              {sal?.receiptNumberPrefix || "RCP"}-000123
                            </span>
                          </div>
                        ) : null}

                        {receiptPreview?.displayTimestamp ? (
                          <div className="flex justify-between">
                            <span>Date</span>
                            <span>2026-03-16 10:42</span>
                          </div>
                        ) : null}

                        {receiptPreview?.displayCashierName ? (
                          <div className="flex justify-between">
                            <span>Cashier</span>
                            <span>Levi</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="my-4 border-t border-dashed border-slate-400" />

                      <div className="space-y-2 text-xs">
                        <div>
                          <div className="font-semibold">Milo 500g</div>
                          <div className="flex justify-between text-slate-700">
                            <span>
                              {receiptPreview?.showQuantity ? "2 x " : ""}
                              {receiptPreview?.showUnitPrice
                                ? "GHS 15.00"
                                : "Item"}
                            </span>
                            {receiptPreview?.showLineTotal ? (
                              <span>GHS 30.00</span>
                            ) : null}
                          </div>
                          {receiptPreview?.showProductSKU ? (
                            <div className="text-[11px] text-slate-500">
                              SKU: ML-500
                            </div>
                          ) : null}
                          {receiptPreview?.showProductDescription ? (
                            <div className="text-[11px] text-slate-500">
                              Rich chocolate malt drink
                            </div>
                          ) : null}
                        </div>

                        <div>
                          <div className="font-semibold">Coca Cola</div>
                          <div className="flex justify-between text-slate-700">
                            <span>
                              {receiptPreview?.showQuantity ? "1 x " : ""}
                              {receiptPreview?.showUnitPrice
                                ? "GHS 10.00"
                                : "Item"}
                            </span>
                            {receiptPreview?.showLineTotal ? (
                              <span>GHS 10.00</span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="my-4 border-t border-dashed border-slate-400" />

                      <div className="space-y-1 text-xs">
                        {receiptPreview?.displaySubtotal ? (
                          <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>GHS 40.00</span>
                          </div>
                        ) : null}

                        {receiptPreview?.displayTaxBreakdown ? (
                          <div className="flex justify-between">
                            <span>Tax</span>
                            <span>GHS 5.00</span>
                          </div>
                        ) : null}

                        {receiptPreview?.displayTotal ? (
                          <div className="flex justify-between font-bold">
                            <span>Total</span>
                            <span>GHS 45.00</span>
                          </div>
                        ) : null}

                        {receiptPreview?.showPaymentMethod ? (
                          <div className="flex justify-between">
                            <span>Payment</span>
                            <span>Cash</span>
                          </div>
                        ) : null}

                        {receiptPreview?.showPaymentReference ? (
                          <div className="flex justify-between">
                            <span>Reference</span>
                            <span>POS-847201</span>
                          </div>
                        ) : null}

                        {receiptPreview?.displayChangeDue ? (
                          <div className="flex justify-between">
                            <span>Change</span>
                            <span>GHS 5.00</span>
                          </div>
                        ) : null}
                      </div>

                      {receiptPreview?.customFooter ? (
                        <>
                          <div className="my-4 border-t border-dashed border-slate-400" />
                          <div className="whitespace-pre-wrap text-center text-xs text-slate-700">
                            {receiptPreview.customFooter}
                          </div>
                        </>
                      ) : merchant.receiptFooter ? (
                        <>
                          <div className="my-4 border-t border-dashed border-slate-400" />
                          <div className="whitespace-pre-wrap text-center text-xs text-slate-700">
                            {merchant.receiptFooter}
                          </div>
                        </>
                      ) : null}

                      {(receiptPreview?.printBarcode ||
                        receiptPreview?.printQRCode) && (
                        <div className="mt-4 text-center text-[11px] text-slate-500">
                          {receiptPreview?.printBarcode
                            ? "||| || |||| |||"
                            : ""}
                          {receiptPreview?.printBarcode &&
                          receiptPreview?.printQRCode
                            ? " • "
                            : ""}
                          {receiptPreview?.printQRCode ? "[QR]" : ""}
                        </div>
                      )}
                    </div>
                  </SubSec>
                </div>
              </div>
            </div>
          </Sec>
        )}
        {tab === "sales" && sal && (
          <Sec
            title="Sales Behavior"
            description="Define stock, discount, void, and transaction rules."
            onSave={() => save("sales", sal, "sales", setSAL)}
            saving={saving}
          >
            <div className="space-y-4">
              <SubSec title="Thresholds & Numbering">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="text-xs text-slate-500 md:col-span-2">
                    Low stock threshold is controlled in Store Settings and saved on the store record, not the sales settings record.
                  </div>

                  <Field label="Max discount (%)">
                    <Input
                      type="number"
                      value={sal.maxDiscountPercent}
                      onChange={(e) =>
                        setSAL({
                          ...sal,
                          maxDiscountPercent: Math.min(
                            100,
                            Math.max(0, num(e, 50)),
                          ),
                        })
                      }
                    />
                  </Field>

                  <Field label="Auto reorder point">
                    <Input
                      type="number"
                      value={sal.autoReorderPoint}
                      onChange={(e) =>
                        setSAL({
                          ...sal,
                          autoReorderPoint: Math.max(0, Math.trunc(num(e, 0))),
                        })
                      }
                    />
                  </Field>

                  <Field label="Receipt numbering method">
                    <Select
                      value={sal.receiptNumberingMethod}
                      onChange={(e) =>
                        setSAL({ ...sal, receiptNumberingMethod: e })
                      }
                      options={[
                        { label: "AUTO_INCREMENT", value: "AUTO_INCREMENT" },
                        { label: "DATE_BASED", value: "DATE_BASED" },
                        { label: "CUSTOM", value: "CUSTOM" },
                      ]}
                    />
                  </Field>

                  <Field label="Next receipt number">
                    <Input
                      type="number"
                      value={sal.nextReceiptNumber}
                      onChange={(e) =>
                        setSAL({
                          ...sal,
                          nextReceiptNumber: Math.max(1, Math.trunc(num(e, 1))),
                        })
                      }
                    />
                  </Field>

                  <Field label="Receipt prefix">
                    <Input
                      value={sal.receiptNumberPrefix || ""}
                      onChange={(e) =>
                        setSAL({ ...sal, receiptNumberPrefix: e || null })
                      }
                    />
                  </Field>

                  <Field label="Max transaction amount">
                    <Input
                      type="number"
                      step="0.01"
                      value={sal.maxTransactionAmount}
                      onChange={(e) =>
                        setSAL({
                          ...sal,
                          maxTransactionAmount: Math.max(0, num(e, 0)),
                        })
                      }
                    />
                  </Field>

                  <Field label="Min transaction amount">
                    <Input
                      type="number"
                      step="0.01"
                      value={sal.minTransactionAmount}
                      onChange={(e) =>
                        setSAL({
                          ...sal,
                          minTransactionAmount: Math.max(0, num(e, 0)),
                        })
                      }
                    />
                  </Field>

                  <Field label="Discount approval threshold">
                    <Input
                      type="number"
                      step="0.01"
                      value={sal.discountApprovalThreshold}
                      onChange={(e) =>
                        setSAL({
                          ...sal,
                          discountApprovalThreshold: Math.max(0, num(e, 0)),
                        })
                      }
                    />
                  </Field>

                  <Field label="Void approval threshold">
                    <Input
                      type="number"
                      step="0.01"
                      value={sal.voidApprovalThreshold}
                      onChange={(e) =>
                        setSAL({
                          ...sal,
                          voidApprovalThreshold: Math.max(0, num(e, 0)),
                        })
                      }
                    />
                  </Field>
                </div>
              </SubSec>

              <SubSec title="Operational Flags">
                <div className="grid gap-3 md:grid-cols-2">
                  <Toggle
                    label="Allow Negative Stock"
                    checked={sal.allowNegativeStock}
                    onChange={(v) => setSAL({ ...sal, allowNegativeStock: v })}
                  />
                  <Toggle
                    label="Warn Low Stock"
                    checked={sal.warnLowStock}
                    onChange={(v) => setSAL({ ...sal, warnLowStock: v })}
                  />
                  <Toggle
                    label="Enable Discount Approval"
                    checked={sal.enableDiscountApproval}
                    onChange={(v) =>
                      setSAL({ ...sal, enableDiscountApproval: v })
                    }
                  />
                  <Toggle
                    label="Require Approval for Void"
                    checked={sal.requireApprovalForVoid}
                    onChange={(v) =>
                      setSAL({ ...sal, requireApprovalForVoid: v })
                    }
                  />
                  <Toggle
                    label="Allow Offline Void"
                    checked={sal.allowOfflineVoid}
                    onChange={(v) => setSAL({ ...sal, allowOfflineVoid: v })}
                  />
                  <Toggle
                    label="Enable Manual Discount"
                    checked={sal.enableManualDiscount}
                    onChange={(v) =>
                      setSAL({ ...sal, enableManualDiscount: v })
                    }
                  />
                  <Toggle
                    label="Enable Volume Discount"
                    checked={sal.enableVolumeDiscount}
                    onChange={(v) =>
                      setSAL({ ...sal, enableVolumeDiscount: v })
                    }
                  />
                  <Toggle
                    label="Enable Loyalty Discount"
                    checked={sal.enableLoyaltyDiscount}
                    onChange={(v) =>
                      setSAL({ ...sal, enableLoyaltyDiscount: v })
                    }
                  />
                  <Toggle
                    label="Display Item Total On Screen"
                    checked={sal.displayItemTotalOnScreen}
                    onChange={(v) =>
                      setSAL({ ...sal, displayItemTotalOnScreen: v })
                    }
                  />
                  <Toggle
                    label="Display Running Total"
                    checked={sal.displayRunningTotal}
                    onChange={(v) => setSAL({ ...sal, displayRunningTotal: v })}
                  />
                  <Toggle
                    label="Require Customer Name"
                    checked={sal.requireCustomerName}
                    onChange={(v) => setSAL({ ...sal, requireCustomerName: v })}
                  />
                  <Toggle
                    label="Require Customer Phone"
                    checked={sal.requireCustomerPhone}
                    onChange={(v) =>
                      setSAL({ ...sal, requireCustomerPhone: v })
                    }
                  />
                </div>

                <div className="mt-4">
                  <Field label="Price rounding method">
                    <Select
                      value={sal.priceRoundingMethod}
                      onChange={(e) =>
                        setSAL({ ...sal, priceRoundingMethod: e })
                      }
                      options={[
                        { label: "NONE", value: "NONE" },
                        { label: "ROUND_UP", value: "ROUND_UP" },
                        { label: "ROUND_DOWN", value: "ROUND_DOWN" },
                        { label: "NEAREST", value: "NEAREST" },
                      ]}
                    />
                  </Field>
                </div>
              </SubSec>
            </div>
          </Sec>
        )}
        {tab === "integration" && intg && (
          <Sec
            title="Integrations"
            description="Configure external connections, APIs, email, SMS, inventory sync, and accounting."
            onSave={() => save("integration", intg, "integration", setINT)}
            saving={saving}
          >
            <div className="space-y-4">
              <SubSec title="Core Services">
                <div className="grid gap-3 md:grid-cols-2">
                  <Toggle
                    label="Enable API"
                    checked={intg.enableAPI}
                    onChange={(v) => setINT({ ...intg, enableAPI: v })}
                  />
                  <Toggle
                    label="Enable SMS"
                    checked={intg.enableSMS}
                    onChange={(v) => setINT({ ...intg, enableSMS: v })}
                  />
                  <Toggle
                    label="Enable Email"
                    checked={intg.enableEmail}
                    onChange={(v) => setINT({ ...intg, enableEmail: v })}
                  />
                  <Toggle
                    label="Enable Inventory Sync"
                    checked={intg.enableInventorySync}
                    onChange={(v) =>
                      setINT({ ...intg, enableInventorySync: v })
                    }
                  />
                  <Toggle
                    label="Enable Accounting Sync"
                    checked={intg.enableAccountingSync}
                    onChange={(v) =>
                      setINT({ ...intg, enableAccountingSync: v })
                    }
                  />
                </div>
              </SubSec>

              {intg.enableAPI && (
                <SubSec title="API Credentials">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="API Key">
                      <Input
                        type="password"
                        value={intg.apiKey || ""}
                        onChange={(e) => setINT({ ...intg, apiKey: e || null })}
                      />
                    </Field>

                    <Field label="API Secret">
                      <Input
                        type="password"
                        value={intg.apiSecret || ""}
                        onChange={(e) =>
                          setINT({ ...intg, apiSecret: e || null })
                        }
                      />
                    </Field>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Toggle
                      label="Webhook on Sale"
                      checked={intg.enableWebhookOnSale}
                      onChange={(v) =>
                        setINT({ ...intg, enableWebhookOnSale: v })
                      }
                    />
                    <Toggle
                      label="Webhook on Refund"
                      checked={intg.enableWebhookOnRefund}
                      onChange={(v) =>
                        setINT({ ...intg, enableWebhookOnRefund: v })
                      }
                    />
                    <Toggle
                      label="Webhook on Payment"
                      checked={intg.enableWebhookOnPayment}
                      onChange={(v) =>
                        setINT({ ...intg, enableWebhookOnPayment: v })
                      }
                    />
                    <Toggle
                      label="Webhook on Inventory"
                      checked={intg.enableWebhookOnInventory}
                      onChange={(v) =>
                        setINT({ ...intg, enableWebhookOnInventory: v })
                      }
                    />
                  </div>
                </SubSec>
              )}

              <SubSec title="Providers & Sync">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="SMS provider">
                    <Input
                      value={intg.smsProvider || ""}
                      onChange={(e) =>
                        setINT({ ...intg, smsProvider: e || null })
                      }
                    />
                  </Field>

                  <Field label="Email provider">
                    <Input
                      value={intg.emailProvider}
                      onChange={(e) => setINT({ ...intg, emailProvider: e })}
                    />
                  </Field>

                  {intg.enableInventorySync && (
                    <Field label="Inventory sync frequency">
                      <Select
                        value={intg.inventorySyncFrequency}
                        onChange={(e) =>
                          setINT({ ...intg, inventorySyncFrequency: e })
                        }
                        options={[
                          { label: "REALTIME", value: "REALTIME" },
                          { label: "HOURLY", value: "HOURLY" },
                          { label: "DAILY", value: "DAILY" },
                        ]}
                      />
                    </Field>
                  )}

                  {intg.enableAccountingSync && (
                    <Field label="Accounting system">
                      <Select
                        value={intg.accountingSystem || ""}
                        onChange={(e) =>
                          setINT({ ...intg, accountingSystem: e || null })
                        }
                        options={[
                          { label: "XERO", value: "XERO" },
                          { label: "QUICKBOOKS", value: "QUICKBOOKS" },
                          { label: "MYOB", value: "MYOB" },
                        ]}
                      />
                    </Field>
                  )}

                  <div className="md:col-span-2">
                    <Field label="Integrated services">
                      <TextArea
                        rows={3}
                        value={intg.integratedServices}
                        onChange={(e) =>
                          setINT({ ...intg, integratedServices: e })
                        }
                        placeholder="Describe connected services or notes"
                      />
                    </Field>
                  </div>
                </div>
              </SubSec>
            </div>
          </Sec>
        )}
      </div>
    </Guard>
  );
}

function Sec({
  title,
  description,
  onSave,
  saving,
  children,
  actions,
}: {
  title: string;
  description?: string;
  onSave?: () => void;
  saving?: boolean;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-800/80 bg-[#0f1c3f]/50 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-md">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          {description ? (
            <p className="mt-2 text-sm text-slate-400">{description}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {actions}
          {onSave ? (
            <Guard perm="settings:write">
              <button
                type="button"
                disabled={saving}
                onClick={onSave}
                className={[
                  "rounded-2xl px-4 py-2.5 text-sm font-medium transition flex items-center gap-2 whitespace-nowrap",
                  saving
                    ? "bg-indigo-500/20 border border-indigo-400/40 text-indigo-100 cursor-not-allowed opacity-70"
                    : "border border-indigo-500/40 bg-indigo-500/25 text-indigo-100 hover:bg-indigo-500/35 hover:border-indigo-400/60",
                ].join(" ")}
              >
                {saving ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </Guard>
          ) : null}
        </div>
      </div>

      {children}
    </section>
  );
}

function SubSec({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-5 backdrop-blur-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        {description ? (
          <p className="mt-1.5 text-xs text-slate-450">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm font-medium text-slate-300">{label}</div>
      {children}
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </label>
  );
}

function Input({
  value,
  onChange,
  type = "text",
  step,
  placeholder = "",
}: {
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
}) {
  const [showPassword, setShowPassword] = React.useState(false);
  const isPasswordField = type === "password";
  const inputType = isPasswordField
    ? showPassword
      ? "text"
      : "password"
    : type;

  return (
    <div className="relative w-full">
      <input
        type={inputType}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-700/50 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/30 hover:border-slate-600/80"
      />
      {isPasswordField && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          onMouseDown={(e) => e.preventDefault()}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
          title={showPassword ? "Hide" : "Show"}
        >
          {showPassword ? (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

function TextArea({
  value,
  onChange,
  rows = 4,
  placeholder = "",
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-slate-700/50 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/30 hover:border-slate-600/80 resize-none"
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
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title="Select option"
        className="w-full appearance-none rounded-2xl border border-slate-700 bg-[#041127] px-4 py-3 pr-10 text-sm text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
        ▼
      </span>
    </div>
  );
}

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
  // eslint-disable no-unescaped-entities, jsx-a11y/no-static-element-interactions
  const switchProps: {
    role: "switch";
    "aria-checked": boolean;
    "aria-disabled"?: boolean;
  } = {
    role: "switch",
    "aria-checked": checked,
    "aria-disabled": disabled,
  };

  return (
    <div
      {...switchProps}
      tabIndex={disabled ? -1 : 0}
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      className={[
        "flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition",
        checked
          ? "border-indigo-500/40 bg-indigo-500/15"
          : "border-slate-700/50 bg-slate-950/40",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:border-slate-600/80",
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-200">{label}</div>
        {hint ? (
          <div className="mt-1 text-xs text-slate-450">{hint}</div>
        ) : null}
      </div>

      <div
        className={[
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
          checked
            ? "border-indigo-400/50 bg-indigo-500/40"
            : "border-slate-600/50 bg-slate-800/60",
        ].join(" ")}
      >
        <div
          className={[
            "absolute top-1/2 left-0.5 h-5 w-5 -translate-y-1/2 rounded-full transition-transform",
            checked ? "translate-x-5 bg-indigo-50" : "bg-slate-300",
          ].join(" ")}
        />
      </div>
    </div>
  );
}
