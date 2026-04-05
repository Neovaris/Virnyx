import { NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";

export async function GET(req: Request) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const url = new URL(req.url);
  const apiBase = process.env.BACKEND_URL ?? "http://localhost:4000";

  // Pass-through all query params
  const upstream = await fetch(`${apiBase}/inventory/ledger?${url.searchParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}