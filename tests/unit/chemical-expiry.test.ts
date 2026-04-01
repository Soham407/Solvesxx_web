import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock Supabase
vi.mock("@/src/lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

import { validateChemicalExpiry } from "@/hooks/useChemicals";

describe("Chemical Expiry Logic", () => {
  describe("validateChemicalExpiry", () => {
    it("returns valid for chemicals without expiry date", () => {
      const chem = { product_name: "Test Chem", expiry_date: null };
      expect(validateChemicalExpiry(chem).isValid).toBe(true);
    });

    it("returns valid for chemicals with future expiry date", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const chem = { product_name: "Test Chem", expiry_date: futureDate.toISOString() };
      expect(validateChemicalExpiry(chem).isValid).toBe(true);
    });

    it("returns invalid for chemicals with past expiry date", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const chem = { product_name: "Test Chem", expiry_date: pastDate.toISOString() };
      const result = validateChemicalExpiry(chem);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Cannot issue expired chemical");
    });
  });
});
