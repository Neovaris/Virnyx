import { NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";

export async function GET(req: Request) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const page = url.searchParams.get("page") || "1";
  const limit = url.searchParams.get("limit") || "20";
  const lowStock = url.searchParams.get("lowStock"); // optional

  const apiBase = process.env.BACKEND_URL ?? "http://localhost:4000";
  const upstreamUrl =
    `${apiBase}/inventory?q=${encodeURIComponent(q)}&page=${encodeURIComponent(
      page
    )}&limit=${encodeURIComponent(limit)}` +
    (lowStock !== null ? `&lowStock=${encodeURIComponent(lowStock)}` : "");

  const upstream = await fetch(upstreamUrl, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}