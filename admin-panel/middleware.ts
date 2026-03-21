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
    console.warn(`[Middleware] No token cookie found for path: ${pathname}`);
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
    const decoded = await jwtVerify(token, secret);
    console.log(`[Middleware] JWT verified for user: ${decoded.payload.sub}`);

    // Optional: fetch /auth/me to enforce RBAC (ADMIN role)
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiBase) {
      console.error("[Middleware] Missing NEXT_PUBLIC_API_BASE_URL");
      throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");
    }

    try {
      const meRes = await fetch(`${apiBase}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!meRes.ok) {
        console.error(
          `[Middleware] Backend /auth/me returned ${meRes.status}: ${await meRes.text()}`
        );
        const url = req.nextUrl.clone();
        url.pathname = LOGIN_PATH;
        return NextResponse.redirect(url);
      }

      const me = await meRes.json();
      const roles: string[] = me?.roles ?? [];

      console.log(
        `[Middleware] User roles from backend: ${roles.join(", ")}`
      );

      if (!roles.includes("ADMIN")) {
        console.warn(
          `[Middleware] User lacks ADMIN role. Has: ${roles.join(", ")}`
        );
        const url = req.nextUrl.clone();
        url.pathname = UNAUTHORIZED_PATH;
        return NextResponse.redirect(url);
      }

      return NextResponse.next();
    } catch (fetchErr) {
      console.error("[Middleware] Backend call failed:", fetchErr);
      // If backend is down but token is valid, allow passage
      // User will see error on page load but won't be locked out
      console.warn(
        "[Middleware] Backend unreachable, allowing passage with valid JWT"
      );
      return NextResponse.next();
    }
  } catch (err) {
    console.error(
      "[Middleware] JWT verification failed:",
      err instanceof Error ? err.message : String(err)
    );
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