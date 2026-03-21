import { NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";

export async function GET() {
  const token = await getTokenFromCookie();
  
  console.log("[Frontend /api/auth/me] Token from cookie:", {
    hasToken: !!token,
    tokenLength: token?.length ?? 0,
  });
  
  if (!token) {
    console.warn("[Frontend /api/auth/me] No token cookie found");
    return NextResponse.json({ message: "No token" }, { status: 401 });
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL!;
  
  console.log("[Frontend /api/auth/me] Calling backend", { apiBase });
  
  const res = await fetch(`${apiBase}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  
  console.log("[Frontend /api/auth/me] Backend response:", {
    status: res.status,
    hasRoles: !!data?.roles,
    roles: data?.roles,
  });
  
  return NextResponse.json(data, { status: res.status });
}