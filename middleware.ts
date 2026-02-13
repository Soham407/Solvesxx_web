import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/src/lib/supabase/middleware";

/**
 * Next.js Middleware for FacilityPro
 *
 * Provides:
 * 1. Security headers on all responses
 * 2. Real Supabase session validation via @supabase/ssr (NOT a spoofable cookie)
 * 3. Auth gate on protected routes (dashboard/*)
 * 4. API route protection basics
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

  // Restrict browser features
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=(self)"
  );

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Refresh the Supabase auth session and validate the user's token server-side.
  // This calls supabase.auth.getUser() which validates the JWT against Supabase Auth,
  // NOT just reading a local cookie value.
  const { supabaseResponse, user } = await updateSession(request);

  const isAuthenticated = !!user;

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
    
    // Strict production allow-list
    const ALLOWED_ORIGINS = [
      "https://facilitypro.vercel.app",
      "https://facility-pro-enterprise.com",
      "http://localhost:3000"
    ];

    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      console.warn(`Blocked request from disallowed origin: ${origin}`);
      return new NextResponse(JSON.stringify({ error: "Forbidden: Disallowed origin" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Add security headers to the supabase response (which carries refreshed cookies)
  return addSecurityHeaders(supabaseResponse);
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
