export interface Visitor {
  id: string;
  visitor_name: string;
  visitor_type:
    | "guest"
    | "vendor"
    | "contractor"
    | "service_staff"
    | "daily_helper";
  phone: string | null;
  vehicle_number: string | null;
  photo_url: string | null;
  flat_id: string | null;
  resident_id: string | null;
  purpose: string | null;
  entry_time: string;
  exit_time: string | null;
  entry_guard_id: string | null;
  exit_guard_id: string | null;
  entry_location_id: string | null;
  approved_by_resident: boolean | null;
  rejection_reason: string | null;
  bypass_reason: string | null;
  visitor_pass_number: string | null;
  is_frequent_visitor: boolean;
  created_at: string;
  flat?: {
    flat_number: string;
    building?: {
      building_name: string;
    };
  };
  resident?: {
    full_name: string;
    phone: string;
  };
  entry_guard?: {
    guard_code: string;
    employee?: {
      first_name: string;
      last_name: string;
    };
  };
}

export interface VisitorStats {
  activeVisitors: number;
  todayTotal: number;
  preApproved: number;
  deniedEntry: number;
}

export interface CreateVisitorDTO {
  visitor_name: string;
  visitor_type: string;
  phone?: string;
  vehicle_number?: string;
  photo_url?: string;
  flat_id?: string;
  resident_id?: string;
  purpose?: string;
  entry_guard_id?: string;
  entry_location_id?: string;
  is_frequent_visitor?: boolean;
  bypass_reason?: string;
  approval_required?: boolean;
}

export interface VisitorFilters {
  status?: "active" | "completed" | "all";
  type?: string;
  flatId?: string;
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
  societyId?: string;
}

export type VisitorRpcResult =
  | {
      success?: boolean;
      error?: string;
      visitor?: Visitor | null;
      passNumber?: string;
    }
  | null;

export function buildVisitorCollections(visitors: Visitor[]) {
  return {
    activeVisitors: visitors.filter((visitor) => !visitor.exit_time),
    dailyHelpers: visitors.filter(
      (visitor) => visitor.is_frequent_visitor || visitor.visitor_type === "daily_helper",
    ),
  };
}

export function buildVisitorStats(counts: {
  activeVisitors: number | null;
  todayTotal: number | null;
  preApproved: number | null;
  deniedEntry: number | null;
}): VisitorStats {
  return {
    activeVisitors: counts.activeVisitors || 0,
    todayTotal: counts.todayTotal || 0,
    preApproved: counts.preApproved || 0,
    deniedEntry: counts.deniedEntry || 0,
  };
}

export function normalizeVisitorRows(rows: unknown): Visitor[] {
  return Array.isArray(rows) ? (rows as Visitor[]) : [];
}
