"use client";

import { useEffect, useMemo, useState } from "react";

type RoleObj = { id: string; name: string };

export default function UserRoleEditor({
  userId,
  currentRoles,
  onChanged,
}: {
  userId: string;
  currentRoles: RoleObj[];
  onChanged?: () => Promise<void> | void;
}) {
  const [allRoles, setAllRoles] = useState<RoleObj[]>([]);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => {
    return new Set((currentRoles ?? []).map((r) => r.id));
  }, [currentRoles]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setError(null);
      const res = await fetch("/api/roles", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!alive) return;

      if (!res.ok) {
        setError(body?.message || "Failed to load roles");
        setAllRoles([]);
        return;
      }

      // supports: { items: RoleObj[] } OR direct array
      const items: RoleObj[] = Array.isArray(body) ? body : body?.items ?? [];
      setAllRoles(items);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const toggle = async (role: RoleObj) => {
    setError(null);
    setSavingRoleId(role.id);

    try {
      const isOn = selected.has(role.id);

      if (!isOn) {
        // ASSIGN
        const res = await fetch(`/api/users/${encodeURIComponent(userId)}/roles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roleId: role.id }),
        });

        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(body?.message || "Failed to assign role");
          setSavingRoleId(null);
          return;
        }

        // Update local state immediately for UX
        selected.add(role.id);
      } else {
        // REMOVE
        const res = await fetch(
          `/api/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(role.id)}`,
          { method: "DELETE" },
        );

        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(body?.message || "Failed to remove role");
          setSavingRoleId(null);
          return;
        }

        // Update local state immediately for UX
        selected.delete(role.id);
      }

      // Call callback to refresh user data
      await onChanged?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setSavingRoleId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
      <div className="text-sm font-medium text-slate-100">Roles</div>
      <div className="text-xs text-slate-500">Toggle roles for this user</div>

      {allRoles.length === 0 ? (
        <div className="mt-3 text-sm text-slate-400">
          {error ? error : "No roles found."}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {allRoles.map((r) => {
            const isOn = selected.has(r.id);
            const busy = savingRoleId === r.id;

            return (
              <button
                key={r.id}
                type="button"
                disabled={busy}
                onClick={() => toggle(r)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs transition",
                  busy ? "opacity-60" : "hover:opacity-95",
                  isOn
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-slate-700 bg-slate-950/40 text-slate-300",
                ].join(" ")}
                title={isOn ? "Click to remove" : "Click to assign"}
              >
                {r.name}
                {isOn ? " ✓" : ""}
              </button>
            );
          })}
        </div>
      )}

      {error && allRoles.length > 0 ? (
        <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}