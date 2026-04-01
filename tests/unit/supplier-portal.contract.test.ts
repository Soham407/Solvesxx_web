import { describe, expect, it } from "vitest";

import {
  readRepoFile,
  sourceContainsAll,
  sourceContainsNone,
} from "../helpers/source-files";

describe("supplier portal contracts", () => {
  it("keeps the supplier portal hook wired to supplier-scoped goods and service flows", async () => {
    const supplierPortalSource = await readRepoFile("hooks/useSupplierPortal.ts");

    expect(
      sourceContainsAll(supplierPortalSource, [
        "supplierProfile",
        "serviceOrders",
        "serviceAcknowledgments",
        'rpc("create_po_from_supplier_request"',
        'rpc("supplier_transition_service_po_status"',
        "updateSupplierProfile",
        '"po_issued"',
      ])
    ).toBe(true);
  });

  it("keeps the supplier service-orders page in recipient mode instead of admin creation mode", async () => {
    const supplierServiceOrdersPageSource = await readRepoFile(
      "app/(dashboard)/supplier/service-orders/page.tsx"
    );

    expect(
      sourceContainsAll(supplierServiceOrdersPageSource, [
        "useSupplierPortal",
        "acknowledgeServiceOrder",
        "ServiceDeliveryNoteDialog",
        "Only service purchase orders assigned to your supplier account are shown here.",
        "Delivery Note",
      ])
    ).toBe(true);

    expect(
      sourceContainsNone(supplierServiceOrdersPageSource, [
        "New Service Order",
        "createOrder({",
        "useSuppliers()",
      ])
    ).toBe(true);
  });

  it("keeps the supplier hardening migration, delivery note transition, and profile UI in place", async () => {
    const migrationSource = await readRepoFile(
      "supabase/migrations/20260330000008_supplier_portal_hardening.sql"
    );
    const deliveryNotesSource = await readRepoFile("hooks/useServiceDeliveryNotes.ts");
    const supplierProfilePageSource = await readRepoFile(
      "app/(dashboard)/supplier/profile/page.tsx"
    );
    const appSidebarSource = await readRepoFile("components/layout/AppSidebar.tsx");

    expect(
      sourceContainsAll(migrationSource, [
        "suppliers_self_update",
        "generate_service_purchase_order_number",
        "supplier_transition_service_po_status",
        "create_po_from_supplier_request",
        "service_delivery_notes_po_id_fkey",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(deliveryNotesSource, [
        "service_purchase_orders!service_delivery_notes_po_id_fkey",
        'p_new_status: "delivery_note_uploaded"',
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(supplierProfilePageSource, [
        "updateSupplierProfile",
        "rates",
        "availability",
        "Save Changes",
      ])
    ).toBe(true);

    expect(appSidebarSource.includes('/supplier/profile')).toBe(true);
  });

  it("routes service requests via is_service_request flag, not field presence", async () => {
    const source = await readRepoFile("hooks/useSupplierPortal.ts");

    // Discriminator must use the explicit flag
    expect(source.includes("is_service_request === true")).toBe(true);

    // Field-presence heuristic must be gone
    expect(
      sourceContainsNone(source, [
        "targetIndent?.service_type ||",
        "targetIndent?.service_grade ||",
        "targetIndent?.headcount ||",
        "targetIndent?.start_date ||",
      ])
    ).toBe(true);
  });

  it("inserts SPO as sent_to_vendor, not pre-acknowledged", async () => {
    const source = await readRepoFile("hooks/useSupplierPortal.ts");

    // SPO must not be auto-acknowledged on creation
    expect(source.includes('status: "sent_to_vendor"')).toBe(true);

    // The dead comment referencing indent_accepted for test-compat must be gone
    expect(source.includes("contract test compat")).toBe(false);
  });

  it("createRequest passes is_service_request flag to the DB insert", async () => {
    const source = await readRepoFile("hooks/useBuyerRequests.ts");
    expect(source.includes("is_service_request: input.is_service_request === true")).toBe(true);
  });

  it("new request page passes is_service_request to createRequest", async () => {
    const source = await readRepoFile(
      "app/(dashboard)/buyer/requests/new/page.tsx"
    );
    expect(source.includes("is_service_request: isServiceRequest")).toBe(true);
  });
});
