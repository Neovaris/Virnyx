"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = { open: boolean; onClose: () => void };

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

export default function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();

  return (
    <>
      {/* mobile backdrop */}
      {open && (
        <button
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          "fixed z-50 h-dvh w-72 border-r border-slate-700/50 bg-slate-950/95 backdrop-blur-md p-4 md:hidden md:sticky md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          "transition-transform",
        ].join(" ")}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="text-lg font-semibold">Virnyx Admin</div>
          <button className="md:hidden" onClick={onClose}>
            ✕
          </button>
        </div>

        <nav className="space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={[
                  "block rounded-xl px-3 py-2 text-sm",
                  active
                    ? "bg-slate-800 text-white"
                    : "hover:bg-slate-800/50 text-slate-300",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
