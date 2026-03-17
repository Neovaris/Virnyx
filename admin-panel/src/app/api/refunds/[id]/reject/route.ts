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

  let requestBody: any = { reason: "" };
  try {
    const body = await req.json();
    if (body?.reason) {
      requestBody.reason = body.reason;
    }
  } catch {
    // No body provided
  }

  try {
    const res = await fetch(`${apiBase}/refunds/${encodeURIComponent(refundId)}/reject`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });

    if (!res.ok) {
      const resBody = await res.json().catch(() => ({}));
      return NextResponse.json(
        resBody || { message: "Failed to reject refund" },
        { status: res.status }
      );
    }

    const resBody = await res.json();
    return NextResponse.json(resBody, { status: 200 });
  } catch (e: any) {
    console.error("Error rejecting refund:", e);
    return NextResponse.json(
      { message: "Server error rejecting refund" },
      { status: 500 }
    );
  }
}
