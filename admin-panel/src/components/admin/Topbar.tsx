"use client";

import { useAuth } from "./AuthProvider";

type Props = { onMenu: () => void };

export default function Topbar({ onMenu }: Props) {
  const { me, doLogout, loading } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:px-6">
        <button className="md:hidden" onClick={onMenu} aria-label="Open menu">
          ☰
        </button>

        <div className="flex-1 text-sm text-muted-foreground">
          {loading ? "Loading…" : me ? `Signed in as ${me.name}` : "Admin Panel"}
        </div>

        <button
          onClick={doLogout}
          className="rounded-xl border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Logout
        </button>
      </div>
    </header>
  );
}