import type { ChartRow, FinancialSummary } from "@/src/lib/analytics/reportTransforms";

function toNumber(value: string | number | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export interface FinancialReportRow extends ChartRow {
  category: string;
  revenue: number;
}

export interface FinancialTrendReportRow extends ChartRow {
  month: string;
  revenue: number;
  expense?: number;
  net_margin?: number;
}

export interface InventoryReportRow extends ChartRow {
  item_name: string;
  received: number;
  issued: number;
}

export interface InventoryTrendReportRow extends ChartRow {
  month: string;
  received: number;
  issued: number;
}

export interface ServiceReportRow extends ChartRow {
  service_category: string;
  total_jobs: number;
  avg_response: number;
  resolution_rate: number;
}

export interface ServiceTrendReportRow extends ChartRow {
  month: string;
  jobs: number;
  completed: number;
}

export interface AttendanceReportRow extends ChartRow {
  date: string;
  present: number;
  absent: number;
  late: number;
}

export interface FinancialReportPageStats {
  totalCollection: number;
  totalCollectionRupees: number;
  totalExpenseRupees: number;
  outstanding: number;
  profitRetention: string;
  monthlyNet: number;
  momCollectionChange: string | null;
  momExpenseChange: string | null;
}

export interface InventoryReportPageStats {
  totalReceived: number;
  totalIssued: number;
  fastMovingItem: string;
}

export interface ServiceReportPageStats {
  avgTAT: string;
  totalJobs: number;
  avgResolutionRate: string;
}

export interface AttendanceReportPageStats {
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  avgAttendance: string;
}

export function buildFinancialReportPageStats(input: {
  summary: FinancialSummary | null;
  trends: Array<{ revenue: number; expense?: number }>;
}): FinancialReportPageStats {
  const totalCollection = Number(input.summary?.total_collected_month || 0);
  const outstanding = Number(input.summary?.total_outstanding || 0);
  const totalCollectionRupees = totalCollection / 100;
  const totalExpenseRupees = Number(input.summary?.total_expense || 0) / 100;

  const lastTwoMonths = input.trends.slice(-2);
  const momCollectionChange =
    lastTwoMonths.length === 2 && Number(lastTwoMonths[0].revenue || 0) > 0
      ? (((Number(lastTwoMonths[1].revenue || 0) - Number(lastTwoMonths[0].revenue || 0)) /
          Number(lastTwoMonths[0].revenue || 0)) *
          100).toFixed(1)
      : null;
  const momExpenseChange =
    lastTwoMonths.length === 2 && Number(lastTwoMonths[0].expense || 0) > 0
      ? (((Number(lastTwoMonths[1].expense || 0) - Number(lastTwoMonths[0].expense || 0)) /
          Number(lastTwoMonths[0].expense || 0)) *
          100).toFixed(1)
      : null;
  const profitRetention =
    totalCollectionRupees > 0
      ? (((totalCollectionRupees - totalExpenseRupees) / totalCollectionRupees) * 100).toFixed(1)
      : "0.0";

  return {
    totalCollection,
    totalCollectionRupees,
    totalExpenseRupees,
    outstanding,
    profitRetention,
    monthlyNet: totalCollection - Number(input.summary?.total_expense || 0),
    momCollectionChange,
    momExpenseChange,
  };
}

export function buildInventoryReportPageStats(input: {
  data: Array<{ received: number; issued: number; item_name: string }>;
}): InventoryReportPageStats {
  const totalReceived = input.data.reduce((acc, curr) => acc + Number(curr.received || 0), 0);
  const totalIssued = input.data.reduce((acc, curr) => acc + Number(curr.issued || 0), 0);
  const fastMovingItem =
    input.data.length > 0
      ? [...input.data].sort((a, b) => Number(b.issued) - Number(a.issued))[0]?.item_name
      : "None";

  return {
    totalReceived,
    totalIssued,
    fastMovingItem,
  };
}

export function buildServiceReportPageStats(input: {
  data: Array<{ avg_response: number; total_jobs: number; resolution_rate: number }>;
}): ServiceReportPageStats {
  const avgTAT =
    input.data.length > 0
      ? (input.data.reduce((acc, curr) => acc + Number(curr.avg_response || 0), 0) / input.data.length).toFixed(1)
      : "0";
  const totalJobs = input.data.reduce((acc, curr) => acc + Number(curr.total_jobs || 0), 0);
  const avgResolutionRate =
    input.data.length > 0
      ? (input.data.reduce((acc, curr) => acc + Number(curr.resolution_rate || 0), 0) / input.data.length).toFixed(1)
      : "0";

  return { avgTAT, totalJobs, avgResolutionRate };
}

export function buildAttendanceReportPageStats(input: {
  data: Array<{ present: number; absent: number; late: number }>;
}): AttendanceReportPageStats {
  const totalPresent = input.data.reduce((acc, curr) => acc + Number(curr.present || 0), 0);
  const totalAbsent = input.data.reduce((acc, curr) => acc + Number(curr.absent || 0), 0);
  const totalLate = input.data.reduce((acc, curr) => acc + Number(curr.late || 0), 0);
  const avgAttendance =
    input.data.length > 0
      ? ((totalPresent / (totalPresent + totalAbsent || 1)) * 100).toFixed(1)
      : "0.0";

  return { totalPresent, totalAbsent, totalLate, avgAttendance };
}

export function normalizeFinancialReportRows(rows: ChartRow[]): FinancialReportRow[] {
  return rows.map((row) => ({
    category: String(row.category ?? "Uncategorized"),
    revenue: toNumber(row.revenue),
  }));
}

export function normalizeFinancialTrendRows(rows: ChartRow[]): FinancialTrendReportRow[] {
  return rows.map((row) => ({
    month: String(row.month ?? ""),
    revenue: toNumber(row.revenue),
    expense: row.expense === undefined ? undefined : toNumber(row.expense),
    net_margin: row.net_margin === undefined ? undefined : toNumber(row.net_margin),
  }));
}

export function normalizeInventoryReportRows(rows: ChartRow[]): InventoryReportRow[] {
  return rows.map((row) => ({
    item_name: String(row.item_name ?? "Unknown"),
    received: toNumber(row.received),
    issued: toNumber(row.issued),
  }));
}

export function normalizeInventoryTrendRows(rows: ChartRow[]): InventoryTrendReportRow[] {
  return rows.map((row) => ({
    month: String(row.month ?? ""),
    received: toNumber(row.received),
    issued: toNumber(row.issued),
  }));
}

export function normalizeServiceReportRows(rows: ChartRow[]): ServiceReportRow[] {
  return rows.map((row) => ({
    service_category: String(row.service_category ?? "Unknown"),
    total_jobs: toNumber(row.total_jobs),
    avg_response: toNumber(row.avg_response),
    resolution_rate: toNumber(row.resolution_rate),
  }));
}

export function normalizeServiceTrendRows(rows: ChartRow[]): ServiceTrendReportRow[] {
  return rows.map((row) => ({
    month: String(row.month ?? ""),
    jobs: toNumber(row.jobs),
    completed: toNumber(row.completed),
  }));
}

export function normalizeAttendanceReportRows(rows: ChartRow[]): AttendanceReportRow[] {
  return rows.map((row) => ({
    date: String(row.date ?? ""),
    present: toNumber(row.present),
    absent: toNumber(row.absent),
    late: toNumber(row.late),
  }));
}
