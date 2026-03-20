import { NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const { id } = await params;
  const refundId = id;
  if (!refundId) {
    return NextResponse.json({ message: "Refund ID is required" }, { status: 400 });
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL!;

  try {
    const res = await fetch(`${apiBase}/refunds/${encodeURIComponent(refundId)}/approve`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return NextResponse.json(
        body || { message: "Failed to approve refund" },
        { status: res.status }
      );
    }

    const body = await res.json();
    return NextResponse.json(body, { status: 200 });
  } catch (e: any) {
    console.error("Error approving refund:", e);
    return NextResponse.json(
      { message: "Server error approving refund" },
      { status: 500 }
    );
  }
}
