"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import StatCard from "@/components/admin/StatCard";
import DataTable from "@/components/admin/DataTable";
import Guard from "@/components/admin/Guard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useRouter, useSearchParams } from "next/navigation";

type DailyReport = {
  date: string;
  storeId: string;
  sales: {
    completedCount: number;
    voidedCount: number;
    subtotal: number;
    discount: number;
    tax: number;
    grossTotal: number;
    refunds: number;
    netTotal: number;
  };
  payments: Record<string, number>;
  topProducts: Array<{
    productId: string;
    name: string;
    qty: number;
    revenue: number;
  }>;
};

type LowStock = {
  items: Array<{
    id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    price: number;
    qtyOnHand: number;
  }>;
};

type HourlyReport = {
  date: string;
  storeId: string;
  buckets: Array<{ hour: number; count: number; total: number }>;
  peakHour: number;
  peakTotal: number;
};

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

type CashiersReport = {
  date: string;
  storeId: string;
  count: number;
  items: Array<{
    cashierId: string;
    cashierName: string;
    email: string | null;
    completedCount: number;
    voidedCount: number;
    totalRevenue: number;
  }>;
};

type RefundCashiersReport = {
  date: string;
  storeId: string;
  count: number;
  items: Array<{
    cashierId: string;
    cashierName: string;
    email: string | null;
    refundCount: number;
    refundAmount: number;
  }>;
};

function money(n: number) {
  return `GHS ${Number(n ?? 0).toFixed(2)}`;
}

function make24Buckets() {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: 0,
    total: 0,
  }));
}

