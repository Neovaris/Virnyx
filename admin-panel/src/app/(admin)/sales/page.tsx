"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Guard from "@/components/admin/Guard";

type SalesList = {
  date: string;
  status: string;
  page: number;
  limit: number;
  total: number;
  pages: number;
  items: Array<{
    id: string;
    receiptNo: string;
    status: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    createdAt: string;
  }>;
};

function money(n: number) {
  return `GHS ${Number(n ?? 0).toFixed(2)}`;
}

function addDays(yyyyMmDd: string, deltaDays: number) {
  const d = new Date(`${yyyyMmDd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export default function SalesPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [date, setDate] = useState(() => sp.get("date") || today);
  const [status, setStatus] = useState<"COMPLETED" | "VOIDED">(
    () => (sp.get("status") as any) || "COMPLETED"
  );
  const [page, setPage] = useState(() => Math.max(Number(sp.get("page") || 1), 1));
  const [limit] = useState(20);

  // receipt search (URL + debounced)
  const [q, setQ] = useState(() => sp.get("q") || "");
  const [qDebounced, setQDebounced] = useState(q);

  const [data, setData] = useState<SalesList | null>(null);
  const [loading, setLoading] = useState(true);

  // debounce typing
  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(q.trim()), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  // Keep URL synced
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("date", date);
    url.searchParams.set("status", status);
    url.searchParams.set("page", String(page));
    if (qDebounced) url.searchParams.set("q", qDebounced);
    else url.searchParams.delete("q");
    router.replace(url.pathname + url.search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, status, page, qDebounced]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/reports/sales?date=${date}&status=${status}&page=${page}&limit=${limit}`,
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
    run();
  }, [date, status, page, limit]);

  const pages = data?.pages ?? 1;
  const total = data?.total ?? 0;

  // client-side filter by receiptNo (current page)
  const itemsRaw = data?.items ?? [];
  const items = useMemo(() => {
    if (!qDebounced) return itemsRaw;
    const needle = qDebounced.toLowerCase();
    return itemsRaw.filter((s) => String(s.receiptNo ?? "").toLowerCase().includes(needle));
  }, [itemsRaw, qDebounced]);

  return (
    <Guard perm="sales:read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sales</h1>
            <div className="text-sm text-slate-400">
              {status} • {total} record(s)
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm text-slate-400">Date</div>

            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => {
                setPage(1);
                setDate(e.target.value);
              }}
              className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
            />

            <button
              onClick={() => {
                setPage(1);
                setDate(today);
              }}
              className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm hover:bg-slate-900/60"
            >
              Today
            </button>

            <button
              onClick={() => {
                setPage(1);
                setDate(addDays(date, -1));
              }}
              className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm hover:bg-slate-900/60"
            >
              Yesterday
            </button>
          </div>
        </div>

        {/* Status + Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPage(1);
                setStatus("COMPLETED");
              }}
              className={
                status === "COMPLETED"
                  ? "rounded-xl px-3 py-2 text-sm bg-indigo-500/20 border border-indigo-500/40"
                  : "rounded-xl px-3 py-2 text-sm border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60"
              }
            >
              Completed
            </button>
            <button
              onClick={() => {
                setPage(1);
                setStatus("VOIDED");
              }}
              className={
                status === "VOIDED"
                  ? "rounded-xl px-3 py-2 text-sm bg-indigo-500/20 border border-indigo-500/40"
                  : "rounded-xl px-3 py-2 text-sm border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60"
              }
            >
              Voided
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder="Search receipt no… (e.g. VRX-20260302-000001)"
              className="w-full sm:w-96 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            {q ? (
              <button
                onClick={() => setQ("")}
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
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                    Receipt
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                    Tax
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                    Discount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                    Time
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-400" colSpan={5}>
                      Loading sales...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-400" colSpan={5}>
                      {qDebounced
                        ? "No matches on this page. Try another page/date."
                        : "No sales found for this date/status."}
                    </td>
                  </tr>
                ) : (
                  items.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-900/30">
                      <td className="px-4 py-3">
                        <Link
                          href={`/sales/${s.id}`}
                          className="text-indigo-400 hover:text-indigo-300 underline-offset-4 hover:underline"
                        >
                          {s.receiptNo}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">{money(s.total)}</td>
                      <td className="px-4 py-3 text-right">{money(s.tax)}</td>
                      <td className="px-4 py-3 text-right">{money(s.discount)}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {new Date(s.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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
              Page {page} of {pages} • {total} total
              {qDebounced ? (
                <span className="text-slate-600"> • filter: “{qDebounced}”</span>
              ) : null}
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

        {/* Note */}
        {qDebounced ? (
          <div className="text-xs text-slate-500">
            Note: Search filters the current page. In v2 we’ll add server-side receipt search.
          </div>
        ) : null}
      </div>
    </Guard>
  );
}