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

export async function GET() {
  const token = await getTokenFromCookie();
  const res = await fetch(`${BACKEND_URL}/settings/merchant`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const body = await readJsonSafe(res);
  return NextResponse.json(body, { status: res.status });
}

export async function PATCH(req: Request) {
  const token = await getTokenFromCookie();
  const payload = await req.json().catch(() => ({}));

  const res = await fetch(`${BACKEND_URL}/settings/merchant`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await readJsonSafe(res);
  return NextResponse.json(body, { status: res.status });
}