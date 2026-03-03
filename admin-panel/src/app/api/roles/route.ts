// src/app/api/roles/route.ts
import { NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export async function GET() {
  const token = await getTokenFromCookie();

  const res = await fetch(`${API_BASE}/roles`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
    cache: "no-store",
  });

  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}