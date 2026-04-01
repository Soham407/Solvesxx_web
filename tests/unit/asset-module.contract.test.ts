import { describe, expect, it } from "vitest";

import { readRepoFile, sourceContainsAll } from "../helpers/source-files";

describe("asset module contracts", () => {
  it("keeps the ASSET-001 database lifecycle hardening in place", async () => {
    const source = await readRepoFile(
      "supabase/migrations/20260330000007_asset_001_asset_flow_fixes.sql"
    );

    expect(
      sourceContainsAll(source, [
        "references auth.users(id)",
        "create or replace function public.start_service_task",
        "insert into public.job_sessions",
        "insert into public.job_photos",
        "create or replace function public.complete_service_task",
        "status = 'completed'",
      ])
    ).toBe(true);
  });

  it("routes maintenance completion through linked service requests", async () => {
    const hookSource = await readRepoFile("hooks/useMaintenanceSchedules.ts");
    const pageSource = await readRepoFile(
      "app/(dashboard)/assets/maintenance/page.tsx"
    );

    expect(
      sourceContainsAll(hookSource, [
        '.eq("maintenance_schedule_id", id)',
        '.eq("status", "completed")',
        "complete the linked service request before marking maintenance as performed",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(pageSource, [
        "onCreateServiceRequest={handleCreateServiceRequest}",
        "maintenance_schedule_id: schedule.id",
        "assignRequest(result.data.id, schedule.assigned_to_employee)",
      ])
    ).toBe(true);
  });

  it("keeps QR batch generation and scan landing wired to the hook layer", async () => {
    const hookSource = await readRepoFile("hooks/useQrCodes.ts");
    const generatorSource = await readRepoFile(
      "components/qr-codes/QrBatchGenerator.tsx"
    );
    const scanPageSource = await readRepoFile("app/scan/[id]/page.tsx");
    const assetsPageSource = await readRepoFile("app/(dashboard)/assets/page.tsx");

    expect(
      sourceContainsAll(hookSource, [
        "generateBatch",
        'fetch("/api/assets/generate-qr-batch"',
        "generateQrUrl",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(generatorSource, [
        "const { generateBatch, generateQrUrl } = useQrCodes",
        "generateQrUrl(qr.id)",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(scanPageSource, [
        "useQrCodes",
        "await scanQrCode(qrId, location)",
        "View Asset Details",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(assetsPageSource, [
        "onViewQr={(asset) => setQrAsset(asset)}",
        "<QrCodeDisplay",
      ])
    ).toBe(true);
  });

  it("keeps job-session completion synced with service-request evidence", async () => {
    const jobSessionsSource = await readRepoFile("hooks/useJobSessions.ts");
    const jobPanelSource = await readRepoFile(
      "components/jobs/JobSessionPanel.tsx"
    );

    expect(
      sourceContainsAll(jobSessionsSource, [
        'await supabase.rpc("complete_service_task"',
        'error: "After photo evidence is required before completing a session"',
        "const session = await getSessionRecord(id)",
      ])
    ).toBe(true);

    expect(
      sourceContainsAll(jobPanelSource, [
        "const [requestState, setRequestState] = useState(serviceRequest)",
        "const updatedRequest = await getRequestById(requestState.id)",
      ])
    ).toBe(true);
  });
});
