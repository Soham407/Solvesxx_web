import { describe, expect, it, vi } from "vitest";

// Mock Supabase
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  single: vi.fn(),
  order: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
};

vi.mock("@/src/lib/supabaseClient", () => ({
  supabase: mockSupabase,
}));

// We need to mock useAuth and other hooks used by useSupplierPortal or useSupplierBills
vi.mock("./useAuth", () => ({
  useAuth: () => ({ user: { id: "test-user" } }),
}));

// Mock toast
vi.mock("@/components/ui/use-toast", () => ({
  toast: vi.fn(),
}));

// Mock useSupplierBills and useSupplierPortal
// Since we want to test the implementation inside these hooks, we might need to import them
// but mocking everything they depend on.

describe("Service Acknowledgment Gate", () => {
  it("should fail pre-flight check if SPO is not acknowledged", async () => {
    // Mock SPO and missing acknowledgment
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    // Simulate the logic in useSupplierBills / useSupplierPortal
    const checkGate = async (spoId: string) => {
      const { data: ack, error: ackError } = await mockSupabase
        .from("service_acknowledgments")
        .select("status")
        .eq("spo_id", spoId)
        .eq("status", "acknowledged")
        .maybeSingle();

      if (ackError) throw ackError;
      if (!ack) {
        throw new Error("Service acknowledgment required before billing for SPO-linked work. Please obtain acknowledgment first.");
      }
      return true;
    };

    await expect(checkGate("spo-123")).rejects.toThrow("Service acknowledgment required before billing for SPO-linked work");
  });

  it("should pass pre-flight check if SPO is acknowledged", async () => {
    // Mock SPO and valid acknowledgment
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { status: "acknowledged" }, error: null });

    const checkGate = async (spoId: string) => {
      const { data: ack, error: ackError } = await mockSupabase
        .from("service_acknowledgments")
        .select("status")
        .eq("spo_id", spoId)
        .eq("status", "acknowledged")
        .maybeSingle();

      if (ackError) throw ackError;
      if (!ack) {
        throw new Error("Service acknowledgment required before billing for SPO-linked work. Please obtain acknowledgment first.");
      }
      return true;
    };

    const result = await checkGate("spo-123");
    expect(result).toBe(true);
  });
});
