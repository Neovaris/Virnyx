import { NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";

export async function POST(req: Request) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const apiBase = process.env.BACKEND_URL ?? "http://localhost:4000";
  const upstream = await fetch(`${apiBase}/inventory/stock-in`, {
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