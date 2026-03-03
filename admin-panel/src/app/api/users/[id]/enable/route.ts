import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function PATCH(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const token = (await cookies()).get("token")?.value;
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const res = await fetch(`${apiBase}/users/${id}/enable`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}