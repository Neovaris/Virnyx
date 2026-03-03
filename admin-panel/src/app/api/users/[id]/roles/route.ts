import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function readJsonSafe(res: Response) {
  return res.json().catch(() => ({}));
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const token = (await cookies()).get("token")?.value;
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const upstream = await fetch(`${apiBase}/users/${encodeURIComponent(id)}/roles`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await readJsonSafe(upstream);
  return NextResponse.json(data, { status: upstream.status });
}