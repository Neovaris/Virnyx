'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { shiftsApi } from '@/lib/shiftsApi';

interface CashierPerformance {
  id: string;
  name: string;
  email: string;
  totalShifts: number;
  openShifts: number;
  closedShifts: number;
  totalRevenue: number;
  totalSales: number;
  averageTransactionValue: number;
  totalRefunds: number;
  refundRate: number;
  averageShiftDuration: number;
  lastShiftDate: string | null;
}

export default function CashiersPage() {
  const [cashiers, setCashiers] = useState<CashierPerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'revenue' | 'sales' | 'name'>(
    'revenue'
  );
  const [selectedCashier, setSelectedCashier] = useState<string | null>(null);

  useEffect(() => {
    const fetchCashiers = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all shifts and aggregate by cashier
        let allShifts: any[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const res = await shiftsApi.getShifts({ page, limit: 100 });
          allShifts = [...allShifts, ...res.items];
          hasMore = page < res.pages;
          page++;
        }

        // Aggregate shifts by cashier
        const cashierMap = new Map<string, CashierPerformance>();

        for (const shift of allShifts) {
          const key = shift.cashierId;
          if (!cashierMap.has(key)) {
            cashierMap.set(key, {
              id: shift.cashierId,
              name: shift.cashier.fullName,
              email: shift.cashier.email,
              totalShifts: 0,
              openShifts: 0,
              closedShifts: 0,
              totalRevenue: 0,
              totalSales: 0,
              averageTransactionValue: 0,
              totalRefunds: 0,
              refundRate: 0,
              averageShiftDuration: 0,
              lastShiftDate: null,
            });
          }

          const cashier = cashierMap.get(key)!;
          cashier.totalShifts += 1;
          cashier.totalRevenue += shift.summary.sales.total;
          cashier.totalSales += shift.summary.sales.count;
          cashier.totalRefunds += shift.summary.refunds.amount;
          cashier.lastShiftDate = shift.openedAt;

          if (shift.status === 'OPEN') {
            cashier.openShifts += 1;
          } else {
            cashier.closedShifts += 1;
          }
        }

        // Calculate derived metrics
        const cashierArray = Array.from(cashierMap.values()).map((c) => ({
          ...c,
          averageTransactionValue:
            c.totalSales > 0 ? c.totalRevenue / c.totalSales : 0,
          refundRate:
            c.totalSales > 0
              ? (c.totalRefunds / (c.totalRevenue + c.totalRefunds)) * 100
              : 0,
        }));

        // Sort by selected metric
        cashierArray.sort((a, b) => {
          switch (sortBy) {
            case 'revenue':
              return b.totalRevenue - a.totalRevenue;
            case 'sales':
              return b.totalSales - a.totalSales;
            case 'name':
              return a.name.localeCompare(b.name);
          }
        });

        setCashiers(cashierArray);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch cashier data');
      } finally {
        setLoading(false);
      }
    };

    fetchCashiers();
  }, [sortBy]);

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

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  const formatPercent = (value: number) => {
    return `${(value ?? 0).toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Cashier Performance</h1>
        <p className="text-slate-400 mt-1">
          Track individual cashier metrics and performance
        </p>
      </div>

      {/* Sorting Controls */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-slate-400 text-sm">Sort by:</span>
          {(['revenue', 'sales', 'name'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                sortBy === option
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
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
        <div className="text-center text-slate-400">Loading cashier data...</div>
      ) : cashiers.length === 0 ? (
        <div className="text-center text-slate-400">No cashiers found</div>
      ) : (
        <>
          {/* Cashiers Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {cashiers.map((cashier) => (
              <div
                key={cashier.id}
                className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6 hover:border-blue-500/50 transition-colors cursor-pointer"
                onClick={() =>
                  setSelectedCashier(
                    selectedCashier === cashier.id ? null : cashier.id
                  )
                }
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">
                      {cashier.name}
                    </h3>
                    <p className="text-sm text-slate-500">{cashier.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-400">
                      {formatCurrency(cashier.totalRevenue)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {cashier.totalShifts} shifts
                    </p>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-800/30 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Sales Count</p>
                    <p className="text-lg font-semibold text-slate-100">
                      {formatNumber(cashier.totalSales)}
                    </p>
                  </div>
                  <div className="bg-slate-800/30 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Avg Transaction</p>
                    <p className="text-lg font-semibold text-blue-400">
                      {formatCurrency(cashier.averageTransactionValue)}
                    </p>
                  </div>
                  <div className="bg-slate-800/30 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Refunds</p>
                    <p className="text-lg font-semibold text-orange-400">
                      {formatCurrency(cashier.totalRefunds)}
                    </p>
                  </div>
                  <div className="bg-slate-800/30 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Refund Rate</p>
                    <p className="text-lg font-semibold text-slate-100">
                      {formatPercent(cashier.refundRate)}
                    </p>
                  </div>
                </div>

                {/* Shift Status */}
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 bg-slate-800/30 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Open Shifts</p>
                    <p className="text-lg font-semibold text-slate-100">
                      {cashier.openShifts}
                    </p>
                  </div>
                  <div className="flex-1 bg-slate-800/30 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-1">Closed Shifts</p>
                    <p className="text-lg font-semibold text-slate-100">
                      {cashier.closedShifts}
                    </p>
                  </div>
                </div>

                {/* Last Shift */}
                <div className="pt-3 border-t border-slate-700/50">
                  <p className="text-xs text-slate-500">
                    Last shift: {formatDate(cashier.lastShiftDate || '')}
                  </p>
                </div>

                {/* Expandable Details */}
                {selectedCashier === cashier.id && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-400">Total Shifts</p>
                        <p className="text-slate-100 font-medium">
                          {cashier.totalShifts}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Total Revenue</p>
                        <p className="text-green-400 font-medium">
                          {formatCurrency(cashier.totalRevenue)}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/shifts?cashierId=${cashier.id}`}
                      className="block text-center mt-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                    >
                      View Shifts
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          {cashiers.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">
                Team Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Total Cashiers</p>
                  <p className="text-2xl font-bold text-slate-100">
                    {cashiers.length}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Combined Revenue</p>
                  <p className="text-2xl font-bold text-green-400">
                    {formatCurrency(
                      cashiers.reduce((sum, c) => sum + c.totalRevenue, 0)
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Total Sales</p>
                  <p className="text-2xl font-bold text-slate-100">
                    {formatNumber(
                      cashiers.reduce((sum, c) => sum + c.totalSales, 0)
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Avg Per Cashier</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {formatCurrency(
                      cashiers.reduce((sum, c) => sum + c.totalRevenue, 0) /
                        cashiers.length
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
