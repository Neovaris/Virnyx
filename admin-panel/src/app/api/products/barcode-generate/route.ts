import { NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";

export async function POST() {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const apiBase = process.env.BACKEND_URL ?? "http://localhost:4000";
  const upstream = await fetch(`${apiBase}/products/barcode-generate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
