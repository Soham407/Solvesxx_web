import { endOfMonth, format, startOfMonth, startOfYear } from "date-fns";
import { supabase } from "@/src/lib/supabaseClient";
import {
  mapAttendanceAnalytics,
  mapFinancialAnalytics,
  mapInventoryAnalytics,
  mapServicesAnalytics,
  type AttendanceLogRow,
  type ChartRow,
  type FinancialCategoryRow,
  type FinancialKpiRow,
  type FinancialSummary,
  type FinancialTrendRow,
  type InventorySummaryRow,
  type StockTransactionRow,
} from "@/src/lib/analytics/reportTransforms";

export type AnalyticsReportResult = {
  data: ChartRow[];
  summary: FinancialSummary | null;
  trends: ChartRow[];
};

function buildDateRange(selectedDate: Date) {
  const startDate = startOfMonth(selectedDate);
  const endDate = endOfMonth(selectedDate);

  return {
    startDate,
    endDate,
    startDateStr: format(startDate, "yyyy-MM-dd"),
    endDateStr: format(endDate, "yyyy-MM-dd"),
    yearStart: startOfYear(selectedDate),
  };
}

export async function loadFinancialAnalytics(selectedDate: Date): Promise<AnalyticsReportResult> {
  const { startDateStr, endDateStr, yearStart } = buildDateRange(selectedDate);

  const [trendsResult, categoryResult, kpiResult, expenseResult] = await Promise.all([
    supabase
      .from("view_financial_monthly_trends")
      .select("*")
      .gte("month", format(yearStart, "yyyy-MM-dd"))
      .order("month", { ascending: true }),
    supabase
      .from("sale_bill_items")
      .select(`
        line_total,
        services!inner (
          service_category
        ),
        sale_bills!inner (
          invoice_date,
          status
        )
      `)
      .gte("sale_bills.invoice_date", startDateStr)
      .lte("sale_bills.invoice_date", endDateStr),
    supabase
      .from("sale_bills")
      .select("total_amount, paid_amount, due_amount")
      .neq("status", "cancelled")
      .gte("invoice_date", startDateStr)
      .lte("invoice_date", endDateStr),
    supabase
      .from("purchase_bills")
      .select("total_amount")
      .neq("status", "cancelled")
      .gte("bill_date", startDateStr)
      .lte("bill_date", endDateStr),
  ]);

  if (trendsResult.error) throw trendsResult.error;
  if (categoryResult.error) throw categoryResult.error;
  if (kpiResult.error) throw kpiResult.error;
  if (expenseResult.error) throw expenseResult.error;

  const { data: categoryData, summary, trends } = mapFinancialAnalytics({
    trendsRaw: (trendsResult.data || []) as FinancialTrendRow[],
    categoryRaw: (categoryResult.data || []) as FinancialCategoryRow[],
    kpiRaw: (kpiResult.data || []) as FinancialKpiRow[],
    expenseRaw: (expenseResult.data || []) as Array<{ total_amount: number | string | null }>,
  });

  return { data: categoryData, summary, trends };
}

export async function loadAttendanceAnalytics(selectedDate: Date): Promise<AnalyticsReportResult> {
  const { startDate, endDate, startDateStr, endDateStr } = buildDateRange(selectedDate);

  const { data: attendanceLogs, error } = await supabase
    .from("attendance_logs")
    .select(`
      log_date, 
      status, 
      check_in_time, 
      employee_id,
      employees (
        employee_shift_assignments (
          is_active,
          shifts (
            start_time,
            grace_time_minutes
          )
        )
      )
    `)
    .gte("log_date", startDateStr)
    .lte("log_date", endDateStr);

  if (error) throw error;

  return {
    data: mapAttendanceAnalytics({
      attendanceLogs: (attendanceLogs || []) as AttendanceLogRow[],
      startDate,
      endDate,
    }),
    summary: null,
    trends: [],
  };
}

export async function loadServicesAnalytics(selectedDate: Date): Promise<AnalyticsReportResult> {
  const { startDateStr, endDateStr, yearStart } = buildDateRange(selectedDate);

  const [jobsResult, trendResult] = await Promise.all([
    supabase
      .from("job_sessions")
      .select(`
        *,
        service_requests!inner (
          created_at,
          service_id,
          services!inner (
            service_category
          )
        )
      `)
      .gte("started_at", startDateStr)
      .lte("started_at", endDateStr),
    supabase
      .from("job_sessions")
      .select("started_at, status")
      .gte("started_at", yearStart.toISOString())
      .lte("started_at", endDateStr),
  ]);

  if (jobsResult.error) throw jobsResult.error;
  if (trendResult.error) throw trendResult.error;

  const { data, trends } = mapServicesAnalytics({
    jobs: (jobsResult.data || []) as Array<{
      status?: string | null;
      completed_at?: string | null;
      started_at?: string | null;
      service_requests?: {
        created_at?: string | null;
        services?: {
          service_category?: string | null;
        } | null;
      } | null;
    }>,
    trendJobs: (trendResult.data || []) as Array<{
      started_at?: string | null;
      status?: string | null;
    }>,
  });

  return { data, summary: null, trends };
}

export async function loadInventoryAnalytics(selectedDate: Date): Promise<AnalyticsReportResult> {
  const { startDateStr, endDateStr, yearStart } = buildDateRange(selectedDate);

  const [transactionsResult, summaryResult, trendResult] = await Promise.all([
    supabase
      .from("stock_transactions")
      .select(`
        *,
        products!inner (
          product_name
        )
      `)
      .gte("transaction_date", startDateStr)
      .lte("transaction_date", endDateStr),
    supabase.from("view_inventory_summary").select("*"),
    supabase
      .from("stock_transactions")
      .select("transaction_date, transaction_type, quantity")
      .gte("transaction_date", format(yearStart, "yyyy-MM-dd"))
      .lte("transaction_date", endDateStr),
  ]);

  if (transactionsResult.error) throw transactionsResult.error;
  if (summaryResult.error) throw summaryResult.error;
  if (trendResult.error) throw trendResult.error;

  const { data, trends, lowStockCount } = mapInventoryAnalytics({
    transactions: (transactionsResult.data || []) as StockTransactionRow[],
    inventorySummary: (summaryResult.data || []) as InventorySummaryRow[],
    trendTx: (trendResult.data || []) as StockTransactionRow[],
  });

  return {
    data,
    summary: {
      total_outstanding: 0,
      total_collected_month: 0,
      total_billing_month: 0,
      total_expense: 0,
      low_stock_count: lowStockCount,
    },
    trends,
  };
}
