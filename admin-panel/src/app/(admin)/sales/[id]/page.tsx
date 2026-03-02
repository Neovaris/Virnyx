"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

function money(n: number) {
  return `GHS ${Number(n ?? 0).toFixed(2)}`;
}

type SaleDetails = {
  sale: {
    id: string;
    receiptNo: string;
    status: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    createdAt: string;
    items: Array<{
      id: string;
      nameSnap: string;
      priceSnap: number;
      qty: number;
      lineTotal: number;
    }>;
    payments: Array<{
      id: string;
      method: string;
      amount: number;
      reference: string | null;
    }>;
    refunds?: Array<{
      id: string;
      amount: number;
      createdAt: string;
      items: Array<{ id: string; saleItemId: string; qty: number }>;
    }>;
  };
};

export default function SaleDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const saleId = params.id;

  const [data, setData] = useState<SaleDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/sales/${saleId}`, { cache: "no-store" });
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
  }, [saleId]);

  const sale = data?.sale;

  const paidTotal = useMemo(() => {
    return (sale?.payments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
  }, [sale?.payments]);

  if (loading) return <div className="text-slate-400">Loading sale...</div>;
  if (!sale) return <div className="text-slate-400">Sale not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Receipt</h1>
          <div className="text-sm text-slate-400">
            {sale.receiptNo} • {sale.status} •{" "}
            {new Date(sale.createdAt).toLocaleString()}
          </div>
        </div>

        <button
          onClick={() => router.back()}
          className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm hover:bg-slate-900/60"
        >
          Back
        </button>
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 text-sm font-medium">
          Items
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/60">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  Product
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sale.items.map((it) => (
                <tr key={it.id} className="hover:bg-slate-900/30">
                  <td className="px-4 py-3 text-slate-200">{it.nameSnap}</td>
                  <td className="px-4 py-3 text-right text-slate-200">
                    {money(it.priceSnap)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-200">
                    {it.qty}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-200">
                    {money(it.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary + Payments */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
          <div className="text-sm font-medium">Summary</div>

          <Row label="Subtotal" value={money(sale.subtotal)} />
          <Row label="Discount" value={money(sale.discount)} />
          <Row label="Tax" value={money(sale.tax)} />
          <div className="border-t border-slate-800 my-2" />
          <Row label="Total" value={money(sale.total)} strong />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
          <div className="text-sm font-medium">Payments</div>

          <div className="space-y-2">
            {(sale.payments ?? []).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2"
              >
                <div className="text-sm text-slate-200">
                  {p.method}
                  {p.reference ? (
                    <span className="text-xs text-slate-500"> • {p.reference}</span>
                  ) : null}
                </div>
                <div className="text-sm font-medium">{money(p.amount)}</div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 pt-3">
            <Row label="Paid total" value={money(paidTotal)} />
          </div>
        </div>
      </div>

      {/* Refunds (if any) */}
      {(sale.refunds?.length ?? 0) > 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
          <div className="text-sm font-medium">Refunds</div>
          <div className="space-y-2">
            {sale.refunds!.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2"
              >
                <div className="text-sm text-slate-200">
                  {new Date(r.createdAt).toLocaleString()}
                  <span className="text-xs text-slate-500">
                    {" "}
                    • Items: {r.items?.length ?? 0}
                  </span>
                </div>
                <div className="text-sm font-medium">{money(r.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-slate-400">{label}</div>
      <div className={strong ? "text-sm font-semibold" : "text-sm text-slate-200"}>
        {value}
      </div>
    </div>
  );
}