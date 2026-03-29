"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/admin/AuthProvider";
import Sidebar from "./Sidebar";
import { useState, useEffect } from "react";

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { me, loading, doLogout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ✅ Redirect if not authenticated
  useEffect(() => {
    if (!loading && !me) {
      router.replace("/login");
    }
  }, [loading, me, router]);

  // ✅ Loading / redirect state
  if (loading || !me) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-950">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  const nav = [
    { href: "/", label: "Dashboard" },
    { href: "/dashboard", label: "Analytics" },
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
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <div className="flex">
        {/* ✅ MOBILE SIDEBAR */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* ✅ DESKTOP SIDEBAR */}
        <aside className="fixed left-0 top-0 h-screen w-64 border-r border-slate-700/50 p-6 hidden lg:flex flex-col bg-slate-950 overflow-y-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-sm font-bold text-white">V</span>
            </div>
            <span className="font-bold text-slate-100">Virnyx</span>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-slate-900/80 border border-slate-700/60 mb-8 shadow-lg">
            {/* Avatar */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-sm font-bold text-white">
                  {me.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">
                  {me.fullName}
                </p>
                <p className="text-xs text-slate-400 truncate">{me.email}</p>
              </div>
            </div>

            {/* Store Badge */}
            {me.storeName && (
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-indigo-400">🏪</span>
                  <span className="text-slate-300 font-medium">
                    {me.storeName}
                  </span>
                </div>
              </div>
            )}
          </div>

          <nav className="space-y-1 flex-1">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "block px-4 py-2.5 text-sm rounded-xl transition-all duration-200 font-medium",
                    active
                      ? "bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-slate-100 border border-indigo-500/40 shadow-lg shadow-indigo-500/10"
                      : "text-slate-300 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent hover:border-slate-700/50",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={doLogout}
            className="w-full flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-400 hover:from-red-500/30 hover:to-red-600/30 transition-all duration-200 border border-red-500/30 hover:border-red-500/50 font-medium"
          >
            Logout
          </button>
        </aside>

        {/* ✅ MAIN CONTENT */}
        <main className="flex-1 flex flex-col lg:ml-64 min-h-dvh">
          {/* HEADER */}
          <div className="border-b border-slate-700/30 px-4 py-4 flex justify-between items-center bg-gradient-to-r from-slate-900/80 to-slate-950/60 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              {/* Hamburger */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-300 text-xl"
              >
                ☰
              </button>

              <h1 className="text-xl font-bold">Admin Panel</h1>
            </div>

            <div className="flex lg:hidden items-center gap-4">
              <span className="text-sm text-slate-400">{me.fullName}</span>
              <button
                onClick={doLogout}
                className="text-sm px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20 hover:border-red-500/40 font-medium"
              >
                Logout
              </button>
            </div>
          </div>

          {/* PAGE CONTENT */}
          <div className="flex-1 p-6 overflow-y-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
