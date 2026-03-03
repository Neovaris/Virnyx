"use client";

import { useEffect, useMemo, useState } from "react";
import Guard from "@/components/admin/Guard";

type Product = {
  id: string;
  name: string;
  price: number;
  sku: string | null;
  barcode: string | null;
  createdAt: string;
};

type ProductsList = {
  page: number;
  limit: number;
  total: number;
  pages: number;
  items: Product[];
};

function money(n: number) {
  return `GHS ${Number(n ?? 0).toFixed(2)}`;
}

export default function ProductsPage() {
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");

  const [sort, setSort] = useState<"createdAt" | "name" | "price">("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [data, setData] = useState<ProductsList | null>(null);
  const [loading, setLoading] = useState(true);

  // modal state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", price: "", sku: "", barcode: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(q.trim()), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/products?q=${encodeURIComponent(qDebounced)}&page=${page}&limit=${limit}&sort=${sort}&order=${order}`,
        { cache: "no-store" }
      );
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
  }, [qDebounced, page, sort, order]);

  const pages = data?.pages ?? 1;
  const items = data?.items ?? [];

  const openCreate = () => {
    setErr(null);
    setEditing(null);
    setForm({ name: "", price: "", sku: "", barcode: "" });
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setErr(null);
    setEditing(p);
    setForm({
      name: p.name ?? "",
      price: String(p.price ?? 0),
      sku: p.sku ?? "",
      barcode: p.barcode ?? "",
    });
    setOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setOpen(false);
  };

  const submit = async () => {
    setErr(null);

    const name = form.name.trim();
    const priceNum = Number(form.price);

    if (!name) return setErr("Name is required");
    if (!Number.isFinite(priceNum) || priceNum < 0) return setErr("Price must be a number >= 0");

    const payload: any = {
      name,
      price: priceNum,
      sku: form.sku.trim() || undefined,
      barcode: form.barcode.trim() || undefined,
    };

    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/products/${editing.id}` : `/api/products`, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(body?.message || "Failed to save product");
        return;
      }

      setOpen(false);
      await fetchList();
    } finally {
      setSaving(false);
    }
  };

  const del = async (p: Product) => {
    const ok = confirm(`Delete "${p.name}"? (soft delete)`);
    if (!ok) return;

    const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(body?.message || "Failed to delete");
      return;
    }
    await fetchList();
  };

  const toggleSort = (field: "createdAt" | "name" | "price") => {
    setPage(1);
    if (sort !== field) {
      setSort(field);
      setOrder("desc");
      return;
    }
    setOrder((o) => (o === "asc" ? "desc" : "asc"));
  };

  return (
    <Guard perm="products:read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Products</h1>
            <div className="text-sm text-slate-400">
              {data?.total ?? 0} product(s)
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

            <Guard perm="products:write">
              <button
                onClick={openCreate}
                className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm hover:bg-slate-900/60"
              >
                + New Product
              </button>
            </Guard>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/60">
                <tr>
                  <Th label="Name" onClick={() => toggleSort("name")} active={sort === "name"} dir={order} />
                  <Th label="SKU" />
                  <Th label="Barcode" />
                  <Th label="Price" right onClick={() => toggleSort("price")} active={sort === "price"} dir={order} />
                  <Th label="Created" right onClick={() => toggleSort("createdAt")} active={sort === "createdAt"} dir={order} />
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-400" colSpan={6}>
                      Loading products...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-400" colSpan={6}>
                      No products found.
                    </td>
                  </tr>
                ) : (
                  items.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-900/30">
                      <td className="px-4 py-3 text-slate-100 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-slate-300">{p.sku ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-300">{p.barcode ?? "-"}</td>
                      <td className="px-4 py-3 text-right text-slate-100">{money(p.price)}</td>
                      <td className="px-4 py-3 text-right text-slate-400">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Guard perm="products:write">
                            <button
                              onClick={() => openEdit(p)}
                              className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-xs hover:bg-slate-900/60"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => del(p)}
                              className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-xs hover:bg-red-500/10 hover:text-red-300"
                            >
                              Delete
                            </button>
                          </Guard>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <div className="text-xs text-slate-500">
              Page {page} of {pages} • {data?.total ?? 0} total
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
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm disabled:opacity-50 hover:bg-slate-900/60"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Modal */}
        {open ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={closeModal}
            />

            <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {editing ? "Edit Product" : "New Product"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Fields: name, price, sku, barcode
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
                <Field label="Name">
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Price (GHS)">
                    <input
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      inputMode="decimal"
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </Field>

                  <Field label="SKU (optional)">
                    <input
                      value={form.sku}
                      onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </Field>
                </div>

                <Field label="Barcode (optional)">
                  <input
                    value={form.barcode}
                    onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
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

                  <Guard perm="products:write">
                    <button
                      disabled={saving}
                      onClick={submit}
                      className="rounded-xl border border-indigo-500/30 bg-indigo-500/20 px-4 py-2 text-sm hover:bg-indigo-500/30 disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </Guard>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Guard>
  );
}

function Th({
  label,
  right,
  onClick,
  active,
  dir,
}: {
  label: string;
  right?: boolean;
  onClick?: () => void;
  active?: boolean;
  dir?: "asc" | "desc";
}) {
  const clickable = Boolean(onClick);
  return (
    <th
      onClick={onClick}
      className={[
        "px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-400",
        right ? "text-right" : "text-left",
        clickable ? "cursor-pointer select-none hover:text-slate-200" : "",
      ].join(" ")}
      title={clickable ? "Sort" : undefined}
    >
      <span className="inline-flex items-center gap-2">
        {label}
        {active ? <span className="text-slate-500">{dir === "asc" ? "↑" : "↓"}</span> : null}
      </span>
    </th>
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