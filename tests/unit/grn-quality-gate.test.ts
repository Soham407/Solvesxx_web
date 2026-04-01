import { describe, expect, it, vi } from "vitest";

// Mock Supabase to prevent environment variable errors
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
    rpc: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
  },
}));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({})),
}));

import { 
  validateGRNItemForStock, 
  calculateGRNItemUpdates,
  GRNItem,
  QualityStatus
} from "@/hooks/useGRN";

describe("GRN Quality Gate Behavioral Logic", () => {
  describe("validateGRNItemForStock", () => {
    const baseItem: GRNItem = {
      id: "item-1",
      material_receipt_id: "grn-1",
      po_item_id: "po-item-1",
      product_id: "prod-1",
      item_description: "Test Product",
      ordered_quantity: 10,
      received_quantity: 10,
      accepted_quantity: 10,
      rejected_quantity: 0,
      quality_status: "accepted",
      rejection_reason: null,
      unit_price: 100,
      line_total: 1000,
      unmatched_qty: 0,
      unmatched_amount: 0,
      batch_number: null,
      expiry_date: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it("allows adding fully accepted items to stock", () => {
      expect(() => validateGRNItemForStock(baseItem)).not.toThrow();
    });

    it("blocks rejected items from being added to stock", () => {
      const rejectedItem = { ...baseItem, quality_status: "rejected" as QualityStatus, accepted_quantity: 0, rejected_quantity: 10 };
      expect(() => validateGRNItemForStock(rejectedItem)).toThrow("Cannot add rejected material to stock");
    });

    it("blocks partial items with zero accepted quantity", () => {
      const partialItem = { ...baseItem, quality_status: "partial" as QualityStatus, accepted_quantity: 0, rejected_quantity: 10 };
      expect(() => validateGRNItemForStock(partialItem)).toThrow("No accepted quantity to add to stock");
    });

    it("allows partial items with positive accepted quantity", () => {
      const partialItem = { ...baseItem, quality_status: "partial" as QualityStatus, accepted_quantity: 5, rejected_quantity: 5 };
      expect(() => validateGRNItemForStock(partialItem)).not.toThrow();
    });

    it("blocks items with null accepted quantity", () => {
      const nullItem = { ...baseItem, accepted_quantity: null };
      expect(() => validateGRNItemForStock(nullItem as any)).toThrow("No accepted quantity to add to stock");
    });
  });

  describe("calculateGRNItemUpdates", () => {
    const item = {
      received_quantity: 100,
      unit_price: 50,
      accepted_quantity: 0,
      rejected_quantity: 0
    };

    it("calculates correct updates for 'accepted' status", () => {
      const updates = calculateGRNItemUpdates(item, "accepted");
      expect(updates).toEqual({
        quality_status: "accepted",
        accepted_quantity: 100,
        rejected_quantity: 0,
        line_total: 5000
      });
    });

    it("calculates correct updates for 'rejected' status", () => {
      const updates = calculateGRNItemUpdates(item, "rejected");
      expect(updates).toEqual({
        quality_status: "rejected",
        accepted_quantity: 0,
        rejected_quantity: 100,
        line_total: 0
      });
    });

    it("calculates correct updates for 'partial' status with provided quantities", () => {
      const updates = calculateGRNItemUpdates(item, "partial", 70, 30);
      expect(updates).toEqual({
        quality_status: "partial",
        accepted_quantity: 70,
        rejected_quantity: 30,
        line_total: 3500
      });
    });

    it("throws error if partial quantities exceed received quantity", () => {
      expect(() => calculateGRNItemUpdates(item, "partial", 80, 30)).toThrow("Total quantity (110) exceeds received quantity (100)");
    });
  });
});
