"use client";

export default function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-4 hover:border-slate-600/50 transition-colors">
      <div className="text-xs text-slate-400 font-medium mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-100">{value}</div>
      {helper && <div className="text-xs text-slate-500 mt-1">{helper}</div>}
    </div>
  );
}