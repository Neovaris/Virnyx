import { NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";

export async function GET(req: Request) {
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const url = new URL(req.url);
  const receiptNo = String(url.searchParams.get("receiptNo") || "").trim();
  const date = String(url.searchParams.get("date") || "").trim(); // optional helper

  if (!receiptNo) {
    return NextResponse.json({ message: "receiptNo is required" }, { status: 400 });
  }

  const apiBase = process.env.BACKEND_URL ?? "http://localhost:4000";
  // We don't have /sales/by-receipt, so we use your report list for a date (fast).
  // If date isn't provided, we try today + yesterday.
  const datesToTry = date
    ? [date]
    : [
        new Date().toISOString().slice(0, 10),
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      ];

  for (const d of datesToTry) {
    const res = await fetch(
      `${apiBase}/reports/sales?date=${encodeURIComponent(d)}&status=COMPLETED&page=1&limit=100`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );

    if (!res.ok) continue;

    const body = await res.json().catch(() => ({} as { items?: unknown }));
    const items = Array.isArray(body?.items)
      ? (body.items as Array<{ id?: unknown; receiptNo?: unknown }>)
      : [];
    const hit = items.find((x) => String(x?.receiptNo) === receiptNo);

    if (hit?.id) return NextResponse.json({ saleId: hit.id, receiptNo }, { status: 200 });
  }

  return NextResponse.json({ message: "Sale not found (try selecting a date)" }, { status: 404 });
}