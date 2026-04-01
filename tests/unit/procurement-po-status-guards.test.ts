import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/supabaseClient", () => ({
  supabase: {},
}));

import {
  PO_RECEIPT_READY_STATUSES,
  PO_STATUS_CONFIG,
} from "@/hooks/usePurchaseOrders";
import {
  GRN_STATUSES_WITH_RECEIVED_MATERIAL,
  REQUEST_STATUSES_READY_FOR_MATERIAL_RECEIVED,
} from "@/hooks/useGRN";

describe("procurement status guards", () => {
  it("keeps dispatched PO status available across the admin receipt flow", () => {
    expect(PO_STATUS_CONFIG.dispatched.label).toBe("Dispatched");
    expect(PO_RECEIPT_READY_STATUSES).toEqual([
      "acknowledged",
      "dispatched",
      "partial_received",
    ]);
  });

  it("only advances buyer requests from delivery-related GRN and request states", () => {
    expect(GRN_STATUSES_WITH_RECEIVED_MATERIAL).toEqual([
      "accepted",
      "partial_accepted",
    ]);
    expect(REQUEST_STATUSES_READY_FOR_MATERIAL_RECEIVED).toEqual([
      "po_received",
      "po_dispatched",
    ]);
  });
});
