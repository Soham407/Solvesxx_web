import { format, formatISO, parse, parseISO } from "date-fns";

export type ChartRow = Record<string, string | number>;

export type FinancialSummary = {
  total_outstanding: number;
  total_collected_month: number;
  total_billing_month: number;
  total_expense: number;
  low_stock_count?: number;
  total_collected_ytd?: number;
  total_billing_ytd?: number;
};

export type FinancialTrendRow = {
  month: string;
};

export type FinancialCategoryRow = {
  line_total: number | string | null;
  services?: {
    service_category?: string | null;
  } | null;
  sale_bills?: {
    status?: string | null;
  } | null;
};

export type FinancialKpiRow = {
  total_amount: number | string | null;
  paid_amount: number | string | null;
  due_amount: number | string | null;
};

export type InventorySummaryRow = {
  stock_status?: string | null;
};

export type StockTransactionRow = {
  transaction_date: string;
  transaction_type: string | null;
  quantity: number | string | null;
  products?: {
    product_name?: string | null;
  } | null;
};

export type AttendanceShiftRow = {
  is_active?: boolean | null;
  shifts?: {
    start_time?: string | null;
    grace_time_minutes?: number | string | null;
  } | {
    start_time?: string | null;
    grace_time_minutes?: number | string | null;
  }[] | null;
};

export type AttendanceEmployeeRow = {
  employee_shift_assignments?: AttendanceShiftRow | AttendanceShiftRow[] | null;
};

export type AttendanceLogRow = {
  log_date: string;
  status: string | null;
  check_in_time: string | null;
  check_out_time?: string | null;
  check_in_selfie_url?: string | null;
  check_in_latitude?: number | null;
  check_in_longitude?: number | null;
  employees?: AttendanceEmployeeRow | AttendanceEmployeeRow[] | null;
  employee_id?: string | null;
  total_hours?: number | string | null;
  check_in_location_id?: string | null;
};

function getAttendanceShift(log: AttendanceLogRow) {
  const empData = Array.isArray(log.employees) ? log.employees[0] : log.employees;
  const assignments = empData?.employee_shift_assignments;
  if (Array.isArray(assignments)) {
    const activeAssignment = assignments.find((a) => a.is_active);
    return Array.isArray(activeAssignment?.shifts)
      ? activeAssignment?.shifts[0] ?? null
      : activeAssignment?.shifts ?? null;
  }
  if (assignments?.is_active) {
    return Array.isArray(assignments.shifts)
      ? assignments.shifts[0] ?? null
      : assignments.shifts ?? null;
  }
  return null;
}

export function mapFinancialAnalytics(input: {
  trendsRaw: FinancialTrendRow[];
  categoryRaw: FinancialCategoryRow[];
  kpiRaw: FinancialKpiRow[];
  expenseRaw: Array<{ total_amount: number | string | null }>;
}): {
  data: ChartRow[];
  summary: FinancialSummary;
  trends: ChartRow[];
} {
  const trends = input.trendsRaw.map((row) => ({
    ...row,
    month: format(parseISO(row.month), "MMM yyyy"),
  }));

  const catMap = input.categoryRaw
    .filter((item) => item.sale_bills?.status !== "cancelled")
    .reduce<Record<string, number>>((acc, item) => {
      const cat = item.services?.service_category || "Uncategorized";
      acc[cat] = (acc[cat] || 0) + Number(item.line_total || 0) / 100;
      return acc;
    }, {});
  const data = Object.entries(catMap).map(([category, revenue]) => ({ category, revenue }));

  const summary = input.kpiRaw.reduce<FinancialSummary>(
    (acc, bill) => {
      acc.total_outstanding += Number(bill.due_amount || 0);
      acc.total_collected_month += Number(bill.paid_amount || 0);
      acc.total_billing_month += Number(bill.total_amount || 0);
      return acc;
    },
    { total_outstanding: 0, total_collected_month: 0, total_billing_month: 0, total_expense: 0 },
  );

  summary.total_expense = input.expenseRaw.reduce((acc, bill) => acc + Number(bill.total_amount || 0), 0);
  summary.total_collected_ytd = summary.total_collected_month;
  summary.total_billing_ytd = summary.total_billing_month;

  return { data, summary, trends };
}

export function mapAttendanceAnalytics(input: {
  attendanceLogs: AttendanceLogRow[];
  startDate: Date;
  endDate: Date;
}): ChartRow[] {
  const days = Array.from({ length: Math.round((input.endDate.getTime() - input.startDate.getTime()) / 86400000) + 1 }, (_, index) => {
    const day = new Date(input.startDate);
    day.setDate(input.startDate.getDate() + index);
    return day;
  });

  return days.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayLogs = input.attendanceLogs.filter((log) => log.log_date === dayStr);

    let lateCount = 0;
    dayLogs.forEach((log) => {
      const statusLower = (log.status || "").toLowerCase();
      if (["present", "half_day"].includes(statusLower) && log.check_in_time) {
        const shift = getAttendanceShift(log);
        if (shift?.start_time) {
          const checkIn = new Date(log.check_in_time);
          const [sH, sM] = shift.start_time.split(":").map(Number);
          const shiftStart = new Date(checkIn);
          shiftStart.setHours(sH, sM, 0, 0);
          const graceMinutes = Number(shift.grace_time_minutes || 15);
          const lateThreshold = new Date(shiftStart.getTime() + graceMinutes * 60000);
          if (checkIn > lateThreshold) {
            lateCount += 1;
          }
        }
      }
    });

    return {
      date: format(day, "MMM dd"),
      present: dayLogs.filter((log) => ["present", "half_day"].includes((log.status || "").toLowerCase())).length,
      absent: dayLogs.filter((log) => ["absent", "absent_breach"].includes((log.status || "").toLowerCase())).length,
      late: lateCount,
    };
  });
}

