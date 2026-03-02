import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// URLs that should require admin access (since (admin) is not in the URL)
const ADMIN_PATHS = [
  "/dashboard",
  "/products",
  "/inventory",
  "/sales",
  "/refunds",
  "/reports",
  "/shifts",
  "/users",
  "/settings",
];

const LOGIN_PATH = "/login";
const UNAUTHORIZED_PATH = "/unauthorized";

function isAdminPath(pathname: string) {
  return ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ignore next internals + public
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api") // keep /api public unless you specifically want to protect it
  ) {
    return NextResponse.next();
  }

  // Only protect admin panel paths
  if (!isAdminPath(pathname)) return NextResponse.next();

  const token = req.cookies.get("token")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "supersecret",
    );

    // Verify signature (fast)
    await jwtVerify(token, secret);

    // Optional: fetch /auth/me to enforce RBAC (ADMIN role)
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiBase) throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");

    const meRes = await fetch(`${apiBase}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!meRes.ok) {
      const url = req.nextUrl.clone();
      url.pathname = LOGIN_PATH;
      return NextResponse.redirect(url);
    }

    const me = await meRes.json();
    const roles: string[] = me?.roles ?? [];

    if (!roles.includes("ADMIN")) {
      const url = req.nextUrl.clone();
      url.pathname = UNAUTHORIZED_PATH;
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    // run on everything except next static assets
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};