"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { 
  startOfMonth, 
  endOfMonth, 
  format, 
  eachDayOfInterval, 
  isSameDay, 
  parseISO,
  startOfYear,
  parse
} from "date-fns";

export type ReportType = "financial" | "attendance" | "inventory" | "services";

export function useAnalyticsData(reportType: ReportType, selectedDate: Date = new Date()) {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const startDate = startOfMonth(selectedDate);
    const endDate = endOfMonth(selectedDate);
    const startDateStr = format(startDate, "yyyy-MM-dd");
    const endDateStr = format(endDate, "yyyy-MM-dd");

    try {
      if (reportType === "financial") {
        // Trends for the whole year up to now
        const yearStart = startOfYear(selectedDate);
        const { data: trendsRaw, error: trendsError } = await supabase
          .from("view_financial_monthly_trends")
          .select("*")
          .gte("month", format(yearStart, "yyyy-MM-dd"))
          .order("month", { ascending: true });

        if (trendsError) throw trendsError;
        
        // Format the raw date strings from the view into "MMM yyyy"
        const trendsData = (trendsRaw || []).map(row => ({
          ...row,
          month: format(parseISO(row.month), "MMM yyyy")
        }));

        // Category breakdown for selected month - Querying tables directly to allow date filtering
        // We use !inner join to ensure existence, and filter in JS to avoid PostgREST dot-notation issues
        const { data: categoryRaw, error: categoryError } = await supabase
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
          .lte("sale_bills.invoice_date", endDateStr);

        // KPIs for selected month
        const { data: kpiRaw, error: kpiError } = await supabase
          .from("sale_bills")
          .select("total_amount, paid_amount, due_amount")
          .neq("status", "cancelled")
          .gte("invoice_date", startDateStr)
          .lte("invoice_date", endDateStr);
        
        // Accurate monthly expense from purchase_bills
        const { data: expenseRaw, error: expenseError } = await supabase
          .from("purchase_bills")
          .select("total_amount")
          .neq("status", "cancelled")
          .gte("bill_date", startDateStr)
          .lte("bill_date", endDateStr);

        if (categoryError) throw categoryError;
        if (kpiError) throw kpiError;
        if (expenseError) throw expenseError;

        // Process category data - only include non-cancelled bills
        const catMap = (categoryRaw || [])
          .filter((item: any) => item.sale_bills?.status !== "cancelled")
          .reduce((acc: any, item: any) => {
            const cat = item.services?.service_category || "Uncategorized";
            acc[cat] = (acc[cat] || 0) + (Number(item.line_total) / 100);
            return acc;
          }, {});
        const categoryData = Object.entries(catMap).map(([category, revenue]) => ({ category, revenue }));

        // Process KPIs
        const summary = (kpiRaw || []).reduce((acc: any, bill: any) => {
          acc.total_outstanding += Number(bill.due_amount || 0);
          acc.total_collected_month += Number(bill.paid_amount || 0);
          acc.total_billing_month += Number(bill.total_amount || 0);
          return acc;
        }, { total_outstanding: 0, total_collected_month: 0, total_billing_month: 0, total_expense: 0 });

        // Accurate total expense for summary
        summary.total_expense = (expenseRaw || []).reduce((acc, b) => acc + Number(b.total_amount || 0), 0);

        // Keep for compatibility with page.tsx
        summary.total_collected_ytd = summary.total_collected_month;
        summary.total_billing_ytd = summary.total_billing_month;

        setTrends(trendsData);
        setData(categoryData);
        setSummary(summary);

      } else if (reportType === "attendance") {
        // counts per day for the selected month
        const { data: attendanceLogs, error: attError } = await supabase
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

        if (attError) throw attError;

        const days = eachDayOfInterval({ start: startDate, end: endDate });
        const dailyStats = days.map(day => {
          const dayStr = format(day, "yyyy-MM-dd");
          const dayLogs = (attendanceLogs || []).filter(l => l.log_date === dayStr);
          
          let lateCount = 0;
          dayLogs.forEach(log => {
            const statusLower = (log.status || "").toLowerCase();
            
            // Only count as late if present or half_day and checked in after shift start + grace
            if (["present", "half_day"].includes(statusLower) && log.check_in_time) {
              const empData = log.employees as any;
              const assignments = empData?.employee_shift_assignments;
              
              // More robust extraction of the active shift
              let shift = null;
              if (Array.isArray(assignments)) {
                shift = assignments.find((a: any) => a.is_active)?.shifts;
              } else if (assignments?.is_active) {
                shift = assignments.shifts;
              }
              
              if (shift?.start_time) {
                const checkIn = new Date(log.check_in_time);
                const [sH, sM] = shift.start_time.split(":").map(Number);
                
                // Compare times on the same day to be safe
                const shiftStart = new Date(checkIn);
                shiftStart.setHours(sH, sM, 0, 0);
                
                const graceMinutes = Number(shift.grace_time_minutes || 15);
                const lateThreshold = new Date(shiftStart.getTime() + graceMinutes * 60000);
                
                if (checkIn > lateThreshold) {
                  lateCount++;
                }
              }
            }
          });

          return {
            date: format(day, "MMM dd"),
            present: dayLogs.filter(l => ["present", "half_day"].includes((l.status || "").toLowerCase())).length,
            absent: dayLogs.filter(l => ["absent", "absent_breach"].includes((l.status || "").toLowerCase())).length,
            late: lateCount,
          };
        });

        setData(dailyStats);

      } else if (reportType === "services") {
        // jobs completed per service type per month
        const { data: jobs, error: jobsError } = await supabase
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
          .gte("started_at", startDate.toISOString())
          .lte("started_at", endDate.toISOString());

        if (jobsError) throw jobsError;

        const grouped = (jobs || []).reduce((acc: any, job: any) => {
          const cat = job.service_requests?.services?.service_category || "Unknown";
          if (!acc[cat]) {
            acc[cat] = { service_category: cat, total_jobs: 0, total_duration: 0, completed_jobs: 0 };
          }
          acc[cat].total_jobs += 1;
          
          // Use service_requests.created_at for response time logic to match view_service_performance
          if (job.status === "completed" && job.completed_at) {
            const startTime = new Date(job.service_requests?.created_at || job.started_at).getTime();
            const duration = (new Date(job.completed_at).getTime() - startTime) / (1000 * 3600);
            acc[cat].total_duration += duration;
            acc[cat].completed_jobs += 1;
          }
          return acc;
        }, {});

        const serviceStats = Object.values(grouped).map((s: any) => ({
          ...s,
          avg_response: s.completed_jobs > 0 ? (s.total_duration / s.completed_jobs).toFixed(1) : 0,
          resolution_rate: s.total_jobs > 0 ? ((s.completed_jobs / s.total_jobs) * 100).toFixed(1) : 0
        }));

        setData(serviceStats);

        // Add monthly trends for services
        const yearStart = startOfYear(selectedDate);
        const { data: trendJobs, error: trendError } = await supabase
          .from("job_sessions")
          .select("started_at, status")
          .gte("started_at", yearStart.toISOString())
          .lte("started_at", endDate.toISOString());
        
        if (!trendError && trendJobs) {
          const monthlyTrend = trendJobs.reduce((acc: any, job: any) => {
            const month = format(new Date(job.started_at), "MMM yyyy");
            if (!acc[month]) acc[month] = { month, jobs: 0, completed: 0 };
            acc[month].jobs += 1;
            if (job.status === "completed") acc[month].completed += 1;
            return acc;
          }, {});
          setTrends(Object.values(monthlyTrend).sort((a: any, b: any) => {
            const dateA = parse(a.month, "MMM yyyy", new Date());
            const dateB = parse(b.month, "MMM yyyy", new Date());
            return dateA.getTime() - dateB.getTime();
          }));
        }

      } else if (reportType === "inventory") {
        // items issued vs received per month
        const { data: transactions, error: txError } = await supabase
          .from("stock_transactions")
          .select(`
            *,
            products!inner (
              product_name
            )
          `)
          .gte("transaction_date", startDateStr)
          .lte("transaction_date", endDateStr);

        if (txError) throw txError;

        // Fetch low stock items for summary
        const { data: inventorySummary, error: invError } = await (supabase
          .from("view_inventory_summary" as any)
          .select("*") as any);

        if (invError) throw invError;

        const lowStockCount = (inventorySummary || []).filter((i: any) => i.stock_status === "Low Stock").length;

        const grouped = (transactions || []).reduce((acc: any, tx: any) => {
          const itemName = tx.products?.product_name || "Unknown";
          if (!acc[itemName]) {
            acc[itemName] = { item_name: itemName, received: 0, issued: 0 };
          }
          const qty = Math.abs(Number(tx.quantity));
          const type = (tx.transaction_type || "").toUpperCase();
          
          // Precise matching for schema values in/out + common aliases
          const isReceived = ["IN", "RECEIVE", "GRN", "RETURN"].includes(type);
          const isIssued = ["OUT", "ISSUE", "DISPATCH", "WASTE"].includes(type);
          
          if (isReceived) {
            acc[itemName].received += qty;
          } else if (isIssued) {
            acc[itemName].issued += qty;
          }
          return acc;
        }, {});

        setData(Object.values(grouped));
        setSummary({ low_stock_count: lowStockCount });

        // Add monthly trends for inventory
        const yearStart = startOfYear(selectedDate);
        const { data: trendTx, error: trendError } = await supabase
          .from("stock_transactions")
          .select("transaction_date, transaction_type, quantity")
          .gte("transaction_date", format(yearStart, "yyyy-MM-dd"))
          .lte("transaction_date", endDateStr);

        if (!trendError && trendTx) {
          const monthlyTrend = trendTx.reduce((acc: any, tx: any) => {
            const month = format(parseISO(tx.transaction_date), "MMM yyyy");
            if (!acc[month]) acc[month] = { month, received: 0, issued: 0 };
            const qty = Math.abs(Number(tx.quantity));
            const type = (tx.transaction_type || "").toUpperCase();
            
            // Precise matching for trends
            const isReceived = ["IN", "RECEIVE", "GRN", "RETURN"].includes(type);
            const isIssued = ["OUT", "ISSUE", "DISPATCH", "WASTE"].includes(type);

            if (isReceived) acc[month].received += qty;
            else if (isIssued) acc[month].issued += qty;
            return acc;
          }, {});
          setTrends(Object.values(monthlyTrend).sort((a: any, b: any) => {
            const dateA = parse(a.month, "MMM yyyy", new Date());
            const dateB = parse(b.month, "MMM yyyy", new Date());
            return dateA.getTime() - dateB.getTime();
          }));
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch data";
      console.error("Error fetching analytics data:", err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [reportType, selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    summary,
    trends,
    isLoading,
    error,
    refresh: fetchData,
  };
}
