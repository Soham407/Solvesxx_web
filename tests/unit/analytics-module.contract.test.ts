import { describe, expect, it } from "vitest";
import {
  readRepoFile,
  sourceContainsAll,
  sourceContainsNone,
} from "../helpers/source-files";

describe("analytics module contracts", () => {
  it("ensures useAnalyticsData hook is wired to real data and has correct logic", async () => {
    const hookSource = await readRepoFile("hooks/useAnalyticsData.ts");

    // Attendance fixes
    expect(sourceContainsNone(hookSource, ['statusLower === "late"'])).toBe(true);
    expect(sourceContainsAll(hookSource, [
      'lateCount++',
      'checkIn > lateThreshold',
      'const lateThreshold = new Date(shiftStart.getTime() + graceMinutes * 60000)',
    ])).toBe(true);

    // Inventory fixes
    expect(sourceContainsAll(hookSource, [
      'const isReceived = ["IN", "RECEIVE", "GRN", "RETURN"].includes(type)',
      'const isIssued = ["OUT", "ISSUE", "DISPATCH", "WASTE"].includes(type)',
    ])).toBe(true);

    // Financial fixes (date filtering)
    expect(sourceContainsAll(hookSource, [
      '.gte("sale_bills.invoice_date", startDateStr)',
      '.lte("sale_bills.invoice_date", endDateStr)',
      '.gte("invoice_date", startDateStr)',
      '.lte("invoice_date", endDateStr)',
    ])).toBe(true);
  });

  it("ensures report pages are using real data and correct labels", async () => {
    const servicesPageSource = await readRepoFile("app/(dashboard)/reports/services/page.tsx");
    const financialPageSource = await readRepoFile("app/(dashboard)/reports/financial/page.tsx");
    const attendancePageSource = await readRepoFile("app/(dashboard)/reports/attendance/page.tsx");
    const inventoryPageSource = await readRepoFile("app/(dashboard)/reports/inventory/page.tsx");

    // Services labels
    expect(sourceContainsAll(servicesPageSource, ['label: "Total Jobs"'])).toBe(true);
    expect(sourceContainsNone(servicesPageSource, ['label: "Active Jobs"'])).toBe(true);

    // Financial real data bindings
    expect(sourceContainsAll(financialPageSource, [
      'const { data, trends, summary, isLoading, error } = useAnalyticsData("financial", selectedDate)',
      'categories={["revenue", "expense", "net_margin"]}',
    ])).toBe(true);

    // Attendance real data bindings
    expect(sourceContainsAll(attendancePageSource, [
      'const { data, isLoading, error } = useAnalyticsData("attendance", selectedDate)',
      'categories={["present", "absent"]}',
      'categories={["late"]}',
    ])).toBe(true);

    // Inventory real data bindings
    expect(sourceContainsAll(inventoryPageSource, [
      'const { data, trends, summary, isLoading, error } = useAnalyticsData("inventory", selectedDate)',
      'categories={["received", "issued"]}',
    ])).toBe(true);
  });
});
