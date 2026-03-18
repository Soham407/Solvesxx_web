import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/src/lib/supabase/middleware";
import { hasAccess, type AppRole } from "@/src/lib/auth/roles";

/**
 * Public paths that don't require authentication.
 * All other paths require a valid session.
 */
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/waitlist"];

/**
 * Paths that Next.js / the browser handles internally — skip middleware entirely.
 */
function isInternalPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/sw.js") ||
    pathname.startsWith("/workbox-") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".webmanifest")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static assets and Next.js internals
  if (isInternalPath(pathname)) {
    return NextResponse.next();
  }

  // Landing page — public, but redirect authenticated users to dashboard
  if (pathname === "/") {
    const { user } = await updateSession(request);
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Allow public paths without authentication
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    // If already authenticated user hits /login, redirect to /dashboard
    if (pathname.startsWith("/login")) {
      const { user } = await updateSession(request);
      if (user) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  // Validate session and fetch role for all protected routes
  const { supabaseResponse, user, role } = await updateSession(request);

  // Not authenticated — redirect to login
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // No role resolved (e.g. user exists in auth but not in users table)
  if (!role) {
    console.error(`[middleware] User ${user.id} has no role — denying access to ${pathname}`);
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "no_role");
    return NextResponse.redirect(loginUrl);
  }

  // RBAC check — block unauthorized routes at the server level
  if (!hasAccess(role as AppRole, pathname)) {
    // Return JSON 403 for API routes
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Forbidden — insufficient permissions" },
        { status: 403 }
      );
    }
    // Redirect UI requests to dashboard with an error flag
    const dashboardUrl = new URL("/dashboard", request.url);
    dashboardUrl.searchParams.set("error", "forbidden");
    return NextResponse.redirect(dashboardUrl);
  }

  // Authenticated and authorized — continue, propagating refreshed cookies
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (browser default)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
