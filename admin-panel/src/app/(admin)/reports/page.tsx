'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';

export default function ReportsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>(
    'month'
  );

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getDashboardMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [dateRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  const getMetricsForRange = () => {
    switch (dateRange) {
      case 'today':
        return metrics?.today;
      case 'month':
        return metrics?.thisMonth;
      case 'year':
        return metrics?.thisYear;
      default:
        return metrics?.thisMonth;
    }
  };

  const currentMetrics = getMetricsForRange();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Reports & Analytics</h1>
        <p className="text-slate-400 mt-1">View detailed business analytics</p>
      </div>

      {/* Date Range Selector */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
        <div className="flex gap-2 flex-wrap">
          {(['today', 'week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-400">Loading reports...</div>
      ) : currentMetrics ? (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
              <p className="text-slate-400 text-sm mb-2">Total Sales</p>
              <p className="text-3xl font-bold text-slate-100">
                {formatNumber(currentMetrics.transactions)}
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
              <p className="text-slate-400 text-sm mb-2">Total Revenue</p>
              <p className="text-3xl font-bold text-green-400">
                {formatCurrency(currentMetrics.revenue)}
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
              <p className="text-slate-400 text-sm mb-2">Avg Transaction</p>
              <p className="text-3xl font-bold text-blue-400">
                {formatCurrency(
                  currentMetrics.transactions > 0
                    ? currentMetrics.revenue / currentMetrics.transactions
                    : 0
                )}
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
              <p className="text-slate-400 text-sm mb-2">Sale Count</p>
              <p className="text-3xl font-bold text-slate-100">
                {formatNumber(currentMetrics.sales || currentMetrics.transactions)}
              </p>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sales Metrics */}
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">
                Sales Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
                  <p className="text-slate-400">Number of Sales</p>
                  <p className="text-slate-100 font-semibold">
                    {formatNumber(currentMetrics.transactions)}
                  </p>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
                  <p className="text-slate-400">Total Revenue</p>
                  <p className="text-green-400 font-semibold">
                    {formatCurrency(currentMetrics.revenue)}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-slate-400">Average Per Sale</p>
                  <p className="text-blue-400 font-semibold">
                    {formatCurrency(
                      currentMetrics.transactions > 0
                        ? currentMetrics.revenue / currentMetrics.transactions
                        : 0
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Top Products would go here */}
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">
                Business Insights
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-slate-400 text-sm">Sales Trend</p>
                  <p className="text-slate-300 text-xs mt-1">
                    {dateRange === 'today'
                      ? 'Track your sales in real-time'
                      : dateRange === 'week'
                      ? 'Weekly performance metrics'
                      : dateRange === 'month'
                      ? 'Monthly business summary'
                      : 'Annual business overview'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performers */}
          {metrics?.topCashiers && metrics.topCashiers.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">
                Top Performing Cashiers
              </h3>
              <div className="space-y-2">
                {metrics.topCashiers.slice(0, 5).map((cashier: any, idx: number) => (
                  <div
                    key={cashier.id}
                    className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-medium text-white">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-slate-100 font-medium">{cashier.name}</p>
                        <p className="text-slate-500 text-xs">
                          {formatNumber(cashier.sales)} sales
                        </p>
                      </div>
                    </div>
                    <p className="text-green-400 font-semibold">
                      {formatCurrency(cashier.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export/Actions */}
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">
              Export Reports
            </h3>
            <div className="flex gap-3 flex-wrap">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                Export as CSV
              </button>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                Export as PDF
              </button>
              <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-sm font-medium transition-colors">
                Email Report
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
