// src/components/admin/AuthProvider.tsx
"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { MeResponse } from "@/lib/auth.shared";
import { clientMe, clientLogout } from "@/lib/auth.client";
import { useRouter } from "next/navigation";

type AuthCtx = {
  me: MeResponse["user"] | null;
  permissions: string[];
  loading: boolean;
  can: (perm: string) => boolean;
  refresh: () => Promise<void>;
  doLogout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await clientMe();
      if (!data) {
        setMe(null);
        setPermissions([]);
        return;
      }
      setMe(data.user);
      setPermissions(data.permissions || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const doLogout = useCallback(async () => {
    try {
      await clientLogout();
    } catch {}
    setMe(null);
    setPermissions([]);
    router.replace("/login");
    router.refresh();
  }, [router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const can = useCallback((perm: string) => permissions.includes(perm), [permissions]);

  const value = useMemo(
    () => ({ me, permissions, loading, can, refresh, doLogout }),
    [me, permissions, loading, can, refresh, doLogout]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}