import type { MeResponse } from "./auth.shared";

async function readJsonSafe<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function clientMe(): Promise<MeResponse | null> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  if (!res.ok) return null;
  return readJsonSafe<MeResponse>(res);
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
  return readJsonSafe<{ ok: boolean }>(res);
}
