// lib/http.ts
import "server-only";

type FetchOptions = RequestInit & { next?: { revalidate?: number } };

const API_BASE = process.env.API_BASE_URL!; // e.g. http://localhost:4000

export async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    // IMPORTANT: send cookies to your backend (admin cookie auth)
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      msg = body?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  // handle empty responses safely
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}