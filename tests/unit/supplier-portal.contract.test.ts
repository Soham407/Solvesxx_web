import { describe, expect, it } from "vitest";

import {
  readRepoFile,
  sourceContainsAll,
  sourceContainsNone,
} from "../helpers/source-files";

describe("supplier portal contracts", () => {
  it("keeps the supplier portal hook wired to supplier-scoped goods and service flows", async () => {
    const supplierPortalSource = await readRepoFile("hooks/useSupplierPortal.ts");
    const serviceIndentRouteSource = await readRepoFile("app/api/supplier/service-indent-response/route.ts");

    expect(
      sourceContainsAll(supplierPortalSource, [
        "supplierProfile",
        "serviceOrders",
        "serviceAcknowledgments",
        'rpc("create_po_from_supplier_request"',
        'rpc("supplier_transition_service_po_status"',
        "updateSupplierProfile",
        '"po_issued"',
        "products (product_name, unit_of_measurement)",
        'fetch("/api/supplier/service-indent-response"',
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(serviceIndentRouteSource, [
        "createServiceRoleClient",
        "createClient as createServerClient",
        "Only service deployment requests can use this flow.",
        "No active service rate contract found for this supplier and service type.",
        '"indent_accepted"',
        'from("service_purchase_orders")',
        'from("service_purchase_order_items")',
        'status: "po_issued"',
      ])
    ).toBe(true);
  });

  it("keeps supplier service-indent acceptance exempted in proxy and role-checked in the route", async () => {
    const proxySource = await readRepoFile("proxy.ts");
    const serviceIndentRouteSource = await readRepoFile("app/api/supplier/service-indent-response/route.ts");

    expect(proxySource.includes('/api/supplier/service-indent-response')).toBe(true);

    expect(
      sourceContainsAll(serviceIndentRouteSource, [
        'supabase.auth.getUser()',
        'select("supplier_id, roles(role_name)")',
        '!["supplier", "vendor"].includes(roleName)',
        'targetRequest.supplier_id !== supplierId',
      ])
    ).toBe(true);
  });

  it("keeps the supplier service-orders page in recipient mode instead of admin creation mode", async () => {
    const supplierServiceOrdersPageSource = await readRepoFile(
      "app/(dashboard)/supplier/service-orders/page.tsx"
    );
    const supplierPortalSource = await readRepoFile("hooks/useSupplierPortal.ts");

    expect(
      sourceContainsAll(supplierServiceOrdersPageSource, [
        "useSupplierPortal",
        "acknowledgeServiceOrder",
        "ServiceDeliveryNoteDialog",
        "Only service purchase orders assigned to your supplier account are shown here.",
        "Delivery Note",
        "supplierId={deliveryNoteOrder.vendor_id}",
        "deploymentSiteId={deliveryNoteOrder.site_location_id ?? null}",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(supplierPortalSource, [
        "request:requests!request_id",
        "site_location_id",
        "site_location_name: serviceOrder.request?.site_location?.location_name ?? null",
        "Request-state propagation is server-authoritative from purchase_bills",
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
    const source = await readRepoFile("app/api/supplier/service-indent-response/route.ts");

    // SPO must not be auto-acknowledged on creation
    expect(source.includes('status: "sent_to_vendor"')).toBe(true);

    // The dead comment referencing indent_accepted for test-compat must be gone
    expect(source.includes("contract test compat")).toBe(false);
  });

  it("createRequest passes is_service_request flag to the DB insert", async () => {
    const source = await readRepoFile("hooks/useBuyerRequests.ts");
    expect(source.includes("is_service_request: input.is_service_request === true")).toBe(true);
  });

  it("keeps service deployment fixtures seeded with mappings, rates, and an accepted request", async () => {
    const source = await readRepoFile("scripts/provision-feature-fixtures.cjs");

    expect(
      sourceContainsAll(source, [
        "ensureVendorWiseService",
        "ensureServiceRate",
        "ensureServiceDeploymentRequest",
        '"REQ-E2E-SVC-001"',
        '"service fixtures ensure vendor-wise service mappings, active service rates, and one accepted deployment request."',
      ])
    ).toBe(true);
  });

  it("new request page passes is_service_request to createRequest", async () => {
    const source = await readRepoFile(
      "app/(dashboard)/buyer/requests/new/page.tsx"
    );
    expect(source.includes("is_service_request: isServiceRequest")).toBe(true);
  });
});
