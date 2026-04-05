import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function readJsonSafe(res: Response) {
  return res.json().catch(() => ({}));
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const token = (await cookies()).get("token")?.value;
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    fullName?: unknown;
    phone?: unknown;
    storeId?: unknown;
  };

  // only allow fields your backend PATCH supports
  const payload: { fullName?: string; phone?: string; storeId?: string } = {};
  if (typeof body.fullName === "string") payload.fullName = body.fullName;
  if (typeof body.phone === "string") payload.phone = body.phone;
  if (typeof body.storeId === "string") payload.storeId = body.storeId;

  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { message: "No fields provided to update" },
      { status: 400 }
    );
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.BACKEND_URL ?? "http://localhost:4000";
  const upstream = await fetch(`${apiBase}/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await readJsonSafe(upstream);
  return NextResponse.json(data, { status: upstream.status });
}