import { describe, expect, it, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/src/lib/supabase/middleware", () => ({
  updateSession: vi.fn(),
}));

vi.mock("@/src/lib/platform/permissions", () => ({
  canAccessPath: vi.fn().mockReturnValue(true),
}));

vi.mock("@/src/lib/featureFlags", () => ({
  isRouteFrozen: vi.fn().mockReturnValue(false),
}));

import { updateSession } from "@/src/lib/supabase/middleware";
import { proxy } from "@/proxy";

const mockUpdateSession = vi.mocked(updateSession);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("proxy must_change_password enforcement", () => {
  it("redirects authenticated users with must_change_password to /change-password before protected pages", async () => {
    mockUpdateSession.mockResolvedValue({
      supabaseResponse: NextResponse.next(),
      user: { id: "resident-1" },
      role: "resident",
      permissions: [],
      isActive: true,
      mustChangePassword: true,
    } as any);

    const response = await proxy(new NextRequest("http://localhost/resident"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/change-password");
  });

  it("blocks protected API routes until the password has been changed", async () => {
    mockUpdateSession.mockResolvedValue({
      supabaseResponse: NextResponse.next(),
      user: { id: "resident-2" },
      role: "resident",
      permissions: [],
      isActive: true,
      mustChangePassword: true,
    } as any);

    const response = await proxy(new NextRequest("http://localhost/api/residents/unlinked"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Password change required" });
  });
});
