import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const apiBase = process.env.BACKEND_URL ?? "http://localhost:4000";

    const res = await fetch(`${apiBase}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    // If signup returns a token, set it in a cookie
    const token = data.token as string;

    if (token) {
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

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { message: "Signup failed" },
      { status: 500 }
    );
  }
}
