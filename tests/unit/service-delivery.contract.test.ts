import { describe, expect, it } from "vitest";

import { readRepoFile, sourceContainsAll } from "../helpers/source-files";

describe("service delivery contracts", () => {
  it("keeps service-request completion gated behind stored photo evidence", async () => {
    const requestsSource = await readRepoFile("hooks/useServiceRequests.ts");
    const detailPageSource = await readRepoFile(
      "app/(dashboard)/service-requests/[id]/page.tsx"
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

    expect(
      sourceContainsAll(deliveryNotesSource, [
        "service_purchase_order:service_purchase_orders!service_delivery_notes_po_id_fkey",
        "po_number: row.service_purchase_order?.spo_number",
        "supplier_name: row.service_purchase_order?.supplier?.supplier_name",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(dispatchesSource, [
        "purchase_order:purchase_orders!service_po_id (po_number)",
        "deployment_site:company_locations!deployment_site_id (name)",
        "site_name: d.deployment_site?.name",
      ])
    ).toBe(true);
  });
});
