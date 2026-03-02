import { NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const res = await fetch(`${apiBase}/sales/${encodeURIComponent(params.id)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}