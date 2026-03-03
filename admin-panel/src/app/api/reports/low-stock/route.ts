import { NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";

export async function GET(req: Request) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const url = new URL(req.url);
  const threshold = url.searchParams.get("threshold") || "10";
  const limit = url.searchParams.get("limit") || "20";

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const res = await fetch(
    `${apiBase}/reports/low-stock?threshold=${encodeURIComponent(threshold)}&limit=${encodeURIComponent(limit)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}