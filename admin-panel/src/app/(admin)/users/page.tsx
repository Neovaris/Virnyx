"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Guard from "@/components/admin/Guard";
import UserRoleEditor from "@/components/admin/UserRoleEditor";
import { PasswordInput } from "@/components/admin/password_input";
import { SkeletonTable } from "@/components/admin/SkeletonLoader";

type RoleObj = { id: string; name: string };

type UserRow = {
  id: string;
  storeId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  status: "active" | "disabled" | null;
  lastLoginAt: string | null;
  createdAt: string;
  roles: RoleObj[];
};

type UsersList = {
  page: number;
  limit: number;
  total: number;
  pages: number;
  items: UserRow[];
};

function rolesToNames(u: UserRow) {
  return (u.roles ?? []).map((r) => r?.name).filter(Boolean);
}
function isDisabled(u: UserRow) {
  return (u.status ?? "active").toLowerCase() === "disabled";
}

export default function UsersPage() {
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [role, setRole] = useState<string>(""); // client-side filter by role name
  const [page, setPage] = useState(1);
  const limit = 20;

  const [data, setData] = useState<UsersList | null>(null);
  const [loading, setLoading] = useState(true);

  // roles for dropdown
  const [roles, setRoles] = useState<RoleObj[]>([]);

  // modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [storeId, setStoreId] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(q.trim()), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const fetchRoles = useCallback(async () => {
    const res = await fetch("/api/roles", { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (res.ok) setRoles(body?.items ?? []);
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/users?q=${encodeURIComponent(qDebounced)}&page=${page}&limit=${limit}`,
        { cache: "no-store" },
      );
      const body = await res.json().catch(() => ({}));
      setData(res.ok ? body : null);
    } finally {
      setLoading(false);
    }
  }, [qDebounced, page]);

  const refreshEditingUser = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        cache: "no-store",
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        // ✅ don't block the modal; just keep current row data
        return;
      }

      const fresh: UserRow | null = body?.user ?? null;
      if (!fresh) return;

      setEditing(fresh);
      setFullName(fresh.fullName ?? "");
      setEmail(fresh.email ?? "");
      setPhone(fresh.phone ?? "");
      setStoreId(fresh.storeId ?? "");
    } catch {
      // ✅ silent fail
    }
  }, []);

  // ✅ FIXED: openEdit sets editing immediately, then refreshes in background
  const openEdit = useCallback(
    (u: UserRow) => {
      setErr(null);

      // show Edit modal instantly (prevents "New user" flash)
      setEditing(u);
      setFullName(u.fullName ?? "");
      setEmail(u.email ?? "");
      setPhone(u.phone ?? "");
      setStoreId(u.storeId ?? "");
      setPassword("");

      setOpen(true);

      // refresh from backend for latest roles/data (non-blocking)
      refreshEditingUser(u.id);
    },
    [refreshEditingUser],
  );

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const itemsRaw = useMemo(() => data?.items ?? [], [data]);

  const items = useMemo(() => {
    if (!role) return itemsRaw;
    return itemsRaw.filter((u) => rolesToNames(u).includes(role));
  }, [itemsRaw, role]);

  const openCreate = () => {
    setErr(null);
    setEditing(null);
    setFullName("");
    setEmail("");
    setPhone("");
    setStoreId("");
    setPassword("");
    setOpen(true);
  };

  // ✅ recommended: clear editing on close to avoid state leaks
  const closeModal = () => {
    if (saving) return;
    setOpen(false);
    setEditing(null);
    setErr(null);
  };

  const submit = async () => {
    setErr(null);
    setSaving(true);

    try {
      if (!fullName.trim()) return setErr("Full name is required");

      if (!editing) {
        // CREATE
        if (!email.trim()) return setErr("Email is required");
        if (!password.trim() || password.trim().length < 6)
          return setErr("Password must be at least 6 characters");

        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim() || null,
            storeId: storeId.trim() || null,
            password: password.trim(),
          }),
        });

        const body = await res.json().catch(() => ({}));
        if (!res.ok) return setErr(body?.message || "Create user failed");
      } else {
        // EDIT (backend supports fullName, phone, storeId)
        const patchBody: {
          fullName: string;
          phone: string | null;
          storeId: string | null;
        } = {
          fullName: fullName.trim(),
          phone: phone.trim() || null,
          storeId: storeId.trim() || null,
        };

        const res = await fetch(
          `/api/users/${encodeURIComponent(editing.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patchBody),
          },
        );

        const body = await res.json().catch(() => ({}));
        if (!res.ok) return setErr(body?.message || "Update user failed");
      }

      setOpen(false);
      setEditing(null);
      await fetchList();
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (u: UserRow) => {
    const next = isDisabled(u) ? "enable" : "disable";
    const ok = window.confirm(
      `${next === "disable" ? "Disable" : "Enable"} ${u.fullName}?`,
    );
    if (!ok) return;

    const res = await fetch(`/api/users/${encodeURIComponent(u.id)}/${next}`, {
      method: "PATCH",
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(body?.message || "Status update failed");
      return;
    }
    await fetchList();
  };

  return (
    <Guard perm="users:read">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Users</h1>
            <div className="text-sm text-slate-400">
              {data?.total ?? 0} user(s)
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder="Search name / email..."
              className="w-full sm:w-80 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
            />

            <select
              value={role}
              onChange={(e) => {
                setPage(1);
                setRole(e.target.value);
              }}
              className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm outline-none"
              title="Role filter (client-side)"
            >
              <option value="">All roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>

            <Guard perm="users:write">
              <button
                onClick={openCreate}
                className="rounded-xl border border-indigo-500/30 bg-indigo-500/20 px-4 py-2 text-sm hover:bg-indigo-500/30"
              >
                + New user
              </button>
            </Guard>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/60">
                <tr>
                  <Th label="User" />
                  <Th label="Roles" />
                  <Th label="Status" />
                  <Th label="Last login" />
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td className="px-4 py-0" colSpan={5}>
                      <SkeletonTable rows={5} />
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-400" colSpan={5}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  items.map((u) => {
                    const disabled = isDisabled(u);
                    const roleNames = rolesToNames(u);

                    return (
                      <tr key={u.id} className="hover:bg-slate-900/30">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-100">
                            {u.fullName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {u.email}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-300">
                          {roleNames.length ? roleNames.join(", ") : "-"}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={[
                              "inline-flex rounded-full px-2 py-1 text-xs border",
                              disabled
                                ? "border-red-500/30 bg-red-500/10 text-red-200"
                                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
                            ].join(" ")}
                          >
                            {disabled ? "Disabled" : "Active"}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-slate-300">
                          {u.lastLoginAt
                            ? new Date(u.lastLoginAt).toLocaleString()
                            : "-"}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex flex-wrap items-center gap-2 justify-end">
                            <Guard perm="users:write">
                              <button
                                onClick={() => openEdit(u)}
                                className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-xs hover:bg-slate-900/60"
                              >
                                Edit
                              </button>

                              <button
                                onClick={() => toggleStatus(u)}
                                className={[
                                  "rounded-lg px-3 py-1.5 text-xs border",
                                  disabled
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                                    : "border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20",
                                ].join(" ")}
                              >
                                {disabled ? "Enable" : "Disable"}
                              </button>
                            </Guard>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <div className="text-xs text-slate-500">
              Page {data?.page ?? 1} of {data?.pages ?? 1} • {data?.total ?? 0}{" "}
              total
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={(data?.page ?? 1) <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm disabled:opacity-50 hover:bg-slate-900/60"
              >
                Prev
              </button>
              <button
                disabled={(data?.page ?? 1) >= (data?.pages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm disabled:opacity-50 hover:bg-slate-900/60"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Modal */}
        {open ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={closeModal}
            />
            <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {editing ? "Edit user" : "New user"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Edit supports: fullName, phone, storeId. Roles can be edited
                    below (admins only).
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="rounded-lg border border-slate-800 bg-slate-900/40 px-2 py-1 text-sm hover:bg-slate-900/60"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <Field label="Full name">
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </Field>

                <Field label="Email">
                  <input
                    value={email}
                    disabled={Boolean(editing)}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60"
                  />
                </Field>

                <Field label="Phone (optional)">
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </Field>

                <Field label="Store ID (optional)">
                  <input
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    placeholder="df60fe8a-..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </Field>

                {!editing ? (
                  <Field label="Password (create only)">
                    <PasswordInput
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </Field>
                ) : null}

                {/* ✅ Roles editor (only when editing an existing user) */}
                {editing ? (
                  <Guard perm="users:write">
                    <UserRoleEditor
                      userId={editing.id}
                      currentRoles={editing.roles ?? []}
                      onChanged={async () => {
                        await refreshEditingUser(editing.id);
                        await fetchList();
                      }}
                    />
                  </Guard>
                ) : null}

                {err ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {err}
                  </div>
                ) : null}

                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    onClick={closeModal}
                    className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm hover:bg-slate-900/60"
                  >
                    Cancel
                  </button>

                  <Guard perm="users:write">
                    <button
                      disabled={saving}
                      onClick={submit}
                      className="rounded-xl border border-indigo-500/30 bg-indigo-500/20 px-4 py-2 text-sm hover:bg-indigo-500/30 disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </Guard>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Guard>
  );
}

function Th({ label }: { label: string }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
      {label}
    </th>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-slate-400">{label}</div>
      {children}
    </label>
  );
}
