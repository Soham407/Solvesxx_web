import { describe, expect, it } from "vitest";

import { readRepoFile, sourceContainsAll } from "../helpers/source-files";

describe("API contract: QR batch generation", () => {
  it("keeps auth, role checks, and request validation intact", async () => {
    const source = await readRepoFile("app/api/assets/generate-qr-batch/route.ts");

    expect(
      sourceContainsAll(source, [
        "Unauthorized - valid authentication required",
        "Forbidden - insufficient permissions for QR code management",
        "count: z.number().int().min(1).max(1000)",
        "societyId must be a valid UUID",
        'QR_MANAGEMENT_ROLES = ["admin", "account", "security_supervisor"]',
        "Society ID or Batch ID is required",
        'await supabase.from("qr_codes").delete().eq("batch_id", batchId)',
        "downloadUrl: `/api/assets/qr-batch/${batchId}/download`",
      ])
    ).toBe(true);
  });

  it("keeps the ownership check on QR batch downloads intact", async () => {
    const source = await readRepoFile("app/api/assets/qr-batch/[batchId]/download/route.ts");

    expect(
      sourceContainsAll(source, [
        "Forbidden - you can only download batches you generated",
        "Batch not found",
        "No QR codes found for this batch",
        "generatedAt",
        "security_supervisor",
      ])
    ).toBe(true);
  });
});
