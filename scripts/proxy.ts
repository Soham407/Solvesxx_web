import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/src/lib/supabase/middleware";
import { ROLE_ACCESS, type AppRole } from "@/src/lib/auth/roles";

/**
 * Next.js Middleware for FacilityPro
 */

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Content-Security-Policy", "frame-ancestors 'none'");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=(self)",
  );
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Refresh the Supabase auth session and validate the user's token server-side.
  const { supabaseResponse, user, role } = await updateSession(request);
  const isAuthenticated = !!user;

  // Protected prefixes for session validation
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
    "/buyer",
    "/guard",
    "/resident",
    "/delivery",
    "/settings",
    "/test-guard",
    "/test-resident",
    "/supplier",
  ];

  // Protected routes: redirect to login if not authenticated
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);
    return addSecurityHeaders(response);
  }

  // Role-based authorization check
  if (isProtectedRoute && isAuthenticated && role) {
    const isAllowed =
      role === "admin" ||
      (ROLE_ACCESS[role as AppRole] &&
        ROLE_ACCESS[role as AppRole].some((prefix) =>
          pathname.startsWith(prefix),
        ));

    if (!isAllowed) {
      console.warn(
        `User ${user.id} with role ${role} attempted to access unauthorized path: ${pathname}`,
      );

      // Resident is a special case (limited external actor)
      if (role === "resident") {
        const residentUrl = new URL("/society/my-flat", request.url);
        const response = NextResponse.redirect(residentUrl);
        return addSecurityHeaders(response);
      }

      // Default redirect to dashboard
      if (pathname !== "/dashboard") {
        const dashboardUrl = new URL("/dashboard", request.url);
        const response = NextResponse.redirect(dashboardUrl);
        return addSecurityHeaders(response);
      }
    }
  }

  // Auth routes: redirect to dashboard if already authenticated
  const AUTH_ROUTES = ["/login"];
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isAuthRoute && isAuthenticated) {
    const dashboardUrl = new URL("/dashboard", request.url);
    const response = NextResponse.redirect(dashboardUrl);
    return addSecurityHeaders(response);
  }

  // API routes: ensure they return proper CORS for same-origin only
  if (pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    const ALLOWED_ORIGINS = [
      "https://facilitypro.vercel.app",
      "https://facility-pro-enterprise.com",
      "http://localhost:3000",
    ];

    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return new NextResponse(
        JSON.stringify({ error: "Forbidden: Disallowed origin" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  return addSecurityHeaders(supabaseResponse);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
