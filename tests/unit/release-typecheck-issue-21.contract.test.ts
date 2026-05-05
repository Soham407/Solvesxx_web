import { describe, expect, it } from "vitest";
import { readRepoFile, sourceContainsAll, sourceContainsNone } from "../helpers/source-files";

describe("issue #21 release blocker contracts", () => {
  it("keeps indent verification free of undefined index references", async () => {
    const source = await readRepoFile("app/(dashboard)/inventory/indents/verification/page.tsx");

    expect(sourceContainsNone(source, ["`V-${index}`", "{index}"])).toBe(true);
  });

  it("keeps financial date filtering type-safe across gte/lte chaining", async () => {
    const source = await readRepoFile("hooks/useAnalyticsData.ts");

    expect(
      sourceContainsAll(source, [
        "type DateRangeQueryable =",
        "buildFinancialDateFilter",
        "buildInvoiceDateFilter",
        ".gte(\"sale_bills.invoice_date\", startDateStr).lte(\"sale_bills.invoice_date\", endDateStr)",
      ])
    ).toBe(true);
  });

  it("uses shared candidate transform readiness import", async () => {
    const source = await readRepoFile("hooks/useCandidates.ts");

    expect(
      sourceContainsAll(source, [
        "fetchBgvReadiness as fetchBgvReadiness",
        "@/src/lib/candidates/candidateTransforms",
      ])
    ).toBe(true);
  });
});
