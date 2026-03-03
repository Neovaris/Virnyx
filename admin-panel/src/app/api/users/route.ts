import { NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";

async function readJsonSafe(res: Response) {
  return res.json().catch(() => ({}));
}

export async function GET(req: Request) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const page = searchParams.get("page") ?? "1";
  const limit = searchParams.get("limit") ?? "20";

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const upstream = await fetch(
    `${apiBase}/users?q=${encodeURIComponent(q)}&page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );

  const data = await readJsonSafe(upstream);
  return NextResponse.json(data, { status: upstream.status });
}

export async function POST(req: Request) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const upstream = await fetch(`${apiBase}/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await readJsonSafe(upstream);
  return NextResponse.json(data, { status: upstream.status });
}