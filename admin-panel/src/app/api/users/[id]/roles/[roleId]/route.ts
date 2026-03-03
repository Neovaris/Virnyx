import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function readJsonSafe(res: Response) {
  return res.json().catch(() => ({}));
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; roleId: string }> }
) {
  const { id, roleId } = await ctx.params;

  const token = (await cookies()).get("token")?.value;
  if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const upstream = await fetch(
    `${apiBase}/users/${encodeURIComponent(id)}/roles/${encodeURIComponent(roleId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );

  const data = await readJsonSafe(upstream);
  return NextResponse.json(data, { status: upstream.status });
}