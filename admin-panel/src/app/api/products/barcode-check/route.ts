import { NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";

export async function GET(req: Request) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const url = new URL(req.url);
  const barcode = url.searchParams.get("barcode") || "";
  const excludeId = url.searchParams.get("excludeId") || "";

  const apiBase = process.env.BACKEND_URL ?? "http://localhost:4000";
  const params = new URLSearchParams({ barcode });
  if (excludeId) params.set("excludeId", excludeId);

  const upstream = await fetch(`${apiBase}/products/barcode-check?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
