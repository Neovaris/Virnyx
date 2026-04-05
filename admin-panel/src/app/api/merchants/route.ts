import { NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth.server";

export async function GET(req: Request) {
  await getTokenFromCookie();

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
