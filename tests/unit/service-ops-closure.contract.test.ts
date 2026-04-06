import { describe, expect, it } from "vitest";

import { readRepoFile, sourceContainsAll } from "../helpers/source-files";

describe("service ops closure migration contracts", () => {
  it("repoints dispatches to service purchase orders and syncs request status from purchase bills", async () => {
    const migrationSource = await readRepoFile(
      "supabase/migrations/20260405000000_service_ops_closure.sql"
    );

    expect(
      sourceContainsAll(migrationSource, [
        "personnel_dispatches_service_po_id_fkey",
        "REFERENCES public.service_purchase_orders(id)",
        "service_request_can_bridge_to_bill_generated",
        "Service deployment must be confirmed before billing can be generated",
        "sync_request_status_from_purchase_bill",
        "tr_purchase_bills_request_status_sync",
        "status = 'bill_generated'",
        "status = 'paid'",
      ])
    ).toBe(true);
  });
});
