import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Supabase
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/src/lib/supabaseClient", () => ({
  supabase: mockSupabase,
}));

// Mock other hooks
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ role: "admin", user: { id: "user-1" } }),
}));

vi.mock("react", () => ({
  useState: (initialValue: any) => [initialValue, vi.fn()],
  useEffect: vi.fn(),
  useCallback: (fn: any) => fn,
  useMemo: (fn: any) => fn(),
}));

import { useBuyerRequests } from "@/hooks/useBuyerRequests";

function mockFromForSuccessfulLink() {
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === "indents") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: "indent-1", status: "approved" }, error: null }),
          }),
        }),
      };
    }

    if (table === "requests") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { indent_id: null, status: "accepted" }, error: null }),
          }),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockResolvedValue({ data: {}, error: null, count: 1 }),
          }),
        }),
      };
    }

    throw new Error(`Unexpected table mock request: ${table}`);
  });
}

describe("Procurement Rate Verification Gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReset();
    mockSupabase.rpc.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks forwarding when validate_indent_rate returns false", async () => {
    // 1. Mock RPC to return false (no rate contract)
    mockSupabase.rpc.mockResolvedValue({ data: false, error: null } as any);

    const hook = useBuyerRequests();

    const success = await hook.linkRequestToIndent("req-1", {
      indent_id: "indent-1",
      supplier_id: "supp-1",
    });

    expect(success).toBe(false);

    // Verify RPC was called
    expect(mockSupabase.rpc).toHaveBeenCalledWith("validate_indent_rate", {
      p_indent_id: "indent-1",
    });
  });

  it("allows forwarding when validate_indent_rate returns true", async () => {
    // 1. Mock RPC to return true (rate contract found)
    mockSupabase.rpc.mockResolvedValue({ data: true, error: null } as any);

    // 2. Mock other Supabase calls in linkRequestToIndent
    mockFromForSuccessfulLink();

    const hook = useBuyerRequests();

    const success = await hook.linkRequestToIndent("req-1", {
      indent_id: "indent-1",
      supplier_id: "supp-1",
    });

    expect(success).toBe(true);
  });

  it("handles RPC errors by logging and continuing (conservative fallback)", async () => {
    // 1. Mock RPC to return error
    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: "Internal error" } } as any);

    // 2. Mock other Supabase calls (it should continue)
    mockFromForSuccessfulLink();

    const hook = useBuyerRequests();

    const success = await hook.linkRequestToIndent("req-1", {
      indent_id: "indent-1",
      supplier_id: "supp-1",
    });

    // Should succeed because it falls back to the DB trigger (which will still block it if rate is missing)
    expect(success).toBe(true);
  });
});
