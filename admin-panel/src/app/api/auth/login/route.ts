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
    const cookieConfig = {
      httpOnly: true,
      sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as const,
      secure: process.env.NODE_ENV === "production",
      path: "/" as const,
      maxAge: 60 * 60 * 24 * 7,
    };
    
    console.log("[Login] Setting token cookie with config:", {
      ...cookieConfig,
      token: `${token.substring(0, 20)}...`,
      NODE_ENV: process.env.NODE_ENV,
    });
    
    resp.cookies.set("token", token, cookieConfig);

    return resp;
  } catch {
    return NextResponse.json(
      { message: "Unable to reach login service" },
      { status: 500 },
    );
  }
}
