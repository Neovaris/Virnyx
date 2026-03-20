"use client";

import { useEffect, useState } from "react";
import Guard from "@/components/admin/Guard";

type DiscountRule = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  type: "FIXED" | "PERCENTAGE" | "BOGO" | "TIERED";
  value: number;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  isActive: boolean;
  usageCount: number;
  maxUsesTotal: number | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

type DiscountRulesList = {
  data: DiscountRule[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

type DiscountFormState = {
  name: string;
  code: string;
  description: string;
  type: "FIXED" | "PERCENTAGE" | "BOGO" | "TIERED";
  value: string;
  minOrderAmount: string;
  maxDiscount: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  maxUsesTotal: string;
};

const defaultForm: DiscountFormState = {
  name: "",
  code: "",
  description: "",
  type: "FIXED",
  value: "",
  minOrderAmount: "",
  maxDiscount: "",
  isActive: true,
  startsAt: "",
  endsAt: "",
  maxUsesTotal: "",
};

export default function DiscountsPage() {
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [data, setData] = useState<DiscountRulesList | null>(null);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountRule | null>(null);
  const [form, setForm] = useState<DiscountFormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        page: String(page),
        limit: String(limit),
      });

      if (activeOnly) params.set("active", "true");

      const res = await fetch(`/api/discounts/rules?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });

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
  }, [search, activeOnly, page]);

  const pages = data?.pagination.pages ?? 1;
  const items = data?.data ?? [];

  const openCreate = () => {
    setErr(null);
    setEditing(null);
    setForm(defaultForm);
    setOpen(true);
  };

  const openEdit = (rule: DiscountRule) => {
    setErr(null);
    setEditing(rule);
    setForm({
      name: rule.name || "",
      code: rule.code || "",
      description: rule.description || "",
      type: rule.type,
      value: String(rule.value || 0),
      minOrderAmount: rule.minOrderAmount != null ? String(rule.minOrderAmount) : "",
      maxDiscount: rule.maxDiscount != null ? String(rule.maxDiscount) : "",
      isActive: rule.isActive,
      startsAt: rule.startsAt ? rule.startsAt.slice(0, 16) : "",
      endsAt: rule.endsAt ? rule.endsAt.slice(0, 16) : "",
      maxUsesTotal: rule.maxUsesTotal != null ? String(rule.maxUsesTotal) : "",
    });
    setOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setOpen(false);
  };

  const submit = async () => {
    setErr(null);

    if (!form.name.trim()) {
      setErr("Name is required");
      return;
    }

    if (!form.value) {
      setErr("Value is required");
      return;
    }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      code: form.code ? form.code.trim().toUpperCase() : undefined,
      description: form.description ? form.description.trim() : undefined,
      type: form.type,
      value: parseFloat(form.value),
      minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : undefined,
      maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : undefined,
      isActive: form.isActive,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
      maxUsesTotal: form.maxUsesTotal ? parseInt(form.maxUsesTotal, 10) : undefined,
    };

    setSaving(true);

    try {
      const url = editing ? `/api/discounts/rules/${editing.id}` : "/api/discounts/rules";
      const method = editing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Error saving discount rule");
      }

      setOpen(false);
      setForm(defaultForm);
      await fetchList();
    } catch (e: any) {
      setErr(e.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (id: string) => {
    if (!window.confirm("Delete this discount rule?")) return;

    try {
      const res = await fetch(`/api/discounts/rules/${id}`, { 
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchList();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  return (
    <Guard perm="discounts:read">
      <div className="space-y-6 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white">Discount Rules</h1>
            <p className="mt-1 text-sm text-slate-400">
              {data?.pagination.total ?? 0} rule(s)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search name / code / description..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-[320px] rounded-xl border border-slate-800 bg-[#07152f] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-blue-600"
              />
            </div>

            <button
              onClick={openCreate}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              + New Rule
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#041127] overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
            <label className="inline-flex items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => {
                  setActiveOnly(e.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 rounded border-slate-600 bg-transparent text-blue-600 focus:ring-blue-500"
              />
              Active only
            </label>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">
              Loading discount rules...
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              No discount rules found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#07152f] text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-4 text-left font-medium">Name</th>
                    <th className="px-4 py-4 text-left font-medium">Code</th>
                    <th className="px-4 py-4 text-left font-medium">Type</th>
                    <th className="px-4 py-4 text-right font-medium">Value</th>
                    <th className="px-4 py-4 text-right font-medium">Usage</th>
                    <th className="px-4 py-4 text-center font-medium">Status</th>
                    <th className="px-4 py-4 text-left font-medium">Created</th>
                    <th className="px-4 py-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((rule) => (
                    <tr
                      key={rule.id}
                      className="border-t border-slate-800 text-white transition hover:bg-[#07152f]"
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold text-white">{rule.name}</div>
                        {rule.description ? (
                          <div className="mt-1 max-w-xs truncate text-xs text-slate-500">
                            {rule.description}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {rule.code || "-"}
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full border border-slate-700 bg-[#07152f] px-2.5 py-1 text-xs font-medium text-slate-300">
                          {rule.type}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right font-medium text-white">
                        {rule.type === "PERCENTAGE"
                          ? `${rule.value}%`
                          : `GHS ${rule.value.toFixed(2)}`}
                      </td>

                      <td className="px-4 py-4 text-right text-slate-300">
                        {rule.usageCount}
                        {rule.maxUsesTotal ? ` / ${rule.maxUsesTotal}` : ""}
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            rule.isActive
                              ? "border border-emerald-800 bg-emerald-950/40 text-emerald-400"
                              : "border border-slate-700 bg-slate-900 text-slate-400"
                          }`}
                        >
                          {rule.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {new Date(rule.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEdit(rule)}
                            className="rounded-lg border border-slate-700 bg-transparent px-3 py-1.5 text-sm text-white transition hover:border-blue-600 hover:text-blue-400"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteRule(rule.id)}
                            className="rounded-lg border border-slate-700 bg-transparent px-3 py-1.5 text-sm text-white transition hover:border-red-600 hover:text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-800 px-4 py-4 text-sm text-slate-500">
            <div>
              Page {page} of {pages} • {data?.pagination.total ?? 0} total
            </div>

            {pages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="rounded-xl border border-slate-800 bg-[#07152f] px-4 py-2 text-slate-400 disabled:opacity-50"
                >
                  Prev
                </button>

                <button
                  onClick={() => setPage(Math.min(pages, page + 1))}
                  disabled={page === pages}
                  className="rounded-xl border border-slate-800 bg-[#07152f] px-4 py-2 text-slate-400 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#07152f]/95 p-6 text-white shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">
                {editing ? "Edit Discount Rule" : "Create Discount Rule"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Set up discount details for your store.
              </p>
            </div>

            {err && (
              <div className="mb-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                {err}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Senior Discount"
                  className="w-full rounded-xl border border-slate-700 bg-[#041127] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Promo Code
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SUMMER20"
                    title="Promo code"
                    className="w-full rounded-xl border border-slate-700 bg-[#041127] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-600"
                  />
                  <p className="mt-1 text-xs text-slate-500">Leave empty if not code-based</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Type *
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        type: e.target.value as "FIXED" | "PERCENTAGE" | "BOGO" | "TIERED",
                      })
                    }
                    title="Discount type"
                    className="w-full rounded-xl border border-slate-700 bg-[#041127] px-4 py-3 text-sm text-white outline-none focus:border-blue-600"
                  >
                    <option value="FIXED">Fixed Amount (₵)</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="BOGO">Buy One Get One</option>
                    <option value="TIERED">Tiered</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. 20% off for students"
                  rows={3}
                  className="w-full rounded-xl border border-slate-700 bg-[#041127] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Value *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder={form.type === "PERCENTAGE" ? "e.g. 20" : "e.g. 10.00"}
                    className="w-full rounded-xl border border-slate-700 bg-[#041127] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Max Discount Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.maxDiscount}
                    onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                    placeholder="e.g. 50.00"
                    className="w-full rounded-xl border border-slate-700 bg-[#041127] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Minimum Order Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.minOrderAmount}
                    onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                    placeholder="e.g. 100.00"
                    className="w-full rounded-xl border border-slate-700 bg-[#041127] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Max Uses (Total)
                  </label>
                  <input
                    type="number"
                    value={form.maxUsesTotal}
                    onChange={(e) => setForm({ ...form, maxUsesTotal: e.target.value })}
                    placeholder="e.g. 100"
                    className="w-full rounded-xl border border-slate-700 bg-[#041127] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Start Date / Time
                  </label>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-[#041127] px-4 py-3 text-sm text-white outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    End Date / Time
                  </label>
                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-[#041127] px-4 py-3 text-sm text-white outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-3 rounded-xl border border-slate-700 bg-[#041127] px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-600 bg-transparent text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-300">Active</span>
              </label>
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-slate-700 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={submit}
                disabled={saving}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Rule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Guard>
  );
}