import { NextRequest, NextResponse } from "next/server";

/**
 * Returns the caller's IP address from server-side request headers.
 * Used by the login page for brute-force protection instead of calling
 * an external service (api.ipify.org), which adds latency, an external
 * dependency, and falls back to 0.0.0.0 on failure — breaking IP-based lockout.
 *
 * In production behind a reverse proxy / Vercel, X-Forwarded-For is set
 * by the infrastructure and can be trusted. The first entry is the client IP.
 */
export async function GET(request: NextRequest) {
  const xff = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  // X-Forwarded-For can be a comma-separated list: client, proxy1, proxy2
  // Always take the first (leftmost) value — that's the originating client.
  const ip =
    (xff ? xff.split(",")[0].trim() : null) ??
    realIp ??
    "127.0.0.1";

  return NextResponse.json({ ip });
}
