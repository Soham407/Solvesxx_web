export type AlertType = "panic" | "inactivity" | "geo_fence_breach" | "checklist_incomplete" | "routine";

export interface PanicAlert {
  id: string;
  guard_id: string;
  alert_type: AlertType;
  location_id: string | null;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  alert_time: string;
  description: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  guard?: {
    guard_code: string;
    employee?: {
      first_name: string;
      last_name: string;
      phone?: string | null;
    };
  };
  location?: {
    location_name: string;
    location_code?: string;
  };
  resolver?: {
    first_name: string | null;
    last_name: string | null;
  };
}

export interface PanicAlertSubscriptionRow {
  id: string;
  guard_id: string;
  alert_type: string;
  location_id: string | null;
  photo_url?: string | null;
  latitude: number | null;
  longitude: number | null;
  alert_time: string;
  description: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at?: string | null;
  guard?: {
    guard_code: string;
    employee?: {
      first_name: string;
      last_name: string;
      phone?: string | null;
    };
  };
  location?: {
    location_name: string;
  };
}

export interface AlertStats {
  activeThreats: number;
  respondingCount: number;
  resolvedToday: number;
  totalToday: number;
}

export interface AlertFilters {
  status?: "active" | "resolved" | "all";
  type?: AlertType;
  dateFrom?: string;
  dateTo?: string;
  guardId?: string;
}

export type PanicAlertRow = {
  id: string;
  guard_id: string;
  alert_type: AlertType;
  location_id: string | null;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  alert_time: string;
  description: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  guard?: PanicAlert["guard"];
  location?: PanicAlert["location"];
};

export function mapPanicAlertRow(row: PanicAlertRow): PanicAlert {
  return {
    ...row,
    alert_type: row.alert_type,
    guard: row.guard,
    location: row.location,
  };
}

export function mapPanicAlertRows(rows: PanicAlertRow[]): PanicAlert[] {
  return rows.map(mapPanicAlertRow);
}

export function mapPanicAlertSubscriptionRow(row: PanicAlertSubscriptionRow): PanicAlert {
  return {
    id: row.id,
    guard_id: row.guard_id,
    alert_type: row.alert_type as AlertType,
    location_id: row.location_id,
    photo_url: row.photo_url ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    alert_time: row.alert_time,
    description: row.description,
    is_resolved: row.is_resolved,
    resolved_at: row.resolved_at,
    resolved_by: row.resolved_by,
    resolution_notes: row.resolution_notes,
    created_at: row.created_at ?? row.alert_time,
    guard: row.guard,
    location: row.location,
  };
}

export function buildAlertStats(input: Pick<AlertStats, "activeThreats" | "resolvedToday" | "totalToday">): AlertStats {
  return {
    activeThreats: input.activeThreats,
    respondingCount: 0,
    resolvedToday: input.resolvedToday,
    totalToday: input.totalToday,
  };
}

export function getAlertTypeLabel(type: AlertType): string {
  const labels: Record<AlertType, string> = {
    panic: "Panic/SOS",
    inactivity: "Inactivity",
    geo_fence_breach: "Geo-fence Breach",
    checklist_incomplete: "Checklist Missed",
    routine: "Routine",
  };
  return labels[type] || type;
}

export function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just Now";
  if (diffMins < 60) return `${diffMins} mins ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
}