function addDays(yyyyMmDd: string, deltaDays: number) {
  const d = new Date(`${yyyyMmDd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function pctChange(today: number, yesterday: number) {
  const t = Number(today ?? 0);
  const y = Number(yesterday ?? 0);
  if (y === 0 && t === 0) return "0%";
  if (y === 0 && t !== 0) return "+∞";
  const p = ((t - y) / y) * 100;
  const sign = p >= 0 ? "+" : "";
  return `${sign}${p.toFixed(1)}%`;
}

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"];

export default function DashboardPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const todayDefault = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(() => sp.get("date") || todayDefault);
  const yesterday = useMemo(() => addDays(date, -1), [date]);

  const [daily, setDaily] = useState<DailyReport | null>(null);
  const [dailyYesterday, setDailyYesterday] = useState<DailyReport | null>(
    null,
  );

  const [hourly, setHourly] = useState<HourlyReport | null>(null);
  const [lowStock, setLowStock] = useState<LowStock | null>(null);

  const [recentSales, setRecentSales] = useState<SalesList | null>(null);
  const [cashiers, setCashiers] = useState<CashiersReport | null>(null);
  const [refundCashiers, setRefundCashiers] =
    useState<RefundCashiersReport | null>(null);

  const [pendingRefundsCount, setPendingRefundsCount] = useState(0);
  const [pendingRefundsTotal, setPendingRefundsTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const refreshTimer = useRef<number | null>(null);

  // Keep URL synced (?date=YYYY-MM-DD)
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("date", date);
    router.replace(url.pathname + url.search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [dRes, dYRes, lRes, hRes, sRes, cRes, rcRes, prRes] = await Promise.all([
        fetch(`/api/reports/daily?date=${date}`, { cache: "no-store" }),
        fetch(`/api/reports/daily?date=${yesterday}`, { cache: "no-store" }),
        fetch(`/api/reports/low-stock?threshold=10&limit=10`, {
          cache: "no-store",
        }),
        fetch(`/api/reports/hourly?date=${date}`, { cache: "no-store" }),
        fetch(
          `/api/reports/sales?date=${date}&status=COMPLETED&page=1&limit=10`,
          {
            cache: "no-store",
          },
        ),
        fetch(`/api/reports/cashiers?date=${date}`, { cache: "no-store" }),
        fetch(`/api/reports/refunds-cashiers?date=${date}`, {
          cache: "no-store",
        }),
        fetch(`/api/refunds/pending-approvals`, { cache: "no-store" }),
      ]);

      setDaily(dRes.ok ? await dRes.json() : null);
      setDailyYesterday(dYRes.ok ? await dYRes.json() : null);

      setLowStock(lRes.ok ? await lRes.json() : null);

      const hJson = await hRes.json().catch(() => null);
      setHourly(hRes.ok ? (hJson as HourlyReport) : null);

      setRecentSales(sRes.ok ? await sRes.json() : null);
      setCashiers(cRes.ok ? await cRes.json() : null);
      setRefundCashiers(rcRes.ok ? await rcRes.json() : null);

      // Handle pending refunds
      if (prRes.ok) {
        const prJson = await prRes.json().catch(() => ({}));
        const refunds = Array.isArray(prJson?.refunds) ? prJson.refunds : [];
        setPendingRefundsCount(refunds.length);
        setPendingRefundsTotal(refunds.reduce((sum: number, r: any) => sum + (r.amount || 0), 0));
      }

      setLastUpdatedAt(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  };

  // Initial load + reload when date changes
  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // 🔔 Real-time auto refresh (30s), pauses when tab hidden
  useEffect(() => {
    const start = () => {
      if (refreshTimer.current) window.clearInterval(refreshTimer.current);
      refreshTimer.current = window.setInterval(() => {
        if (document.visibilityState === "visible") fetchAll();
      }, 30_000);
    };

    start();
    return () => {
      if (refreshTimer.current) window.clearInterval(refreshTimer.current);
      refreshTimer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const chartData =
    hourly?.buckets?.length === 24 ? hourly.buckets : make24Buckets();

  const allZero = chartData.every((b) => Number(b.total ?? 0) === 0);

  const paymentEntries = Object.entries(daily?.payments ?? {});
  const hasPayments = paymentEntries.length > 0;

  const netToday = daily?.sales.netTotal ?? 0;
  const netY = dailyYesterday?.sales.netTotal ?? 0;
  const grossToday = daily?.sales.grossTotal ?? 0;
  const grossY = dailyYesterday?.sales.grossTotal ?? 0;
  const refundsToday = daily?.sales.refunds ?? 0;
  const refundsY = dailyYesterday?.sales.refunds ?? 0;

  const topCashiers = (cashiers?.items ?? []).slice(0, 5);
  const topRefundCashiers = (refundCashiers?.items ?? []).slice(0, 5);

  if (loading)
    return <div className="text-slate-400">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        <div className="flex flex-wrap items-center gap-3">
          <Guard perm="sales:read">
            <div className="text-sm text-slate-400">Date</div>
          </Guard>

          {/* Date picker with "Today" quick button */}
          <input
            type="date"
            value={date}
            max={todayDefault}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Select date for dashboard"
            className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
          />

          <button
            onClick={() => setDate(todayDefault)}
            className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm hover:bg-slate-900/60"
          >
            Today
          </button>

          <button
            onClick={() => fetchAll()}
            className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm hover:bg-slate-900/60"
          >
            Refresh
          </button>

          <div className="text-xs text-slate-500">
            Last updated:{" "}
            {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : "-"}
          </div>
        </div>
      </div>

      {/* Stats + Comparison */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label={`Net sales (${date})`}
          value={money(netToday)}
          helper={`vs ${yesterday}: ${pctChange(netToday, netY)}`}
        />
        <StatCard
          label={`Gross sales (${date})`}
          value={money(grossToday)}
          helper={`vs ${yesterday}: ${pctChange(grossToday, grossY)}`}
        />
        <StatCard
          label={`Refunds (${date})`}
          value={money(refundsToday)}
          helper={`vs ${yesterday}: ${pctChange(refundsToday, refundsY)}`}
        />
        <StatCard
          label="Completed sales"
          value={daily?.sales.completedCount ?? 0}
          helper={`Voided: ${daily?.sales.voidedCount ?? 0}`}
        />
        <Guard perm="sales:write">
          <Link href="/admin/refunds">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 hover:bg-amber-500/10 hover:border-amber-500/30 transition-colors cursor-pointer">
              <div className="text-xs text-amber-600/70 font-medium mb-1">⏳ Pending Approvals</div>
              <div className="text-2xl font-bold text-amber-400">{pendingRefundsCount}</div>
              <div className="text-xs text-amber-600/50 mt-1">{money(pendingRefundsTotal)} total</div>
            </div>
          </Link>
        </Guard>
      </div>

      {/* Hourly chart */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Hourly Sales</h2>
          {!allZero && hourly ? (
            <div className="text-xs text-slate-400">
              Peak: {hourly.peakHour}:00 ({money(hourly.peakTotal)})
            </div>
          ) : null}
        </div>

        {allZero ? (
          <div className="text-sm text-slate-500">
            No sales recorded for this date.
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="hour"
                tickFormatter={(h) => `${h}:00`}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
              />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <Tooltip
                formatter={(value: any) => [money(Number(value)), "Total"]}
                labelFormatter={(label) => `Hour: ${label}:00`}
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: 12,
                }}
              />
              <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payments */}
      {hasPayments ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Payment Breakdown</h2>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentEntries.map(([method, amount]) => ({
                      name: method,
                      value: amount,
                    }))}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                  >
                    {paymentEntries.map((_, index) => (
                      <Cell
                        key={index}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => money(Number(value))}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #1e293b",
                      borderRadius: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <table className="w-full text-sm">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="text-left py-2">Method</th>
                    <th className="text-right py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentEntries.map(([method, amount]) => (
                    <tr
                      key={method}
                      className="border-b border-slate-800 last:border-none"
                    >
                      <td className="py-2">{method}</td>
                      <td className="py-2 text-right font-medium">
                        {money(amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tables */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Top products</h2>
          <DataTable
            columns={[
              { header: "Product", accessor: (r: any) => r.name },
              { header: "Qty", accessor: (r: any) => r.qty },
              { header: "Revenue", accessor: (r: any) => money(r.revenue) },
            ]}
            rows={daily?.topProducts ?? []}
            emptyText="No sales"
          />
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Low stock</h2>
          <DataTable
            columns={[
              { header: "Product", accessor: (r: any) => r.name },
              { header: "SKU", accessor: (r: any) => r.sku ?? "-" },
              { header: "On hand", accessor: (r: any) => r.qtyOnHand },
              { header: "Price", accessor: (r: any) => money(r.price) },
            ]}
            rows={lowStock?.items ?? []}
            emptyText="No low-stock items"
          />
        </div>
      </div>

      {/* New: Recent Sales Feed + Cashier Preview */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* 👤 Cashier performance preview */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Cashier Performance</h2>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="text-sm font-medium text-slate-200 mb-3">
                Top cashiers (revenue)
              </div>
              <DataTable
                columns={[
                  { header: "Cashier", accessor: (r: any) => r.cashierName },
                  { header: "Sales", accessor: (r: any) => r.completedCount },
                  {
                    header: "Revenue",
                    accessor: (r: any) => money(r.totalRevenue),
                  },
                ]}
                rows={topCashiers}
                emptyText="No cashier data"
              />
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="text-sm font-medium text-slate-200 mb-3">
                Top cashiers (refunds)
              </div>
              <DataTable
                columns={[
                  { header: "Cashier", accessor: (r: any) => r.cashierName },
                  { header: "Refunds", accessor: (r: any) => r.refundCount },
                  {
                    header: "Amount",
                    accessor: (r: any) => money(r.refundAmount),
                  },
                ]}
                rows={topRefundCashiers}
                emptyText="No refund data"
              />
            </div>
          </div>
        </div>

        {/* 🧾 Recent sales feed */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Recent Sales</h2>
          <DataTable
            columns={[
              {
                header: "Receipt",
                accessor: (r: any) => (
                  <Link
                    href={`/sales/${r.id}`}
                    className="text-indigo-400 hover:text-indigo-300 underline-offset-4 hover:underline"
                  >
                    {r.receiptNo}
                  </Link>
                ),
              },
              { header: "Total", accessor: (r: any) => money(r.total) },
              {
                header: "Time",
                accessor: (r: any) =>
                  new Date(r.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
              },
            ]}
            rows={recentSales?.items ?? []}
            emptyText="No sales"
          />
        </div>
      </div>
    </div>
  );
}
