"use client";

import { useAuth } from "./AuthProvider";

export default function Guard({
  perm,
  children,
  fallback = null,
}: {
  perm: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { loading, can } = useAuth();
  if (loading) return null; // or skeleton later
  if (!can(perm)) return fallback;
  return <>{children}</>;
}