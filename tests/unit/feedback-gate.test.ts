import { describe, expect, it, vi, beforeEach } from "vitest";
import { closeServiceRequestAction } from "@/lib/service-request-actions";

// Mock Supabase to prevent environment variable errors
const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();

// The chain object that contains all methods
const mockSupabaseChain: any = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: mockUpdate,
  eq: mockEq,
  maybeSingle: mockMaybeSingle,
};

// Also make it thenable so it can be awaited directly (Supabase behavior)
mockSupabaseChain.then = (resolve: any) => resolve({ data: null, error: null });

vi.mock("@/src/lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseChain),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
  },
}));

describe("Feedback Gate Behavioral Logic (Real Implementation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default: eq returns the chain so further methods can be called
    mockEq.mockReturnValue(mockSupabaseChain);
    mockUpdate.mockReturnValue(mockSupabaseChain);
    
    // Default: mockSupabaseChain.then resolves to a generic success
    mockSupabaseChain.then = (resolve: any) => resolve({ data: null, error: null });
  });

  it("blocks closing a request when no feedback exists", async () => {
    const { supabase } = await import("@/src/lib/supabaseClient");
    
    // Setup mock: no feedback found
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await closeServiceRequestAction("req-123", supabase);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Buyer feedback is required");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("allows closing a request when feedback exists", async () => {
    const { supabase } = await import("@/src/lib/supabaseClient");
    
    // Setup mock: feedback found
    mockMaybeSingle.mockResolvedValue({ data: { id: "fb-1" }, error: null });
    
    // Setup mock: update succeeds
    // In this case, we await the result of .eq("id", id)
    // So the thenable should resolve to { error: null }
    mockSupabaseChain.then = (resolve: any) => resolve({ error: null });

    const result = await closeServiceRequestAction("req-123", supabase);

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({ status: "closed" });
    expect(mockEq).toHaveBeenCalledWith("id", "req-123");
  });

  it("handles database errors gracefully during feedback check", async () => {
    const { supabase } = await import("@/src/lib/supabaseClient");
    
    // Setup mock: DB error
    mockMaybeSingle.mockResolvedValue({ data: null, error: new Error("DB Error") });

    const result = await closeServiceRequestAction("req-123", supabase);

    expect(result.success).toBe(false);
    expect(result.error).toBe("DB Error");
  });
});
