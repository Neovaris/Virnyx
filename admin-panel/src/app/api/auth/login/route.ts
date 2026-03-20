import { NextResponse } from "next/server";

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

    if (!apiBase) {
      return NextResponse.json(
        { message: "NEXT_PUBLIC_API_BASE_URL is not configured" },
        { status: 500 },
      );
    }

    const res = await fetch(`${apiBase}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await readJsonSafe(res);

    if (!res.ok) {
      return NextResponse.json(
        {
          message:
              data && typeof data === "object" && "message" in data
                ? String(data.message)
                : "Login failed",
        },
        { status: res.status },
      );
    }

    const token =
      data && typeof data === "object" && "token" in data
        ? String(data.token ?? "")
        : "";

    if (!token) {
      return NextResponse.json(
        { message: "Login response did not include a token" },
        { status: 502 },
      );
    }

    const resp = NextResponse.json({ ok: true, token });
    resp.cookies.set("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return resp;
  } catch {
    return NextResponse.json(
      { message: "Unable to reach login service" },
      { status: 500 },
    );
  }
}