export function mapServicesAnalytics(input: {
  jobs: Array<{
    status?: string | null;
    completed_at?: string | null;
    started_at?: string | null;
    service_requests?: {
      created_at?: string | null;
      services?: {
        service_category?: string | null;
      } | null;
    } | null;
  }>;
  trendJobs: Array<{ started_at?: string | null; status?: string | null }>;
}): { data: ChartRow[]; trends: ChartRow[] } {
  const grouped = input.jobs.reduce<Record<string, { service_category: string; total_jobs: number; total_duration: number; completed_jobs: number }>>((acc, job) => {
    const cat = job.service_requests?.services?.service_category || "Unknown";
    if (!acc[cat]) {
      acc[cat] = { service_category: cat, total_jobs: 0, total_duration: 0, completed_jobs: 0 };
    }
    acc[cat].total_jobs += 1;
    if (job.status === "completed" && job.completed_at) {
      const startTime = new Date(job.service_requests?.created_at || job.started_at || formatISO(new Date())).getTime();
      const duration = (new Date(job.completed_at).getTime() - startTime) / (1000 * 3600);
      acc[cat].total_duration += duration;
      acc[cat].completed_jobs += 1;
    }
    return acc;
  }, {});

  const data = Object.values(grouped).map((s) => ({
    ...s,
    avg_response: s.completed_jobs > 0 ? (s.total_duration / s.completed_jobs).toFixed(1) : 0,
    resolution_rate: s.total_jobs > 0 ? ((s.completed_jobs / s.total_jobs) * 100).toFixed(1) : 0,
  }));

  const monthlyTrend = input.trendJobs.reduce<Record<string, { month: string; jobs: number; completed: number }>>((acc, job) => {
    if (!job.started_at) return acc;
    const month = format(new Date(job.started_at), "MMM yyyy");
    if (!acc[month]) acc[month] = { month, jobs: 0, completed: 0 };
    acc[month].jobs += 1;
    if (job.status === "completed") acc[month].completed += 1;
    return acc;
  }, {});

  const trends = Object.values(monthlyTrend).sort((a, b) => {
    const dateA = parse(a.month, "MMM yyyy", new Date());
    const dateB = parse(b.month, "MMM yyyy", new Date());
    return dateA.getTime() - dateB.getTime();
  });

  return { data, trends };
}

export function mapInventoryAnalytics(input: {
  transactions: StockTransactionRow[];
  inventorySummary: InventorySummaryRow[];
  trendTx: StockTransactionRow[];
}): { data: ChartRow[]; trends: ChartRow[]; lowStockCount: number } {
  const lowStockCount = input.inventorySummary.filter((item) => item.stock_status === "Low Stock").length;

  const grouped = input.transactions.reduce<Record<string, { item_name: string; received: number; issued: number }>>((acc, tx) => {
    const itemName = tx.products?.product_name || "Unknown";
    if (!acc[itemName]) {
      acc[itemName] = { item_name: itemName, received: 0, issued: 0 };
    }
    const qty = Math.abs(Number(tx.quantity));
    const type = (tx.transaction_type || "").toUpperCase();
    const isReceived = ["IN", "RECEIVE", "GRN", "RETURN"].includes(type);
    const isIssued = ["OUT", "ISSUE", "DISPATCH", "WASTE"].includes(type);
    if (isReceived) {
      acc[itemName].received += qty;
    } else if (isIssued) {
      acc[itemName].issued += qty;
    }
    return acc;
  }, {});

  const data = Object.values(grouped);

  const monthlyTrend = input.trendTx.reduce<Record<string, { month: string; received: number; issued: number }>>((acc, tx) => {
    const month = format(parseISO(tx.transaction_date), "MMM yyyy");
    if (!acc[month]) acc[month] = { month, received: 0, issued: 0 };
    const qty = Math.abs(Number(tx.quantity));
    const type = (tx.transaction_type || "").toUpperCase();
    const isReceived = ["IN", "RECEIVE", "GRN", "RETURN"].includes(type);
    const isIssued = ["OUT", "ISSUE", "DISPATCH", "WASTE"].includes(type);
    if (isReceived) acc[month].received += qty;
    else if (isIssued) acc[month].issued += qty;
    return acc;
  }, {});

  const trends = Object.values(monthlyTrend).sort((a, b) => {
    const dateA = parse(a.month, "MMM yyyy", new Date());
    const dateB = parse(b.month, "MMM yyyy", new Date());
    return dateA.getTime() - dateB.getTime();
  });

  return { data, trends, lowStockCount };
}
