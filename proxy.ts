import { NextResponse, type NextRequest } from "next/server";

import { type AppRole } from "@/src/lib/auth/roles";
import { isRouteFrozen } from "@/src/lib/featureFlags";
import { canAccessPath } from "@/src/lib/platform/permissions";
import { updateSession } from "@/src/lib/supabase/middleware";

/**
 * Public paths that don't require authentication.
 * All other paths require a valid session.
 */
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/waitlist"];
const API_PERMISSION_EXEMPTIONS = [
  "/api/society/residents",
  "/api/society/visitors/",
  "/api/users/change-password",
  "/api/residents/unlinked",
];

/**
 * Paths that Next.js / the browser handles internally - skip proxy entirely.
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");

  if (isInternalPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    const { user } = await updateSession(request);
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((publicPath) => pathname.startsWith(publicPath))) {
    if (pathname.startsWith("/login")) {
      const { user } = await updateSession(request);
      if (user) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  const { supabaseResponse, user, role, permissions, isActive, mustChangePassword } = await updateSession(
    request
  );

  if (!user) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Force password change before allowing access to any other route
  if (
    mustChangePassword &&
    pathname !== "/change-password" &&
    !pathname.startsWith("/api/users/change-password")
  ) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Password change required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  if (!role || isActive === false) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: isActive === false ? "Inactive account" : "No role assigned" },
        { status: 403 }
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", isActive === false ? "inactive" : "no_role");
    return NextResponse.redirect(loginUrl);
  }

  if (
    isApiRoute &&
    API_PERMISSION_EXEMPTIONS.some((apiPath) => pathname.startsWith(apiPath))
  ) {
    return supabaseResponse;
  }

  // /change-password is accessible to any authenticated user regardless of role
  if (pathname === "/change-password") {
    return supabaseResponse;
  }

  if (!canAccessPath(role as AppRole, permissions, pathname)) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: "Forbidden - insufficient permissions" },
        { status: 403 }
      );
    }

    const dashboardUrl = new URL("/dashboard", request.url);
    dashboardUrl.searchParams.set("error", "forbidden");
    return NextResponse.redirect(dashboardUrl);
  }

  if (isRouteFrozen(pathname)) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Feature not enabled" }, { status: 403 });
    }

    const dashboardUrl = new URL("/dashboard", request.url);
    dashboardUrl.searchParams.set("error", "feature_disabled");
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
