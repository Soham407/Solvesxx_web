export type AdBookingStatus = "pending" | "approved" | "active" | "completed" | "cancelled";

export interface AdBooking {
  id: string;
  booking_number: string;
  ad_space_id: string;
  advertiser_name: string;
  start_date: string;
  end_date: string;
  agreed_rate_paise: number;
  creative_url: string | null;
  status: AdBookingStatus;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const AD_BOOKING_STATUS_CONFIG: Record<AdBookingStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning/10 text-warning border-warning/20" },
  approved: { label: "Approved", className: "bg-info/10 text-info border-info/20" },
  active: { label: "Active", className: "bg-success/10 text-success border-success/20" },
  completed: { label: "Completed", className: "bg-muted/50 text-muted-foreground border-border" },
  cancelled: { label: "Cancelled", className: "bg-critical/10 text-critical border-critical/20" },
};

export type AdBookingRow = Omit<AdBooking, "status"> & {
  status: string | null;
};

export function normalizeAdBookingStatus(status: string | null | undefined): AdBookingStatus {
  if (
    status === "pending" ||
    status === "approved" ||
    status === "active" ||
    status === "completed" ||
    status === "cancelled"
  ) {
    return status;
  }

  return "pending";
}

export function mapAdBookingRow(row: AdBookingRow): AdBooking {
  return {
    ...row,
    status: normalizeAdBookingStatus(row.status),
  };
}
