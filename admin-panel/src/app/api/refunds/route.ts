import { NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";

export async function GET(req: Request) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const url = new URL(req.url);
  
  const status = url.searchParams.get('status') || 'ALL';
  const limit = url.searchParams.get('limit') || '50';
  const skip = url.searchParams.get('skip') || '0';

  try {
    const query = new URLSearchParams({
      status,
      limit,
      skip,
    });
    
    const res = await fetch(`${apiBase}/refunds?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return NextResponse.json(
        body || { message: "Failed to fetch refunds" },
        { status: res.status }
      );
    }

    const body = await res.json();
    return NextResponse.json(body, { status: 200 });
  } catch (e: any) {
    console.error("Error fetching refunds:", e);
    return NextResponse.json(
      { message: "Server error fetching refunds" },
      { status: 500 }
    );
  }
}
