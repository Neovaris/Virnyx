import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const res = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  const token = data.token as string;

  const resp = NextResponse.json({ ok: true });
  resp.cookies.set("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return resp;
}