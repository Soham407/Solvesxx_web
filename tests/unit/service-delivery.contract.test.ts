import { describe, expect, it } from "vitest";

import { readRepoFile, sourceContainsAll } from "../helpers/source-files";

describe("service delivery contracts", () => {
  it("keeps service-request completion gated behind stored photo evidence", async () => {
    const requestsSource = await readRepoFile("hooks/useServiceRequests.ts");
    const detailPageSource = await readRepoFile(
      "app/(dashboard)/service-requests/[id]/page.tsx"
    );
    const panelSource = await readRepoFile("components/jobs/JobSessionPanel.tsx");
    const migrationSource = await readRepoFile(
      "supabase/migrations/20260405010000_service_ops_completion_truth.sql"
    );

    expect(
      sourceContainsAll(requestsSource, [
        '.select("after_photo_url, completion_notes, status',
        "After photo evidence is required before completing this request",
        'rpc("complete_service_task"',
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(detailPageSource, [
        "const result = await completeRequest(request.id)",
        "if (!result.success)",
        'toast.error(result.error || "Failed to complete request")',
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(panelSource, [
        "completionNotes.trim().length < 10",
        "Please add meaningful completion notes (min 10 characters).",
        "completeTask(requestState.id, photoUrl, completionNotes.trim())",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(migrationSource, [
        "Operational Truth Error: Meaningful resolution notes (min 10 chars) required.",
        "completion_notes = v_completion_notes",
        "resolution_notes = v_completion_notes",
      ])
    ).toBe(true);
  });

  it("keeps pest control jobs gated behind mandatory PPE verification", async () => {
    const sessionsSource = await readRepoFile("hooks/useJobSessions.ts");
    const requestsSource = await readRepoFile("hooks/useServiceRequests.ts");
    const panelSource = await readRepoFile("components/jobs/JobSessionPanel.tsx");
    const detailPageSource = await readRepoFile("app/(dashboard)/service-requests/[id]/page.tsx");
    const cardSource = await readRepoFile("components/service-requests/RequestKanbanCard.tsx");

    expect(
      sourceContainsAll(sessionsSource, [
        '.from("pest_control_ppe_verifications")',
        '.eq("all_items_checked", true)',
        "PPE verification required before completing pest control job",
        "completeJob = completeSession",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(requestsSource, [
        '.from("pest_control_ppe_verifications")',
        '.eq("all_items_checked", true)',
        "PPE verification required before completing pest control job",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(panelSource, [
        "usePestControlPPE",
        "PPE Checklist",
        "PPE verification is required for pest control jobs",
        "handleVerifyPPE",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(detailPageSource, [
        "PestControlPPEGate",
        "serviceRequestId={request.id}",
        "onVerified={() => refresh()}",
        "isPestControl",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(cardSource, [
        "isPestControl",
        "ppeVerified",
        "PPE",
        "Verified",
        "Pending",
      ])
    ).toBe(true);
  });

  it("keeps technician auth linkage flowing through the employee profile bridge", async () => {
    const employeeProfileSource = await readRepoFile("hooks/useEmployeeProfile.ts");
    const technicianPortalSource = await readRepoFile(
      "app/(dashboard)/service-boy/page.tsx"
    );

    expect(
      sourceContainsAll(employeeProfileSource, [
        '.eq("auth_user_id", user.id)',
        "employeeId: directEmployee.id",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(technicianPortalSource, [
        "employeeId ? { assignedTo: employeeId } : {}",
        "useJobSessions(undefined, employeeId || undefined)",
      ])
    ).toBe(true);
  });

  it("keeps delivery-note and dispatch joins mapped through explicit aliases", async () => {
    const deliveryNotesSource = await readRepoFile("hooks/useServiceDeliveryNotes.ts");
    const dispatchesSource = await readRepoFile("hooks/usePersonnelDispatches.ts");
    const acknowledgmentDialogSource = await readRepoFile("components/dialogs/ServiceAcknowledgmentDialog.tsx");
    const deliveryDialogSource = await readRepoFile("components/dialogs/ServiceDeliveryNoteDialog.tsx");
    const supplierServiceOrdersPageSource = await readRepoFile("app/(dashboard)/supplier/service-orders/page.tsx");

    expect(
      sourceContainsAll(deliveryNotesSource, [
        "service_purchase_order:service_purchase_orders!service_delivery_notes_po_id_fkey",
        "po_number: row.service_purchase_order?.spo_number",
        "supplier_name: row.service_purchase_order?.supplier?.supplier_name",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(dispatchesSource, [
        'from("service_purchase_orders")',
        'select("id, spo_number")',
        '.in("status", ["dispatched", "confirmed", "active"])',
        '.lte("start_date", overlapEndDate)',
        "deployment_site:company_locations!deployment_site_id (location_name)",
        "site_name: d.deployment_site?.location_name",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(deliveryDialogSource, [
        'from("personnel_dispatches")',
        '.in("status", ["dispatched", "confirmed", "active"])',
        '.lte("start_date", watchDate)',
        "deployment_site:company_locations!deployment_site_id (location_name)",
        "o.deployment_site?.location_name",
        "deployment_site_id: deploymentSiteId || undefined",
        "Dispatch Ledger Incomplete",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(acknowledgmentDialogSource, [
        'from("service_delivery_notes")',
        'status: "verified"',
        "verified_by: employeeRecord.id",
        "A delivery note must exist before deployment can be acknowledged.",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(supplierServiceOrdersPageSource, [
        "site_location_name || \"Site pending\"",
        "deploymentSiteId={deliveryNoteOrder.site_location_id ?? null}",
        "deploymentSiteName={deliveryNoteOrder.site_location_name ?? null}",
      ])
    ).toBe(true);
  });
});
