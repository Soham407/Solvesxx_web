import { describe, expect, it } from "vitest";

import {
  readRepoFile,
  sourceContainsAll,
} from "../helpers/source-files";

describe("Supplier Billing Gate Contract", () => {
  it("enforces service acknowledgment in hooks/useSupplierBills.ts", async () => {
    const source = await readRepoFile("hooks/useSupplierBills.ts");
    
    expect(
      sourceContainsAll(source, [
        "service_purchase_order_id",
        'from("service_acknowledgments")',
        'eq("status", "acknowledged")',
        "Service acknowledgment required before billing",
      ])
    ).toBe(true);
  });

  it("enforces service acknowledgment pre-flight check in hooks/useSupplierPortal.ts", async () => {
    const source = await readRepoFile("hooks/useSupplierPortal.ts");
    
    expect(
      sourceContainsAll(source, [
        "billPayload.service_purchase_order_id",
        'from("service_acknowledgments")',
        'eq("status", "acknowledged")',
        "Please obtain acknowledgment first.",
      ])
    ).toBe(true);
  });

  it("shows the acknowledgment warning banner in app/(dashboard)/supplier/bills/new/page.tsx", async () => {
    const source = await readRepoFile("app/(dashboard)/supplier/bills/new/page.tsx");
    
    expect(
      sourceContainsAll(source, [
        "isAckMissing",
        "Acknowledgment Required",
        "This job requires a signed acknowledgment before billing",
        "/supplier/service-orders",
        "eligibleSPOs",
      ])
    ).toBe(true);
  });

  it("includes the database-level trigger in the migration file", async () => {
    const migrationSource = await readRepoFile("supabase/migrations/20260401010708_svc_ack_gate_supplier_bills.sql");
    
    expect(
      sourceContainsAll(migrationSource, [
        "check_service_acknowledgment_gate",
        "tr_purchase_bills_service_ack_gate",
        "BEFORE INSERT ON public.purchase_bills",
        "RAISE EXCEPTION 'Service acknowledgment required before billing for SPO-linked work'",
      ])
    ).toBe(true);
  });
});
