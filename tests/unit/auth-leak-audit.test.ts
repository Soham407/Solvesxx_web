import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Tests for authorization on /api/residents/unlinked.
 * The route must validate role via DB lookup (not user_metadata which is user-writable).
 */

vi.mock("@/src/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/src/lib/platform/server", () => ({
  createServiceRoleClient: vi.fn(),
}));

import { createClient } from "@/src/lib/supabase/server";
import { createServiceRoleClient } from "@/src/lib/platform/server";
import { GET, POST } from "@/app/api/residents/unlinked/route";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockReset();
  mockFrom.mockReset();
  (createServiceRoleClient as any).mockReset();

  (createClient as any).mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  });
});

function buildProvisionRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/residents/unlinked", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockResidentsQuery() {
  const order = vi.fn().mockResolvedValue({ data: [], error: null });
  const eq = vi.fn().mockReturnValue({ order });
  const is = vi.fn().mockReturnValue({ eq });
  const select = vi.fn().mockReturnValue({ is });
  mockFrom.mockReturnValue({ select });
}

function mockAdminClient({
  roleName,
  rolesAsArray = false,
  isActive = true,
  mustChangePassword = false,
}: {
  roleName: string | null;
  rolesAsArray?: boolean;
  isActive?: boolean;
  mustChangePassword?: boolean;
}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: roleName
      ? {
          is_active: isActive,
          must_change_password: mustChangePassword,
          roles: rolesAsArray ? [{ role_name: roleName }] : { role_name: roleName },
        }
      : null,
    error: null,
  });
  const select = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) });
  (createServiceRoleClient as any).mockReturnValue({
    from: vi.fn().mockReturnValue({ select }),
    auth: {
      admin: {
        createUser: vi.fn(),
        deleteUser: vi.fn(),
      },
    },
  });
}

describe("GET /api/residents/unlinked", () => {
  it("returns 401 when no user session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("No session") });

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns 403 for delivery_boy role", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockAdminClient({ roleName: "delivery_boy" });

    const response = await GET();
    expect(response.status).toBe(403);
  });

  it("returns 403 for resident role", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u2" } }, error: null });
    mockAdminClient({ roleName: "resident" });

    const response = await GET();
    expect(response.status).toBe(403);
  });

  it("returns 200 for admin role", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u3" } }, error: null });
    mockAdminClient({ roleName: "admin" });
    mockResidentsQuery();

    const response = await GET();
    expect(response.status).toBe(200);
  });

  it("returns 200 for society_manager role", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u4" } }, error: null });
    mockAdminClient({ roleName: "society_manager" });
    mockResidentsQuery();

    const response = await GET();
    expect(response.status).toBe(200);
  });

  it("returns 200 for super_admin role", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u5" } }, error: null });
    mockAdminClient({ roleName: "super_admin" });
    mockResidentsQuery();

    const response = await GET();
    expect(response.status).toBe(200);
  });

  it("accepts array-shaped roles responses for authorized users", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u6" } }, error: null });
    mockAdminClient({ roleName: "admin", rolesAsArray: true });
    mockResidentsQuery();

    const response = await GET();
    expect(response.status).toBe(200);
  });

  it("returns 403 for inactive accounts even when the role is authorized", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u7" } }, error: null });
    mockAdminClient({ roleName: "admin", isActive: false });

    const response = await GET();
    expect(response.status).toBe(403);
  });

  it("returns 403 when password change is still required", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u8" } }, error: null });
    mockAdminClient({ roleName: "admin", mustChangePassword: true });

    const response = await GET();
    expect(response.status).toBe(403);
  });
});

describe("POST /api/residents/unlinked", () => {
  it("returns 401 when no user session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("No session") });

    const response = await POST(buildProvisionRequest({}));
    expect(response.status).toBe(401);
  });

  it("returns 403 for unauthorized roles", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u9" } }, error: null });
    mockAdminClient({ roleName: "resident" });

    const response = await POST(
      buildProvisionRequest({
        resident_id: "11111111-1111-1111-1111-111111111111",
        email: "resident@example.com",
        temp_password: "TempPass123",
      })
    );

    expect(response.status).toBe(403);
  });

  it("returns 403 when password change is still required", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u10" } }, error: null });
    mockAdminClient({ roleName: "admin", mustChangePassword: true });

    const response = await POST(
      buildProvisionRequest({
        resident_id: "11111111-1111-1111-1111-111111111111",
        email: "resident@example.com",
        temp_password: "TempPass123",
      })
    );

    expect(response.status).toBe(403);
  });

  it("returns 400 for invalid provisioning payloads", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u11" } }, error: null });
    mockAdminClient({ roleName: "admin" });

    const response = await POST(
      buildProvisionRequest({
        resident_id: "not-a-uuid",
        email: "invalid",
        temp_password: "short",
      })
    );

    expect(response.status).toBe(400);
  });
});
