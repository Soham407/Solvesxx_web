import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware for FacilityPro
 *
 * Provides:
 * 1. Security headers on all responses
 * 2. Auth gate on protected routes (dashboard/*)
 * 3. API route protection basics
 *
 * NOTE: This uses a lightweight auth-indicator cookie set by useAuth.tsx.
 * For full JWT validation at the edge, migrate to @supabase/ssr which
 * stores auth tokens in cookies instead of localStorage.
 */

// Routes that require authentication
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/company",
  "/hrms",
  "/services",
  "/society",
  "/assets",
  "/inventory",
  "/finance",
  "/service-requests",
  "/reports",
  "/tickets",
  "/service-boy",
  "/test-guard",
  "/test-resident",
];

// Routes that should NOT be accessible when authenticated
const AUTH_ROUTES = ["/login"];

// Auth indicator cookie name (set by useAuth.tsx)
const AUTH_COOKIE = "fp-auth-status";

function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Content-Security-Policy", "frame-ancestors 'none'");

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Enable XSS protection (legacy, but still useful)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Control referrer information
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Prevent browsers from caching sensitive pages
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=(self)"
  );

  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check auth indicator cookie
  const isAuthenticated = request.cookies.has(AUTH_COOKIE);

  // Protected routes: redirect to login if not authenticated
  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname.startsWith(prefix)
  );

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);
    return addSecurityHeaders(response);
  }

  // Auth routes: redirect to dashboard if already authenticated
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isAuthRoute && isAuthenticated) {
    const dashboardUrl = new URL("/dashboard", request.url);
    const response = NextResponse.redirect(dashboardUrl);
    return addSecurityHeaders(response);
  }

  // API routes: ensure they return proper CORS for same-origin only
  if (pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    // Only allow same-origin requests to API routes
    if (origin && host && !origin.includes(host)) {
      return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Default: add security headers and continue
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public files (images, sw, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
