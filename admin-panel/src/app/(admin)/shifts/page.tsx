'use client';

import { useState, useEffect, useCallback } from 'react';
import { shiftsApi, ShiftWithSummary } from '@/lib/shiftsApi';
import { SkeletonShifts } from '@/components/admin/SkeletonLoader';

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<ShiftWithSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [total, setTotal] = useState(0);
  const [selectedShift, setSelectedShift] = useState<ShiftWithSummary | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'CLOSED' | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await shiftsApi.getShifts({
        page,
        limit,
        status: statusFilter as 'OPEN' | 'CLOSED' | undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setShifts(response.items);
      setTotal(response.total);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch shifts';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, fromDate, toDate]);

  useEffect(() => {
    fetchShifts();
  }, [page, limit, statusFilter, fromDate, toDate, fetchShifts]);

  const handleResetFilters = () => {
    setStatusFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const pages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Shifts</h1>
        <p className="text-slate-400 mt-1">Manage and view all store shifts</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'OPEN' | 'CLOSED' | '');
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">All</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              &nbsp;
            </label>
            <button
              onClick={handleResetFilters}
              className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg text-sm transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Shifts Table */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg overflow-hidden">
        {loading ? (
          <SkeletonShifts />
        ) : shifts.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No shifts found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50 bg-slate-800/50">
                    <th className="px-6 py-3 text-left text-sm font-medium text-slate-300">
                      Cashier
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-slate-300">
                      Opened
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-slate-300">
                      Closed
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-slate-300">
                      Sales
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-slate-300">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-slate-300">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-slate-300">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((shift) => (
                    <tr
                      key={shift.id}
                      className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-100">
                            {shift.cashier.fullName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {shift.cashier.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {formatDate(shift.openedAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {shift.closedAt ? formatDate(shift.closedAt) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-slate-100">
                        {shift.summary.sales.count}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-green-400">
                        {formatCurrency(shift.summary.sales.total)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            shift.status === 'OPEN'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-slate-700/50 text-slate-300'
                          }`}
                        >
                          {shift.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedShift(shift)}
                          className="text-sm px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="px-6 py-4 border-t border-slate-700/50 flex items-center justify-between">
                <div className="text-sm text-slate-400">
                  Showing {shifts.length} of {total}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 rounded-lg bg-slate-800 text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors text-sm"
                  >
                    Previous
                  </button>
                  <div className="px-3 py-1 text-sm text-slate-300">
                    {page} / {pages}
                  </div>
                  <button
                    onClick={() => setPage(Math.min(pages, page + 1))}
                    disabled={page === pages}
                    className="px-3 py-1 rounded-lg bg-slate-800 text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors text-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Shift Details Modal */}
      {selectedShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 px-6 py-4 border-b border-slate-700/50 bg-slate-800/50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-100">Shift Details</h2>
              <button
                onClick={() => setSelectedShift(null)}
                className="text-slate-400 hover:text-slate-100 transition-colors text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Cashier Info */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3">
                  Cashier
                </h3>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-100 font-medium">
                    {selectedShift.cashier.fullName}
                  </p>
                  <p className="text-slate-400 text-sm">
                    {selectedShift.cashier.email}
                  </p>
                </div>
              </div>

              {/* Shift Times */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-xs mb-1">Opened</p>
                  <p className="text-slate-100 font-medium text-sm">
                    {formatDate(selectedShift.openedAt)}
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-slate-400 text-xs mb-1">Closed</p>
                  <p className="text-slate-100 font-medium text-sm">
                    {selectedShift.closedAt
                      ? formatDate(selectedShift.closedAt)
                      : 'Still Open'}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-slate-400 text-xs mb-2">Status</p>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedShift.status === 'OPEN'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-slate-700/50 text-slate-300'
                  }`}
                >
                  {selectedShift.status}
                </span>
              </div>

              {/* Cash Drawer */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3">
                  Cash Drawer
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-xs mb-1">Opening Cash</p>
                    <p className="text-slate-100 font-medium">
                      {formatCurrency(selectedShift.openingCash)}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-xs mb-1">Closing Cash</p>
                    <p className="text-slate-100 font-medium">
                      {selectedShift.closingCash !== null
                        ? formatCurrency(selectedShift.closingCash)
                        : '-'}
                    </p>
                  </div>
                  {selectedShift.closedAt && (
                    <>
                      <div className="bg-slate-800/50 rounded-lg p-4">
                        <p className="text-slate-400 text-xs mb-1">
                          Expected Cash
                        </p>
                        <p className="text-slate-100 font-medium">
                          {selectedShift.expectedCash !== null
                            ? formatCurrency(selectedShift.expectedCash)
                            : '-'}
                        </p>
                      </div>
                      <div
                        className={`bg-slate-800/50 rounded-lg p-4 ${
                          selectedShift.difference && selectedShift.difference !== 0
                            ? 'border border-yellow-500/50'
                            : ''
                        }`}
                      >
                        <p className="text-slate-400 text-xs mb-1">
                          Difference
                        </p>
                        <p
                          className={`font-medium ${
                            selectedShift.difference === 0
                              ? 'text-green-400'
                              : selectedShift.difference === null
                              ? 'text-slate-100'
                              : 'text-yellow-400'
                          }`}
                        >
                          {selectedShift.difference !== null
                            ? formatCurrency(selectedShift.difference)
                            : '-'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Sales Summary */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3">
                  Sales
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-xs mb-1">
                      Number of Sales
                    </p>
                    <p className="text-slate-100 font-medium text-lg">
                      {selectedShift.summary.sales.count}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-xs mb-1">Subtotal</p>
                    <p className="text-slate-100 font-medium">
                      {formatCurrency(selectedShift.summary.sales.subtotal)}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-xs mb-1">Discount</p>
                    <p className="text-orange-400 font-medium">
                      {formatCurrency(selectedShift.summary.sales.discount)}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-xs mb-1">Tax</p>
                    <p className="text-slate-100 font-medium">
                      {formatCurrency(selectedShift.summary.sales.tax)}
                    </p>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 col-span-2">
                    <p className="text-slate-400 text-xs mb-1">Total Sales</p>
                    <p className="text-green-400 font-bold text-lg">
                      {formatCurrency(selectedShift.summary.sales.total)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Refunds Summary */}
              {selectedShift.summary.refunds.count > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-300 mb-3">
                    Refunds
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-slate-400 text-xs mb-1">
                        Number of Refunds
                      </p>
                      <p className="text-slate-100 font-medium text-lg">
                        {selectedShift.summary.refunds.count}
                      </p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                      <p className="text-slate-400 text-xs mb-1">
                        Total Refunded
                      </p>
                      <p className="text-red-400 font-bold">
                        {formatCurrency(selectedShift.summary.refunds.amount)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Methods */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3">
                  Payments by Method
                </h3>
                <div className="space-y-2">
                  {Object.entries(selectedShift.summary.payments).map(
                    ([method, amount]) => (
                      <div
                        key={method}
                        className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3"
                      >
                        <p className="text-slate-300">{method}</p>
                        <p className="text-slate-100 font-medium">
                          {formatCurrency(amount)}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedShift.note && (
                <div>
                  <h3 className="text-sm font-medium text-slate-300 mb-3">
                    Notes
                  </h3>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-300 text-sm">{selectedShift.note}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

