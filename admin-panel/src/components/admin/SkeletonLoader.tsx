/**
 * Skeleton Loaders - Modern loading placeholders
 * Provides animated skeleton screens for different content types
 */

export function SkeletonCard() {
  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
      <div className="space-y-4">
        <div className="h-4 w-24 bg-slate-700 rounded animate-pulse" />
        <div className="h-8 w-32 bg-slate-700 rounded animate-pulse" />
        <div className="h-3 w-20 bg-slate-700 rounded animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonMetricsGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonSection() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-40 bg-slate-700 rounded animate-pulse" />
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6 space-y-3">
        <div className="h-4 w-full bg-slate-700 rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-slate-700 rounded animate-pulse" />
        <div className="h-4 w-4/6 bg-slate-700 rounded animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-700/50 bg-slate-800/50">
            <th className="px-6 py-3">
              <div className="h-4 w-24 bg-slate-700 rounded animate-pulse" />
            </th>
            <th className="px-6 py-3">
              <div className="h-4 w-20 bg-slate-700 rounded animate-pulse" />
            </th>
            <th className="px-6 py-3">
              <div className="h-4 w-28 bg-slate-700 rounded animate-pulse" />
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-b border-slate-700/50">
              <td className="px-6 py-4">
                <div className="h-4 w-32 bg-slate-700 rounded animate-pulse" />
              </td>
              <td className="px-6 py-4">
                <div className="h-4 w-16 bg-slate-700 rounded animate-pulse" />
              </td>
              <td className="px-6 py-4">
                <div className="h-4 w-24 bg-slate-700 rounded animate-pulse" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-slate-700 rounded animate-pulse" />
        <div className="h-4 w-64 bg-slate-700 rounded animate-pulse" />
      </div>

      {/* Today's Section */}
      <div className="space-y-4">
        <div className="h-6 w-32 bg-slate-700 rounded animate-pulse" />
        <SkeletonMetricsGrid count={4} />
      </div>

      {/* Performance Section */}
      <div className="space-y-4">
        <div className="h-6 w-40 bg-slate-700 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>

      {/* Inventory Section */}
      <div className="space-y-4">
        <div className="h-6 w-32 bg-slate-700 rounded animate-pulse" />
        <SkeletonMetricsGrid count={4} />
      </div>

      {/* Top Performers Table */}
      <div className="space-y-4">
        <div className="h-6 w-44 bg-slate-700 rounded animate-pulse" />
        <SkeletonTable rows={5} />
      </div>
    </div>
  );
}

export function SkeletonReports() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-56 bg-slate-700 rounded animate-pulse" />
        <div className="h-4 w-48 bg-slate-700 rounded animate-pulse" />
      </div>

      {/* Date Range Selector Skeleton */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-24 bg-slate-700 rounded animate-pulse" />
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <SkeletonMetricsGrid count={4} />

      {/* Charts/Content Section */}
      <div className="space-y-4">
        <div className="h-6 w-40 bg-slate-700 rounded animate-pulse" />
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6 h-96 bg-gradient-to-b from-slate-700/20 to-slate-800/20 animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonShifts() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-40 bg-slate-700 rounded animate-pulse" />
        <div className="h-4 w-48 bg-slate-700 rounded animate-pulse" />
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <div className="h-10 w-32 bg-slate-700 rounded animate-pulse" />
        <div className="h-10 w-32 bg-slate-700 rounded animate-pulse" />
      </div>

      {/* Table */}
      <SkeletonTable rows={8} />
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 space-y-3"
        >
          <div className="h-4 w-64 bg-slate-700 rounded animate-pulse" />
          <div className="h-3 w-48 bg-slate-700 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonSettings() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-40 bg-slate-700 rounded animate-pulse" />
        <div className="h-4 w-64 bg-slate-700 rounded animate-pulse" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 w-24 bg-slate-700 rounded animate-pulse" />
        ))}
      </div>

      {/* Settings Section */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/40 p-6 space-y-4">
        <div className="h-6 w-48 bg-slate-700 rounded animate-pulse" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-32 bg-slate-700 rounded animate-pulse" />
              <div className="h-10 w-full bg-slate-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonProducts() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-40 bg-slate-700 rounded animate-pulse" />
        <div className="h-4 w-48 bg-slate-700 rounded animate-pulse" />
      </div>

      {/* Search and Buttons */}
      <div className="flex gap-2">
        <div className="flex-1 h-10 bg-slate-700 rounded animate-pulse" />
        <div className="h-10 w-28 bg-slate-700 rounded animate-pulse" />
      </div>

      {/* Table */}
      <SkeletonTable rows={6} />
    </div>
  );
}

export function SkeletonInventory() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-40 bg-slate-700 rounded animate-pulse" />
        <div className="h-4 w-48 bg-slate-700 rounded animate-pulse" />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="flex-1 h-10 bg-slate-700 rounded animate-pulse" />
        <div className="h-10 w-28 bg-slate-700 rounded animate-pulse" />
      </div>

      {/* Table */}
      <SkeletonTable rows={8} />
    </div>
  );
}

export function SkeletonSales() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-40 bg-slate-700 rounded animate-pulse" />
        <div className="h-4 w-48 bg-slate-700 rounded animate-pulse" />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="h-10 w-32 bg-slate-700 rounded animate-pulse" />
        <div className="h-10 w-32 bg-slate-700 rounded animate-pulse" />
      </div>

      {/* Table */}
      <SkeletonTable rows={8} />
    </div>
  );
}
