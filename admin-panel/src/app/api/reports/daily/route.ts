import { NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";

export async function GET(req: Request) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const url = new URL(req.url);
  const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);

  const apiBase = process.env.BACKEND_URL ?? "http://localhost:4000";
  const res = await fetch(`${apiBase}/reports/daily?date=${encodeURIComponent(date)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}