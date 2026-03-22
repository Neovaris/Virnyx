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

function isAdminPath(pathname: string) {
  return ADMIN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
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

    // Verify JWT signature
    const decoded = await jwtVerify(token, secret);
    console.log(`[Middleware] Valid JWT for user: ${decoded.payload.sub}`);
    
    // ✅ JWT is valid, allow access
    // The backend will enforce RBAC on actual API calls
    return NextResponse.next();
  } catch (err) {
    console.error(
      "[Middleware] JWT verification failed:",
      err instanceof Error ? err.message : String(err),
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
