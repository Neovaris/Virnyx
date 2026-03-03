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

  const body = await req.json().catch(() => ({}));

  // only allow fields your backend PATCH supports
  const payload: any = {};
  if (body.fullName !== undefined) payload.fullName = body.fullName;
  if (body.phone !== undefined) payload.phone = body.phone;
  if (body.storeId !== undefined) payload.storeId = body.storeId;

  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { message: "No fields provided to update" },
      { status: 400 }
    );
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL!;
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