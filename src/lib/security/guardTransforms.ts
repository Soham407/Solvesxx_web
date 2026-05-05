export type GuardGrade = "A" | "B" | "C" | "D";

export interface SecurityGuard {
  id: string;
  employee_id: string;
  guard_code: string;
  grade: GuardGrade;
  is_armed: boolean;
  license_number: string | null;
  license_expiry: string | null;
  assigned_location_id: string | null;
  shift_timing: string | null;
  is_active: boolean;
  created_at: string;
  employee?: {
    first_name: string;
    last_name: string;
    employee_code?: string | null;
    phone: string;
    photo_url: string | null;
    auth_user_id?: string | null;
  };
  assigned_location?: {
    location_name: string;
    location_code: string;
    latitude: number | null;
    longitude: number | null;
    geo_fence_radius: number | null;
  };
  lastLocation?: GuardLocation;
  attendance?: {
    check_in_time: string | null;
    check_out_time: string | null;
    status: string;
  };
  currentShift?: {
    id: string;
    shift_name: string;
  } | null;
}

export interface GuardLocation {
  id: string;
  employee_id: string;
  latitude: number;
  longitude: number;
  tracked_at: string;
  battery_level: number | null;
  is_mock_location: boolean | null;
  accuracy_meters: number | null;
  speed_kmh: number | null;
  heading_degrees: number | null;
}

export interface GuardStats {
  totalGuards: number;
  activeOnDuty: number;
  inactiveAlerts: number;
  geoFenceBreaches: number;
}

export interface GuardFilters {
  status?: "all" | "on_duty" | "off_duty";
  grade?: GuardGrade;
  locationId?: string;
}

export interface SecurityGuardRow {
  id: string;
  employee_id: string;
  guard_code: string;
  grade: GuardGrade;
  is_armed: boolean | null;
  license_number: string | null;
  license_expiry: string | null;
  assigned_location_id: string | null;
  shift_timing: string | null;
  is_active: boolean | null;
  created_at: string | null;
  employee: SecurityGuard["employee"] | null;
}

export interface CompanyLocationRow {
  id: string;
  location_name: string;
  location_code: string;
  latitude: number | null;
  longitude: number | null;
  geo_fence_radius: number | null;
}

export interface ShiftAssignmentRow {
  employee_id: string;
  shifts: { id: string; shift_name: string } | { id: string; shift_name: string }[] | null;
}

export function mapSecurityGuardRow(
  row: SecurityGuardRow,
  location?: CompanyLocationRow,
): SecurityGuard {
  return {
    id: row.id,
    employee_id: row.employee_id,
    guard_code: row.guard_code,
    grade: row.grade,
    is_armed: row.is_armed ?? false,
    license_number: row.license_number,
    license_expiry: row.license_expiry,
    assigned_location_id: row.assigned_location_id,
    shift_timing: row.shift_timing,
    is_active: row.is_active ?? false,
    created_at: row.created_at ?? "",
    employee: row.employee ?? undefined,
    assigned_location: location
      ? {
          location_name: location.location_name,
          location_code: location.location_code,
          latitude: location.latitude,
          longitude: location.longitude,
          geo_fence_radius: location.geo_fence_radius,
        }
      : undefined,
  };
}

export function buildGuardStats(counts: {
  totalGuards: number | null;
  activeOnDuty: number | null;
  inactiveAlerts: number | null;
  geoFenceBreaches: number | null;
}): GuardStats {
  return {
    totalGuards: counts.totalGuards || 0,
    activeOnDuty: counts.activeOnDuty || 0,
    inactiveAlerts: counts.inactiveAlerts || 0,
    geoFenceBreaches: counts.geoFenceBreaches || 0,
  };
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radius = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return radius * c;
}

export function isWithinGeoFence(guard: SecurityGuard, location: GuardLocation): boolean {
  if (!guard.assigned_location?.latitude || !guard.assigned_location?.longitude) {
    return true;
  }

  const radius = guard.assigned_location.geo_fence_radius || 50;
  const distance = calculateDistance(
    guard.assigned_location.latitude,
    guard.assigned_location.longitude,
    location.latitude,
    location.longitude,
  );

  return distance <= radius;
}

export function getGuardStatus(
  guard: SecurityGuard,
  getLocationForGuard: (guard: Pick<SecurityGuard, "id" | "employee_id">) => GuardLocation | undefined,
): { label: string; color: string } {
  if (!guard.attendance?.check_in_time) {
    return { label: "Off Duty", color: "text-muted-foreground" };
  }

  if (guard.attendance?.check_out_time) {
    return { label: "Shift Ended", color: "text-muted-foreground" };
  }

  const location = getLocationForGuard(guard);
  if (!location) {
    return { label: "No GPS Signal", color: "text-warning" };
  }

  const lastUpdate = new Date(location.tracked_at);
  const minutesAgo = (Date.now() - lastUpdate.getTime()) / 60000;

  if (minutesAgo > 30) {
    return { label: "Inactive", color: "text-critical" };
  }

  if (!isWithinGeoFence(guard, location)) {
    return { label: "Outside Geo-fence", color: "text-warning" };
  }

  return { label: "Active", color: "text-success" };
}

export function getBatteryStatus(
  guard: SecurityGuard,
  getLocationForGuard: (guard: Pick<SecurityGuard, "id" | "employee_id">) => GuardLocation | undefined,
): { level: number | null; color: string } {
  const location = getLocationForGuard(guard);
  if (!location?.battery_level) {
    return { level: null, color: "text-muted-foreground" };
  }

  if (location.battery_level < 20) {
    return { level: location.battery_level, color: "text-critical" };
  }

  if (location.battery_level < 50) {
    return { level: location.battery_level, color: "text-warning" };
  }

  return { level: location.battery_level, color: "text-success" };
}
