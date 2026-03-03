import { NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const upstream = await fetch(`${apiBase}/sales/${encodeURIComponent(params.id)}/refunds`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const upstream = await fetch(`${apiBase}/sales/${encodeURIComponent(params.id)}/refunds`, {
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