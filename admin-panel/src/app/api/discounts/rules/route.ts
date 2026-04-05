import { NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";

const API_BASE = process.env.BACKEND_URL ?? "http://localhost:4000";

export async function GET(req: Request) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const active = url.searchParams.get("active") || "";
  const page = url.searchParams.get("page") || "1";
  const limit = url.searchParams.get("limit") || "20";

  let queryString = `?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`;
  if (search) queryString += `&search=${encodeURIComponent(search)}`;
  if (active) queryString += `&active=${encodeURIComponent(active)}`;

  const upstream = await fetch(`${API_BASE}/discounts/rules${queryString}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}

export async function POST(req: Request) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const upstream = await fetch(`${API_BASE}/discounts/rules`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
