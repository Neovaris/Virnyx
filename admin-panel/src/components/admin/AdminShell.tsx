// src/components/admin/AdminShell.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/admin/AuthProvider";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { me, loading, doLogout } = useAuth();

  // While auth is loading, show a simple loading screen
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-950">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  // If not logged in, admin pages will be redirected by middleware/AuthProvider
  if (!me) return <>{children}</>;

  const nav = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/products", label: "Products" },
    { href: "/inventory", label: "Inventory" },
    { href: "/sales", label: "Sales" },
    { href: "/discounts", label: "Discounts" },
    { href: "/shifts", label: "Shifts" },
    { href: "/cashiers", label: "Cashiers" },
    { href: "/reports", label: "Reports" },
    { href: "/refunds", label: "Refunds" },
    { href: "/users", label: "Users" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <div className="min-h-dvh flex flex-col bg-slate-950">
      <div className="flex flex-1">
        <aside className="w-64 border-r border-slate-700/50 p-6 hidden lg:flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-sm font-bold text-white">V</span>
            </div>
            <span className="font-bold text-slate-100">Virnyx</span>
          </div>

          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 mb-8">
            <p className="text-xs text-slate-400 mb-1">Logged in as</p>
            <p className="text-sm font-medium text-slate-100">{me.fullName}</p>
            <p className="text-xs text-slate-500">{me.email}</p>
          </div>

          <nav className="space-y-2 flex-1">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "block px-4 py-2 text-sm rounded-lg transition-colors",
                    active
                      ? "bg-slate-800/70 text-slate-100"
                      : "text-slate-300 hover:text-slate-100 hover:bg-slate-800/50",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={doLogout}
            className="w-full text-center text-sm px-4 py-2 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-slate-700/50"
          >
            Logout
          </button>
        </aside>

        <main className="flex-1 flex flex-col">
          <div className="border-b border-slate-700/50 px-8 py-4 flex justify-between items-center bg-slate-900/50">
            <h1 className="text-2xl font-bold text-slate-100">Admin Panel</h1>
            <div className="flex items-center gap-4 lg:hidden">
              <span className="text-sm text-slate-400">{me.fullName}</span>
              <button
                onClick={doLogout}
                className="text-sm px-4 py-2 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="flex-1 p-8 overflow-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}