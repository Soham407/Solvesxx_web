import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Supabase - must define inside vi.mock factory if it's hoisted
vi.mock("@/src/lib/supabaseClient", () => {
  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "indent-1", status: "approved" }, error: null }),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
      })),
      rpc: vi.fn(),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
    },
  };
});

// Mock other hooks
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ role: "admin", user: { id: "user-1" } }),
}));

// Mock React
vi.mock("react", () => ({
  useState: (initialValue: any) => [initialValue, vi.fn()],
  useEffect: vi.fn(),
  useCallback: (fn: any) => fn,
  useMemo: (fn: any) => fn(),
}));

import { useBuyerRequests } from "@/hooks/useBuyerRequests";
import { supabase } from "@/src/lib/supabaseClient";

describe("Procurement Rate Verification Gate Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls validate_indent_rate RPC during linkRequestToIndent", async () => {
    // Mock RPC
    const rpcSpy = vi.spyOn(supabase, "rpc").mockResolvedValue({ data: false, error: null } as any);

    const hook = useBuyerRequests();

    await hook.linkRequestToIndent("req-1", {
      indent_id: "indent-1",
      supplier_id: "supp-1",
    });

    // Verify RPC was called
    expect(rpcSpy).toHaveBeenCalledWith("validate_indent_rate", {
      p_indent_id: "indent-1",
    });
  });

  it("returns false when rate contract is missing", async () => {
    // Mock RPC to return false (no rate contract)
    vi.spyOn(supabase, "rpc").mockResolvedValue({ data: false, error: null } as any);

    const hook = useBuyerRequests();

    const result = await hook.linkRequestToIndent("req-1", {
      indent_id: "indent-1",
      supplier_id: "supp-1",
    });

    expect(result).toBe(false);
  });
});
