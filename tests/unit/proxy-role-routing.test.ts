import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/src/lib/supabase/middleware", () => ({
  updateSession: vi.fn(),
}));

vi.mock("@/src/lib/platform/permissions", () => ({
  canAccessPath: vi.fn(),
}));

vi.mock("@/src/lib/featureFlags", () => ({
  isRouteFrozen: vi.fn().mockReturnValue(false),
}));

import { updateSession } from "@/src/lib/supabase/middleware";
import { canAccessPath } from "@/src/lib/platform/permissions";
import { proxy } from "@/proxy";

const mockUpdateSession = vi.mocked(updateSession);
const mockCanAccessPath = vi.mocked(canAccessPath);

beforeEach(() => {
  vi.clearAllMocks();
  mockCanAccessPath.mockReturnValue(true);
});

describe("proxy role-aware routing", () => {
  it("redirects authenticated buyers away from /login to the buyer portal", async () => {
    mockUpdateSession.mockResolvedValue({
      supabaseResponse: NextResponse.next(),
      user: { id: "buyer-1" },
      role: "buyer",
      permissions: [],
      isActive: true,
      mustChangePassword: false,
    } as any);

    const response = await proxy(new NextRequest("http://localhost/login"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/buyer");
  });

  it("redirects authenticated buyers visiting / to the buyer portal", async () => {
    mockUpdateSession.mockResolvedValue({
      supabaseResponse: NextResponse.next(),
      user: { id: "buyer-2" },
      role: "buyer",
      permissions: [],
      isActive: true,
      mustChangePassword: false,
    } as any);

    const response = await proxy(new NextRequest("http://localhost/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/buyer");
  });

  it("redirects forbidden buyer routes to buyer portal with an error marker", async () => {
    mockCanAccessPath.mockReturnValue(false);
    mockUpdateSession.mockResolvedValue({
      supabaseResponse: NextResponse.next(),
      user: { id: "buyer-3" },
      role: "buyer",
      permissions: [],
      isActive: true,
      mustChangePassword: false,
    } as any);

    const response = await proxy(new NextRequest("http://localhost/supplier"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/buyer?error=forbidden");
  });
});
