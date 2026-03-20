import { NextResponse } from "next/server";
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

export async function GET(req: Request) {
  const token = await getTokenFromCookie();
  
  // Parse query parameters for pagination
  const url = new URL(req.url);
  const page = url.searchParams.get("page") ?? "1";
  const limit = url.searchParams.get("limit") ?? "10";

  // For now, return a mock list since there's no /merchants endpoint in backend
  // In a real scenario, you'd call the backend API
  // const res = await fetch(`${BACKEND_URL}/merchants?page=${page}&limit=${limit}`, {
  //   headers: { Authorization: `Bearer ${token}` },
  //   cache: "no-store",
  // });
  
  // Mock data - replace with actual backend call when available
  const mockData = {
    data: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: 0,
      pages: 0,
      items: [],
    }
  };

  return NextResponse.json(mockData);
}
