import { describe, expect, it } from "vitest";

import { readRepoFile, sourceContainsAll } from "../helpers/source-files";

describe("service deployment contracts", () => {
  it("keeps buyer request creation wired to service deployment metadata", async () => {
    const requestHookSource = await readRepoFile("hooks/useBuyerRequests.ts");
    const buyerRequestPageSource = await readRepoFile("app/(dashboard)/buyer/requests/new/page.tsx");

    expect(
      sourceContainsAll(requestHookSource, [
        "service_type?: string",
        "service_grade?: string",
        "start_date?: string",
        "site_location_id?: string",
        "site_location:company_locations!site_location_id",
        "linkRequestToIndent",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(buyerRequestPageSource, [
        "Service Deployment",
        "Continue to Deployment Details",
        "service_grade",
        "duration_months",
        "site_location_id",
        "useServiceDeploymentMasters",
      ])
    ).toBe(true);
  });

  it("keeps the admin handoff and indent link flow wired end-to-end", async () => {
    const adminPageSource = await readRepoFile("app/(dashboard)/admin/service-indents/page.tsx");
    const materialAdminPageSource = await readRepoFile("app/(dashboard)/admin/material-indents/page.tsx");
    const indentsHookSource = await readRepoFile("hooks/useIndents.ts");
    const buyerRequestsHookSource = await readRepoFile("hooks/useBuyerRequests.ts");
    const sidebarSource = await readRepoFile("components/layout/AppSidebar.tsx");

    expect(
      sourceContainsAll(adminPageSource, [
        "Generate Service Indent",
        "approveIndent",
        "linkRequestToIndent",
        "getCurrentEmployeeId",
        "getSuppliersByServiceType",
        'status: "indent_forwarded"',
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(indentsHookSource, [
        "service_request_id?: string",
        "supplier_id?: string",
        "service_request_id: input.service_request_id",
        "supplier_id: input.supplier_id",
        'if (indentStatus !== "draft")',
        '.on("postgres_changes", { event: "*", schema: "public", table: "indents" }, fetchIndents)',
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(materialAdminPageSource, [
        "approveIndent",
        "linkRequestToIndent",
        'status: "indent_forwarded"',
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(buyerRequestsHookSource, [
        'FORWARDABLE_INDENT_STATUSES',
        'Only approved indents can be forwarded to suppliers.',
        '.or("indent_id.is.null,status.eq.indent_rejected")',
      ])
    ).toBe(true);

    expect(sidebarSource.includes("/admin/service-indents")).toBe(true);
  });

  it("keeps service indents visible and supplier-safe in the supplier portal", async () => {
    const supplierPortalHookSource = await readRepoFile("hooks/useSupplierPortal.ts");
    const supplierIndentsPageSource = await readRepoFile("app/(dashboard)/supplier/indents/page.tsx");
    const migrationSource = await readRepoFile(
      "supabase/migrations/20260331000001_service_deployment_indent_flow.sql"
    );

    expect(
      sourceContainsAll(supplierPortalHookSource, [
        "site_location:company_locations!site_location_id",
        "site_location_name",
        "is_service_request === true",
        'rejected_at: new Date().toISOString()',
        'from("service_purchase_order_items")',
        "total_amount: 0",
        'status: "po_issued"',
        'rpc("create_po_from_supplier_request"',
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(supplierIndentsPageSource, [
        "headcount",
        "service_grade",
        "site_location_name",
        "Service and indent details assigned to your supplier account.",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(migrationSource, [
        "service_type text",
        "service_grade text",
        "site_location_id uuid",
        "service_request_id uuid",
        "supplier_id uuid",
      ])
    ).toBe(true);
  });

  it("keeps the migration hardening for duplicate columns and super admin request access", async () => {
    const duplicateSafeMigration = await readRepoFile(
      "supabase/migrations/20260315233000_fix_mocked_dashboards.sql"
    );
    const superAdminPatchMigration = await readRepoFile(
      "supabase/migrations/20260401000004_patch_requests_super_admin_policies.sql"
    );
    const superAdminProcurementPatchMigration = await readRepoFile(
      "supabase/migrations/20260401000005_patch_procurement_super_admin_policies.sql"
    );

    expect(
      sourceContainsAll(duplicateSafeMigration, [
        "ADD COLUMN IF NOT EXISTS headcount",
        "ADD COLUMN IF NOT EXISTS shift",
        "ADD COLUMN IF NOT EXISTS duration_months",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(superAdminPatchMigration, [
        "'super_admin'",
        'CREATE POLICY "Admin Manage Requests"',
        'CREATE POLICY "View Request Items"',
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(superAdminProcurementPatchMigration, [
        "'super_admin'",
        'CREATE POLICY "View Indents"',
        'CREATE POLICY "Manage Purchase Orders"',
        'CREATE POLICY "View Reconciliation Lines"',
      ])
    ).toBe(true);
  });
});
