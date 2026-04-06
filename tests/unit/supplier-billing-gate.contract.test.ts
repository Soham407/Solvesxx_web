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
        "Only deployment-confirmed service orders can be billed.",
        "['deployment_confirmed', 'completed'].includes(s.status)",
      ])
    ).toBe(true);
  });

  it("keeps the admin deployment confirmation aligned with the acknowledged billing gate", async () => {
    const source = await readRepoFile("components/dialogs/ServiceAcknowledgmentDialog.tsx");

    expect(
      sourceContainsAll(source, [
        'from("service_acknowledgments")',
        "status: 'acknowledged'",
        'update({ status: "deployment_confirmed"',
      ])
    ).toBe(true);
  });

  it("includes the database-level trigger in the migration file", async () => {
    const migrationSource = await readRepoFile("supabase/migrations/20260405000000_service_ops_closure.sql");
    
    expect(
      sourceContainsAll(migrationSource, [
        "check_service_acknowledgment_gate",
        "Service deployment must be confirmed before billing for SPO-linked work",
        "Service delivery note required before billing for SPO-linked work",
        "RAISE EXCEPTION 'Service acknowledgment required before billing for SPO-linked work'",
      ])
    ).toBe(true);
  });
});
