import { NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

async function readJsonSafe(res: Response) {
  const text = await res.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text || "Invalid JSON from backend" };
  }
}

export async function POST(req: Request) {
  const token = await getTokenFromCookie();
  const payload = await req.json().catch(() => ({}));

  // Validate required fields
  if (!payload.merchantName?.trim() || !payload.storeName?.trim() || 
      !payload.fullName?.trim() || !payload.email?.trim() || !payload.password?.trim()) {
    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400 }
    );
  }

  const res = await fetch(`${BACKEND_URL}/auth/register-merchant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
  });

  const body = await readJsonSafe(res);
  return NextResponse.json(body, { status: res.status });
}
