import { NextResponse, type NextRequest } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

async function readJsonSafe(res: Response) {
  const text = await res.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text || "Invalid JSON from backend" };
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const token = await getTokenFromCookie();
  const res = await fetch(
    `${BACKEND_URL}/settings/receipt/templates/${resolvedParams.id}/activate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }
  );

  const body = await readJsonSafe(res);
  return NextResponse.json(body, { status: res.status });
}
