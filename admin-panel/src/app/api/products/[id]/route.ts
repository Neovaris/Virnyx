import { NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";

function invalidId(id: string | undefined) {
  return !id || id === "undefined" || id === "null";
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const { id } = await params;
  if (invalidId(id)) {
    return NextResponse.json({ message: "Invalid product id" }, { status: 400 });
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const upstream = await fetch(`${apiBase}/products/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const { id } = await params;
  if (invalidId(id)) {
    return NextResponse.json({ message: "Invalid product id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const upstream = await fetch(`${apiBase}/products/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const { id } = await params;
  if (invalidId(id)) {
    return NextResponse.json({ message: "Invalid product id" }, { status: 400 });
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const upstream = await fetch(`${apiBase}/products/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}