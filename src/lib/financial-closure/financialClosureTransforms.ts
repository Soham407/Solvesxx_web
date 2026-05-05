export type FinancialPeriodType = "monthly" | "quarterly" | "yearly";
export type FinancialPeriodStatus = "open" | "closing" | "closed";

export interface FinancialPeriod {
  id: string;
  period_name: string;
  period_type: FinancialPeriodType;
  start_date: string;
  end_date: string;
  status: FinancialPeriodStatus;
  closed_at: string | null;
  closed_by: string | null;
  closing_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function selectCurrentFinancialPeriod(periods: FinancialPeriod[], today: string = new Date().toISOString().split("T")[0]) {
  return (
    periods.find((period) => period.status === "open" && today >= period.start_date && today <= period.end_date) ||
    periods.find((period) => period.status === "open") ||
    null
  );
}
