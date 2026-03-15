// src/app/(admin)/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/adminApi';

export default function Home() {
  const [metrics, setMetrics] = useState<any>(null);
  const [inventoryMetrics, setInventoryMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      setError(null);
      try {
        const [dash, inv] = await Promise.all([
          adminApi.getDashboardMetrics(),
          adminApi.getInventoryMetrics(),
        ]);
        setMetrics(dash);
        setInventoryMetrics(inv);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-slate-400 mt-1">Welcome to Virnyx Admin Panel</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Today's Metrics */}
      {metrics?.today && (
        <div>
          <h2 className="text-xl font-bold text-slate-100 mb-4">Today</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
              <p className="text-slate-400 text-sm mb-2">Sales</p>
              <p className="text-2xl font-bold text-slate-100">
                {metrics.today.transactions}
              </p>
              <p className="text-slate-500 text-xs mt-2">
                Revenue: {formatCurrency(metrics.today.revenue)}
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
              <p className="text-slate-400 text-sm mb-2">Revenue</p>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(metrics.today.revenue)}
              </p>
              <p className="text-slate-500 text-xs mt-2">
                Average: {formatCurrency(metrics.today.averageTransaction)}
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
              <p className="text-slate-400 text-sm mb-2">Avg Transaction</p>
              <p className="text-2xl font-bold text-blue-400">
                {formatCurrency(metrics.today.averageTransaction)}
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
              <p className="text-slate-400 text-sm mb-2">Active Shifts</p>
              <p className="text-2xl font-bold text-slate-100">-</p>
              <Link
                href="/shifts"
                className="text-blue-400 hover:text-blue-300 text-xs mt-2 inline-block"
              >
                View shifts →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Monthly & Yearly Metrics */}
      {metrics && (
        <div>
          <h2 className="text-xl font-bold text-slate-100 mb-4">Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">
                This Month
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-slate-400">Sales</p>
                  <p className="text-slate-100 font-semibold">
                    {metrics.thisMonth.transactions}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-slate-400">Revenue</p>
                  <p className="text-green-400 font-semibold">
                    {formatCurrency(metrics.thisMonth.revenue)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">
                This Year
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-slate-400">Sales</p>
                  <p className="text-slate-100 font-semibold">
                    {metrics.thisYear.transactions}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-slate-400">Revenue</p>
                  <p className="text-green-400 font-semibold">
                    {formatCurrency(metrics.thisYear.revenue)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Metrics */}
      {inventoryMetrics && (
        <div>
          <h2 className="text-xl font-bold text-slate-100 mb-4">Inventory</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
              <p className="text-slate-400 text-sm mb-2">Total Items</p>
              <p className="text-2xl font-bold text-slate-100">
                {formatNumber(inventoryMetrics.totalItems)}
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
              <p className="text-slate-400 text-sm mb-2">Inventory Value</p>
              <p className="text-2xl font-bold text-blue-400">
                {formatCurrency(inventoryMetrics.totalValue)}
              </p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-6">
              <p className="text-slate-400 text-sm mb-2">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-400">
                {inventoryMetrics.lowStockItems}
              </p>
              <Link
                href="/inventory"
                className="text-yellow-400 hover:text-yellow-300 text-xs mt-2 inline-block"
              >
                View inventory →
              </Link>
            </div>

            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6">
              <p className="text-slate-400 text-sm mb-2">Out of Stock</p>
              <p className="text-2xl font-bold text-red-400">
                {inventoryMetrics.outOfStockItems}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Cashiers */}
      {metrics?.topCashiers && metrics.topCashiers.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-slate-100 mb-4">
            Top Performers
          </h2>
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-800/50">
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-300">
                    Cashier
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-slate-300">
                    Sales
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-slate-300">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.topCashiers.map((cashier: any, idx: number) => (
                  <tr
                    key={cashier.id}
                    className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium text-slate-100">
                          {idx + 1}
                        </div>
                        <p className="text-slate-100 font-medium">{cashier.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-100">
                      {cashier.sales}
                    </td>
                    <td className="px-6 py-4 text-right text-green-400 font-medium">
                      {formatCurrency(cashier.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/shifts"
            className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 hover:border-blue-500/50 transition-colors"
          >
            <p className="text-sm font-medium text-slate-300 mb-2">Shifts</p>
            <p className="text-xs text-slate-500">View all shifts</p>
          </Link>
          <Link
            href="/sales"
            className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 hover:border-blue-500/50 transition-colors"
          >
            <p className="text-sm font-medium text-slate-300 mb-2">Sales</p>
            <p className="text-xs text-slate-500">View all transactions</p>
          </Link>
          <Link
            href="/inventory"
            className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 hover:border-blue-500/50 transition-colors"
          >
            <p className="text-sm font-medium text-slate-300 mb-2">Inventory</p>
            <p className="text-xs text-slate-500">Manage stock</p>
          </Link>
          <Link
            href="/users"
            className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 hover:border-blue-500/50 transition-colors"
          >
            <p className="text-sm font-medium text-slate-300 mb-2">Cashiers</p>
            <p className="text-xs text-slate-500">Manage users</p>
          </Link>
        </div>
      </div>
    </div>
  );
}