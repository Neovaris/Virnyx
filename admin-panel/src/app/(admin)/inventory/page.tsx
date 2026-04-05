"use client";

import { useEffect, useState } from "react";
import Guard from "@/components/admin/Guard";
import { SkeletonInventory } from "@/components/admin/SkeletonLoader";

type InventoryRow = {
  productId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  onHand: number;
  reserved: number;
  available: number;
  updatedAt: string | null;
};

type InventoryList = {
  page: number;
  limit: number;
  total: number;
  pages: number;
  items: InventoryRow[];
};

type LedgerItem = {
  id: string;
  productId: string;
  productName: string | null;
  type: "IN" | "OUT" | "ADJUST";
  qtyChange: number;
  unitCost: number | null;
  reference: string;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
};

function money(n: number) {
  return `GHS ${Number(n ?? 0).toFixed(2)}`;
}

export default function InventoryPage() {
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [lowStock, setLowStock] = useState<string>(""); // "" = off, else number string
  const [data, setData] = useState<InventoryList | null>(null);
  const [loading, setLoading] = useState(true);

  // modal
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [selected, setSelected] = useState<InventoryRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // form fields
  const [qty, setQty] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [note, setNote] = useState("");
  const [newOnHand, setNewOnHand] = useState(""); // adjust option

  // ledger drawer
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerItems, setLedgerItems] = useState<LedgerItem[]>([]);
  const [ledgerFor, setLedgerFor] = useState<InventoryRow | null>(null);

  const [storeSettings, setStoreSettings] = useState<{
    lowStockThreshold: number;
  } | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(q.trim()), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const loadStore = async () => {
      try {
        const res = await fetch("/api/settings/store", {
          cache: "no-store",
          credentials: "include",
        });

        const json = await res.json();
        setStoreSettings(json?.store ?? null);
      } catch {
        setStoreSettings(null);
      }
    };

    loadStore();
  }, []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const url =
        `/api/inventory?q=${encodeURIComponent(qDebounced)}&page=${page}&limit=${limit}` +
        (lowStock.trim()
          ? `&lowStock=${encodeURIComponent(lowStock.trim())}`
          : "");
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        setData(null);
        return;
      }
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced, page, lowStock]);

  const items = data?.items ?? [];

  const openAction = (m: "IN" | "OUT" | "ADJUST", row: InventoryRow) => {
    setErr(null);
    setMode(m);
    setSelected(row);
    setQty("");
    setUnitCost("");
    setNote("");
    setNewOnHand("");
    setOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setOpen(false);
  };

  const submit = async () => {
    if (!selected) return;

    setErr(null);
    setSaving(true);

    try {
      if (mode === "IN") {
        const qtyNum = Math.trunc(Number(qty));
        const unitCostNum = unitCost.trim() ? Number(unitCost) : undefined;

        if (!Number.isFinite(qtyNum) || qtyNum <= 0)
          return setErr("qty must be > 0");
        if (
          unitCostNum !== undefined &&
          (!Number.isFinite(unitCostNum) || unitCostNum < 0)
        )
          return setErr("unitCost must be >= 0");

        const res = await fetch("/api/inventory/stock-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: selected.productId,
            qty: qtyNum,
            unitCost: unitCostNum,
            note: note.trim() || undefined,
          }),
        });

        const body = await res.json().catch(() => ({}));
        if (!res.ok) return setErr(body?.message || "Stock-in failed");
      }

      if (mode === "OUT") {
        const qtyNum = Math.trunc(Number(qty));
        if (!Number.isFinite(qtyNum) || qtyNum <= 0)
          return setErr("qty must be > 0");

        const res = await fetch("/api/inventory/stock-out", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: selected.productId,
            qty: qtyNum,
            note: note.trim() || undefined,
          }),
        });

        const body = await res.json().catch(() => ({}));
        if (!res.ok) return setErr(body?.message || "Stock-out failed");
      }

      if (mode === "ADJUST") {
        const hasNew = newOnHand.trim() !== "";
        const hasDelta = qty.trim() !== "";

        if ((hasNew && hasDelta) || (!hasNew && !hasDelta)) {
          return setErr("Provide exactly one: newOnHand OR qtyChange");
        }

        const payload: {
          productId: string;
          note?: string;
          newOnHand?: number;
          qtyChange?: number;
        } = {
          productId: selected.productId,
          note: note.trim() || undefined,
        };

        if (hasNew) {
          const v = Math.trunc(Number(newOnHand));
          if (!Number.isFinite(v) || v < 0)
            return setErr("newOnHand must be integer >= 0");
          payload.newOnHand = v;
        } else {
          const v = Math.trunc(Number(qty));
          if (!Number.isFinite(v) || v === 0)
            return setErr("qtyChange must be non-zero integer");
          payload.qtyChange = v;
        }

        const res = await fetch("/api/inventory/adjust", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const body = await res.json().catch(() => ({}));
        if (!res.ok) return setErr(body?.message || "Adjust failed");
      }

      setOpen(false);
      await fetchList();
    } finally {
      setSaving(false);
    }
  };

  const openLedger = async (row: InventoryRow) => {
    setLedgerFor(row);
    setLedgerOpen(true);
    setLedgerLoading(true);
    try {
      const res = await fetch(
        `/api/inventory/ledger?productId=${encodeURIComponent(row.productId)}&page=1&limit=50`,
        {
          cache: "no-store",
        },
      );
      const body = await res.json().catch(() => ({}));
      setLedgerItems(body?.items ?? []);
    } finally {
      setLedgerLoading(false);
    }
  };

  const lowStockActive = lowStock.trim() !== "";

  return (
    <Guard perm="inventory:read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Inventory</h1>
            <div className="text-sm text-slate-400">
              {data?.total ?? 0} item(s)
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder="Search name / SKU / barcode…"
              className="w-full sm:w-80 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
            />

            <input
              value={lowStock}
              onChange={(e) => {
                setPage(1);
                setLowStock(e.target.value);
              }}
              placeholder={`Low stock ≤ (default: ${storeSettings?.lowStockThreshold ?? 0})`}
              inputMode="numeric"
              className="w-full sm:w-44 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
            />

            {lowStockActive ? (
              <button
                onClick={() => setLowStock("")}
                className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm hover:bg-slate-900/60"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/60">
                <tr>
                  <Th label="Product" />
                  <Th label="SKU" />
                  <Th label="Price" right />
                  <Th label="On hand" right />
                  <Th label="Reserved" right />
                  <Th label="Available" right />
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td className="px-4 py-0" colSpan={7}>
                      <SkeletonInventory />
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-400" colSpan={7}>
                      No inventory items found.
                    </td>
                  </tr>
                ) : (
                  items.map((r) => {
                    const threshold =
                      lowStockActive && lowStock.trim()
                        ? Number(lowStock)
                        : (storeSettings?.lowStockThreshold ?? 0);

                    const low = r.onHand <= threshold;

                    return (
                      <tr key={r.productId} className="hover:bg-slate-900/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-slate-100">
                              {r.name}
                            </div>
                            {low ? (
                              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200">
                                Low
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-slate-500">
                            {r.barcode ? `Barcode: ${r.barcode}` : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {r.sku ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-100">
                          {money(r.price)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-100">
                          {r.onHand}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">
                          {r.reserved}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-100">
                          {r.available}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex flex-wrap items-center gap-2 justify-end">
                            <button
                              onClick={() => openLedger(r)}
                              className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-xs hover:bg-slate-900/60"
                            >
                              Ledger
                            </button>

                            <Guard perm="inventory:write">
                              <button
                                onClick={() => openAction("IN", r)}
                                className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-xs hover:bg-slate-900/60"
                              >
                                Stock In
                              </button>
                              <button
                                onClick={() => openAction("OUT", r)}
                                className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-xs hover:bg-slate-900/60"
                              >
                                Stock Out
                              </button>
                              <button
                                onClick={() => openAction("ADJUST", r)}
                                className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-xs hover:bg-slate-900/60"
                              >
                                Adjust
                              </button>
                            </Guard>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <div className="text-xs text-slate-500">
              Page {page} of {data?.pages ?? 1} • {data?.total ?? 0} total
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm disabled:opacity-50 hover:bg-slate-900/60"
              >
                Prev
              </button>
              <button
                disabled={page >= (data?.pages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm disabled:opacity-50 hover:bg-slate-900/60"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Action Modal */}
        {open && selected ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={closeModal}
            />

            <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {mode === "IN"
                      ? "Stock In"
                      : mode === "OUT"
                        ? "Stock Out"
                        : "Adjust Stock"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selected.name} • On hand: {selected.onHand} • Available:{" "}
                    {selected.available}
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  className="rounded-lg border border-slate-800 bg-slate-900/40 px-2 py-1 text-sm hover:bg-slate-900/60"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {mode === "ADJUST" ? (
                  <>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3 text-xs text-slate-400">
                      Provide <b>either</b>{" "}
                      <span className="text-slate-200">newOnHand</span> or{" "}
                      <span className="text-slate-200">qtyChange</span> (not
                      both).
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="newOnHand (sets exact value)">
                        <input
                          value={newOnHand}
                          onChange={(e) => setNewOnHand(e.target.value)}
                          inputMode="numeric"
                          className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                        />
                      </Field>

                      <Field label="qtyChange (adds/subtracts)">
                        <input
                          value={qty}
                          onChange={(e) => setQty(e.target.value)}
                          inputMode="numeric"
                          placeholder="e.g. -2 or 5"
                          className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                        />
                      </Field>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Qty">
                        <input
                          value={qty}
                          onChange={(e) => setQty(e.target.value)}
                          inputMode="numeric"
                          className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                        />
                      </Field>

                      {mode === "IN" ? (
                        <Field label="Unit cost (optional)">
                          <input
                            value={unitCost}
                            onChange={(e) => setUnitCost(e.target.value)}
                            inputMode="decimal"
                            className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                          />
                        </Field>
                      ) : (
                        <div />
                      )}
                    </div>
                  </>
                )}

                <Field label="Note (optional)">
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </Field>

                {err ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {err}
                  </div>
                ) : null}

                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    onClick={closeModal}
                    className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm hover:bg-slate-900/60"
                  >
                    Cancel
                  </button>

                  <Guard perm="inventory:write">
                    <button
                      disabled={saving}
                      onClick={submit}
                      className="rounded-xl border border-indigo-500/30 bg-indigo-500/20 px-4 py-2 text-sm hover:bg-indigo-500/30 disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Confirm"}
                    </button>
                  </Guard>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Ledger Drawer */}
        {ledgerOpen && ledgerFor ? (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setLedgerOpen(false)}
            />

            <div className="relative h-full w-full max-w-xl border-l border-slate-800 bg-slate-950 p-5 overflow-auto">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Ledger</h2>
                  <p className="text-xs text-slate-500">
                    {ledgerFor.name} • last 50 movements
                  </p>
                </div>

                <button
                  onClick={() => setLedgerOpen(false)}
                  className="rounded-lg border border-slate-800 bg-slate-900/40 px-2 py-1 text-sm hover:bg-slate-900/60"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {ledgerLoading ? (
                  <div className="text-slate-400 text-sm">
                    Loading ledger...
                  </div>
                ) : ledgerItems.length === 0 ? (
                  <div className="text-slate-400 text-sm">
                    No ledger entries.
                  </div>
                ) : (
                  ledgerItems.map((x) => (
                    <div
                      key={x.id}
                      className="rounded-xl border border-slate-800 bg-slate-900/30 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-slate-100">
                          {x.type}{" "}
                          <span className="text-slate-400">
                            {x.qtyChange > 0 ? `+${x.qtyChange}` : x.qtyChange}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(x.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        Ref:{" "}
                        <span className="text-slate-300">{x.reference}</span>
                        {x.unitCost !== null ? (
                          <span className="text-slate-500">
                            {" "}
                            • unitCost: {money(x.unitCost)}
                          </span>
                        ) : null}
                      </div>

                      {x.note ? (
                        <div className="mt-2 text-xs text-slate-300">
                          {x.note}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Guard>
  );
}

function Th({ label, right }: { label: string; right?: boolean }) {
  return (
    <th
      className={[
        "px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-400",
        right ? "text-right" : "text-left",
      ].join(" ")}
    >
      {label}
    </th>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-slate-400">{label}</div>
      {children}
    </label>
  );
}
