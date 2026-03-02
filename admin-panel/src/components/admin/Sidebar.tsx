"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = { open: boolean; onClose: () => void };

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/reports", label: "Reports" },
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
          "fixed z-50 h-dvh w-72 border-r bg-background p-4 md:sticky md:translate-x-0",
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
                  active ? "bg-muted font-medium" : "hover:bg-muted/70",
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