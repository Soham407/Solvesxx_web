export type PayrollCycleStatus =
  | "draft"
  | "processing"
  | "computed"
  | "approved"
  | "disbursed"
  | "cancelled";

export type PayslipStatus =
  | "draft"
  | "computed"
  | "approved"
  | "processed"
  | "disputed";

export const CYCLE_STATUS_CONFIG: Record<PayrollCycleStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  processing: { label: "Processing", className: "bg-info/10 text-info border-info/20 animate-pulse" },
  computed: { label: "Computed", className: "bg-warning/10 text-warning border-warning/20" },
  approved: { label: "Approved", className: "bg-primary/10 text-primary border-primary/20" },
  disbursed: { label: "Disbursed", className: "bg-success/10 text-success border-success/20" },
  cancelled: { label: "Cancelled", className: "bg-critical/10 text-critical border-critical/20" },
};

export const PAYSLIP_STATUS_CONFIG: Record<PayslipStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  computed: { label: "Computed", className: "bg-warning/10 text-warning border-warning/20" },
  approved: { label: "Approved", className: "bg-primary/10 text-primary border-primary/20" },
  processed: { label: "Processed", className: "bg-success/10 text-success border-success/20" },
  disputed: { label: "Disputed", className: "bg-critical/10 text-critical border-critical/20" },
};

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function getCycleDisplayName(periodMonth: number, periodYear: number): string {
  return `${MONTH_NAMES[periodMonth - 1]} ${periodYear}`;
}
