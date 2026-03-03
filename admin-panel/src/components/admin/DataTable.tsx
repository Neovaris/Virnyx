"use client";

type Column<T> = {
  header: string;
  accessor: (row: T) => React.ReactNode;
  className?: string;
};

export default function DataTable<T>({
  columns,
  rows,
  emptyText = "No data",
}: {
  columns: Column<T>[];
  rows: T[];
  emptyText?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800">
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/60">
            <tr>
              {columns.map((c, idx) => (
                <th
                  key={idx}
                  className={[
                    "px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400",
                    c.className || "",
                  ].join(" ")}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-900/30">
                  {columns.map((c, cIdx) => (
                    <td key={cIdx} className="px-4 py-3 text-slate-200">
                      {c.accessor(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}