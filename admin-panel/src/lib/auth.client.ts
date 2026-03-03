import type { MeResponse } from "./auth.shared";

export async function clientMe(): Promise<MeResponse | null> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function clientLogout() {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function clientLogin(email: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  return res.json();
}