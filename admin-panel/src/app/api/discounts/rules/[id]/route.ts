import { NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ message: "No token" }, { status: 401 });
  }

  const upstream = await fetch(`${API_BASE}/discounts/rules/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ message: "No token" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const upstream = await fetch(`${API_BASE}/discounts/rules/${id}`, {
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ message: "No token" }, { status: 401 });
  }

  const upstream = await fetch(`${API_BASE}/discounts/rules/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (upstream.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}