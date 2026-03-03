"use client";

import { useEffect, useMemo, useState } from "react";
import Guard from "@/components/admin/Guard";

type RefundableItem = {
  saleItemId: string;
  productId: string;
  name: string;
  soldQty: number;
  refundedQty: number;
  remainingQty: number;
  priceSnap: number;
  lineTotal: number;
};

type RefundableResponse = {
  saleId: string;
  status: string;
  items: RefundableItem[];
};

type Refund = {
  id: string;
  saleId: string;
  cashierId: string;
  shiftSessionId: string;
  reason: string | null;
  restock: boolean;
  amount: number;
  createdAt: string;
  items: Array<{
    id: string;
    saleItemId: string;
    productId: string;
    qty: number;
    amount: number;
  }>;
};

function money(n: number) {
  return `GHS ${Number(n ?? 0).toFixed(2)}`;
}

export default function RefundsPage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Lookup
  const [receiptNo, setReceiptNo] = useState("");
  const [dateHint, setDateHint] = useState(today);
  const [saleId, setSaleId] = useState<string | null>(null);

  // refundable + refunds
  const [refundable, setRefundable] = useState<RefundableResponse | null>(null);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(false);

  // refund form
  const [restock, setRestock] = useState(true);
  const [reason, setReason] = useState("");
  const [qtyMap, setQtyMap] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const loadSale = async (id: string) => {
    setLoading(true);
    setErr(null);
    setOkMsg(null);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/sales/${encodeURIComponent(id)}/refundable-items`, { cache: "no-store" }),
        fetch(`/api/sales/${encodeURIComponent(id)}/refunds`, { cache: "no-store" }),
      ]);

      const refundableBody = r1.ok ? ((await r1.json()) as RefundableResponse) : null;
      const refundsBody = r2.ok ? await r2.json() : { refunds: [] };

      setRefundable(refundableBody);
      setRefunds(Array.isArray(refundsBody?.refunds) ? refundsBody.refunds : []);

      // reset qty inputs
      setQtyMap({});
    } finally {
      setLoading(false);
    }
  };

  const findByReceipt = async () => {
    setErr(null);
    setOkMsg(null);
    setSaleId(null);
    setRefundable(null);
    setRefunds([]);

    const rn = receiptNo.trim();
    if (!rn) return setErr("Enter a receipt number");

    setLoading(true);
    try {
      const res = await fetch(
        `/api/sales/find?receiptNo=${encodeURIComponent(rn)}&date=${encodeURIComponent(dateHint)}`,
        { cache: "no-store" }
      );
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErr(body?.message || "Sale not found");
        return;
      }

      const id = body.saleId as string;
      setSaleId(id);
      await loadSale(id);
    } finally {
      setLoading(false);
    }
  };

  const calcTotal = () => {
    if (!refundable) return 0;
    let total = 0;
    for (const it of refundable.items) {
      const raw = qtyMap[it.saleItemId];
      const qty = Math.trunc(Number(raw));
      if (!Number.isFinite(qty) || qty <= 0) continue;
      total += it.priceSnap * qty;
    }
    return Math.round(total * 100) / 100;
  };

  const submitRefund = async () => {
    if (!saleId || !refundable) return;

    setErr(null);
    setOkMsg(null);

    const items = refundable.items
      .map((it) => {
        const qty = Math.trunc(Number(qtyMap[it.saleItemId]));
        return { saleItemId: it.saleItemId, qty };
      })
      .filter((x) => Number.isFinite(x.qty) && x.qty > 0);

    if (items.length === 0) return setErr("Select at least one item qty");

    // UI-level validation (backend will enforce too)
    for (const it of items) {
      const row = refundable.items.find((x) => x.saleItemId === it.saleItemId);
      if (!row) continue;
      if (it.qty > row.remainingQty) {
        return setErr(`Over refund for "${row.name}" (max ${row.remainingQty})`);
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/sales/${encodeURIComponent(saleId)}/refunds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason.trim() || undefined,
          restock,
          items,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(body?.message || "Refund failed");
        return;
      }

      setOkMsg(`Refund created: ${money(body?.refund?.amount ?? calcTotal())}`);
      setReason("");
      setQtyMap({});
      await loadSale(saleId);
    } finally {
      setSubmitting(false);
    }
  };

  const total = calcTotal();

  return (
    <Guard perm="sales:read">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Refunds</h1>
          <div className="text-sm text-slate-400">Process refunds by receipt</div>
        </div>

        {/* Lookup card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <div className="mb-1 text-xs text-slate-400">Receipt No</div>
              <input
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
                placeholder="VRX-YYYYMMDD-000001"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </label>

            <label className="block">
              <div className="mb-1 text-xs text-slate-400">Date hint</div>
              <input
                type="date"
                value={dateHint}
                max={today}
                onChange={(e) => setDateHint(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </label>

            <div className="flex items-end gap-2">
              <button
                onClick={findByReceipt}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm hover:bg-slate-900/60"
                disabled={loading}
              >
                {loading ? "Searching..." : "Load sale"}
              </button>
            </div>
          </div>

          {saleId ? (
            <div className="mt-3 text-xs text-slate-500">Sale ID: {saleId}</div>
          ) : null}

          {err ? (
            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {err}
            </div>
          ) : null}

          {okMsg ? (
            <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {okMsg}
            </div>
          ) : null}
        </div>

        {/* Refund form */}
        <Guard perm="sales:write">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Create refund</h2>
                <div className="text-xs text-slate-500">
                  Select item quantities (max remaining)
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={restock}
                    onChange={(e) => setRestock(e.target.checked)}
                  />
                  Restock
                </label>

                <div className="text-sm text-slate-300">
                  Total: <span className="text-slate-100 font-medium">{money(total)}</span>
                </div>

                <button
                  disabled={!saleId || !refundable || submitting}
                  onClick={submitRefund}
                  className="rounded-xl border border-indigo-500/30 bg-indigo-500/20 px-4 py-2 text-sm hover:bg-indigo-500/30 disabled:opacity-60"
                >
                  {submitting ? "Processing..." : "Refund"}
                </button>
              </div>
            </div>

            <div className="mt-3">
              <label className="block">
                <div className="mb-1 text-xs text-slate-400">Reason (optional)</div>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Damaged item / Wrong item / Customer return"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </label>
            </div>

            <div className="mt-4 overflow-auto rounded-xl border border-slate-800">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                      Item
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                      Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                      Sold
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                      Refunded
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                      Remaining
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                      Refund qty
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {!saleId ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-400" colSpan={6}>
                        Load a sale first.
                      </td>
                    </tr>
                  ) : loading ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-400" colSpan={6}>
                        Loading refundable items...
                      </td>
                    </tr>
                  ) : refundable?.items?.length ? (
                    refundable.items.map((it) => (
                      <tr key={it.saleItemId} className="hover:bg-slate-900/30">
                        <td className="px-4 py-3 text-slate-100 font-medium">{it.name}</td>
                        <td className="px-4 py-3 text-right text-slate-100">{money(it.priceSnap)}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{it.soldQty}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{it.refundedQty}</td>
                        <td className="px-4 py-3 text-right text-slate-100">{it.remainingQty}</td>
                        <td className="px-4 py-3 text-right">
                          <input
                            value={qtyMap[it.saleItemId] ?? ""}
                            onChange={(e) =>
                              setQtyMap((m) => ({ ...m, [it.saleItemId]: e.target.value }))
                            }
                            inputMode="numeric"
                            placeholder="0"
                            className="w-24 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-right outline-none focus:ring-2 focus:ring-indigo-500/40"
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-6 text-slate-400" colSpan={6}>
                        No refundable items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-2 text-xs text-slate-500">
              Tip: enter quantities only for items you want to refund.
            </div>
          </div>
        </Guard>

        {/* Recent refunds for this sale */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-lg font-semibold">Refund history (this sale)</h2>

          {!saleId ? (
            <div className="mt-3 text-sm text-slate-400">Load a sale to see refunds.</div>
          ) : refunds.length === 0 ? (
            <div className="mt-3 text-sm text-slate-400">No refunds yet.</div>
          ) : (
            <div className="mt-3 space-y-2">
              {refunds.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/30 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-100">
                      {money(r.amount)} • {r.restock ? "Restocked" : "No restock"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(r.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {r.reason ? (
                    <div className="mt-1 text-xs text-slate-300">{r.reason}</div>
                  ) : null}

                  <div className="mt-2 text-xs text-slate-400">
                    Items:{" "}
                    <span className="text-slate-300">
                      {r.items.map((x) => `${x.qty}x`).join(" ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Guard>
  );
}