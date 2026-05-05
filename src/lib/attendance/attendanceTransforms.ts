export type AttendanceDisplayStatus =
  | "Present"
  | "Late"
  | "On Leave"
  | "Absent";

export interface PersonalAttendanceHistoryRecord {
  id: string;
  rawDate: string;
  logDate: string;
  checkIn: string;
  checkOut: string;
  checkInTimestamp: string | null;
  checkOutTimestamp: string | null;
  shift: string;
  status: AttendanceDisplayStatus;
  verification: string;
  hoursWorked: string;
}

export interface AdminAttendanceOverviewRecord {
  id: string;
  employee: string;
  employeeId: string;
  shift: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  standardHours: number;
  checkIn: string;
  checkOut?: string;
  checkInTimestamp: string | null;
  checkOutTimestamp: string | null;
  overtimeHours: number;
  location: string;
  verification: string;
  status: AttendanceDisplayStatus;
  latitude?: number;
  longitude?: number;
  selfie_url?: string | null;
}

type MaybeRelation<T> = T | T[] | null | undefined;

export type AttendanceShiftDetails = {
  id?: string;
  shift_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  duration_hours?: number | string | null;
  grace_time_minutes?: number | string | null;
  is_night_shift?: boolean | null;
};

export type AttendanceShiftRelation = {
  shifts?: AttendanceShiftDetails | AttendanceShiftDetails[] | null;
};

export type AttendanceEmployeeRelation = {
  first_name?: string | null;
  last_name?: string | null;
  employee_code?: string | null;
  employee_shift_assignments?: AttendanceShiftRelation | AttendanceShiftRelation[] | null;
};

export type AttendanceLogRow = {
  id?: string;
  employee_id?: string;
  log_date?: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  check_in_selfie_url?: string | null;
  check_in_latitude?: number | null;
  check_in_longitude?: number | null;
  check_in_location_id?: string | null;
  check_out_latitude?: number | null;
  check_out_longitude?: number | null;
  status?: string | null;
  total_hours?: number | string | null;
  employees?: AttendanceEmployeeRelation | AttendanceEmployeeRelation[] | null;
};

export type AttendanceAssignmentRow = {
  employee_id: string;
  shifts?: AttendanceShiftDetails | AttendanceShiftDetails[] | null;
};

export type CompanyLocationRow = {
  id: string;
  latitude: number | null;
  longitude: number | null;
  geo_fence_radius: number | null;
};

export interface PersonalAttendanceStats {
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendancePct: number;
}

export interface AdminAttendanceStats {
  onDuty: number;
  absent: number;
  avgPunchIn: string;
  lateArrivals: number;
}

export interface AttendanceShiftSummary {
  id: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  standard_hours?: number;
  is_night_shift: boolean;
}

export interface TodayAttendanceSnapshot {
  log_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_selfie_url?: string | null;
  check_in_latitude?: number | null;
  check_in_longitude?: number | null;
  check_out_latitude?: number | null;
  check_out_longitude?: number | null;
}

function readSingleRelation<T>(value: MaybeRelation<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function readShiftDetails(shiftData: AttendanceShiftRelation | null | undefined): AttendanceShiftDetails | null {
  const shifts = shiftData?.shifts;
  if (!shifts) return null;
  return Array.isArray(shifts) ? shifts[0] ?? null : shifts;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  return haversineDistance(lat1, lon1, lat2, lon2);
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function mapAttendanceStatus(status?: string | null): AttendanceDisplayStatus {
  if (status === "late") return "Late";
  if (
    status === "on_leave" ||
    status === "leave" ||
    status === "paid_leave" ||
    status === "unpaid_leave" ||
    status === "sick_leave" ||
    status === "casual_leave" ||
    status === "earned_leave"
  ) {
    return "On Leave";
  }
  if (status === "absent" || status === "absent_breach") return "Absent";
  return "Present";
}

export function formatAttendanceTime(timestamp?: string | null): string {
  if (!timestamp) return "-";

  return new Date(timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatAttendanceDate(logDate: string): string {
  return new Date(logDate).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatHoursWorked(
  checkInTime?: string | null,
  checkOutTime?: string | null,
): string {
  if (!checkInTime || !checkOutTime) return "-";

  const durationMs =
    new Date(checkOutTime).getTime() - new Date(checkInTime).getTime();
  const hours = Math.floor(durationMs / 3600000);
  const minutes = Math.floor((durationMs % 3600000) / 60000);

  return `${hours}h ${minutes}m`;
}

export function resolveTotalHours(log: {
  total_hours?: number | string | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
}): number | null {
  const rawTotalHours = log.total_hours;
  if (rawTotalHours !== null && rawTotalHours !== undefined) {
    const parsed = Number(rawTotalHours);
    if (Number.isFinite(parsed)) return parsed;
  }

  if (!log.check_in_time || !log.check_out_time) return null;

  const durationMs =
    new Date(log.check_out_time).getTime() - new Date(log.check_in_time).getTime();
  const derivedHours = durationMs / 3600000;

  return Number.isFinite(derivedHours) ? derivedHours : null;
}

export function calculateOvertimeHours(
  totalHours: number | null,
  standardHours: number,
): number {
  if (totalHours === null) return 0;
  return Math.max(0, Number(totalHours) - standardHours);
}

function formatShiftLabel(shiftData: AttendanceShiftRelation | null | undefined): string {
  const shift = readShiftDetails(shiftData);
  if (!shift) return "General Shift";

  const startTime = String(shift.start_time || "").slice(0, 5);
  const endTime = String(shift.end_time || "").slice(0, 5);

  return `${shift.shift_name} (${startTime}-${endTime})`;
}

export function resolveAttendanceShiftSummary(
  shiftData: AttendanceShiftRelation | null | undefined,
): AttendanceShiftSummary | null {
  const shift = readShiftDetails(shiftData);
  if (!shift) return null;

  return {
    id: shift.id ?? "",
    shift_name: shift.shift_name ?? "General Shift",
    start_time: shift.start_time ?? "",
    end_time: shift.end_time ?? "",
    duration_hours: Number(shift.duration_hours) || 8,
    standard_hours: undefined,
    is_night_shift: Boolean(shift.is_night_shift),
  };
}

export function buildTodayAttendanceSnapshot(
  attendance: {
    log_date: string;
    check_in_time?: string | null;
    check_out_time?: string | null;
    check_in_selfie_url?: string | null;
    check_in_latitude?: number | null;
    check_in_longitude?: number | null;
    check_out_latitude?: number | null;
    check_out_longitude?: number | null;
  } | null,
): TodayAttendanceSnapshot | null {
  if (!attendance) return null;

  return {
    log_date: attendance.log_date,
    check_in_time: attendance.check_in_time ?? null,
    check_out_time: attendance.check_out_time ?? null,
    check_in_selfie_url: attendance.check_in_selfie_url ?? null,
    check_in_latitude: attendance.check_in_latitude ?? null,
    check_in_longitude: attendance.check_in_longitude ?? null,
    check_out_latitude: attendance.check_out_latitude ?? null,
    check_out_longitude: attendance.check_out_longitude ?? null,
  };
}

export function isWithinGeoFence(
  currentLatitude: number,
  currentLongitude: number,
  gateLatitude: number,
  gateLongitude: number,
  radiusMeters: number,
): { isWithinRange: boolean; distance: number } {
  const distance = calculateDistanceMeters(currentLatitude, currentLongitude, gateLatitude, gateLongitude);
  return {
    isWithinRange: distance <= radiusMeters,
    distance: Math.round(distance),
  };
}

function getPersonalVerificationLabel(log: AttendanceLogRow): string {
  const hasSelfie = Boolean(log.check_in_selfie_url);
  const hasGps =
    log.check_in_latitude !== null &&
    log.check_in_latitude !== undefined &&
    log.check_in_longitude !== null &&
    log.check_in_longitude !== undefined;

  if (hasSelfie && hasGps) return "Selfie + GPS";
  if (hasSelfie) return "Selfie Only";
  if (hasGps) return "GPS Only";
  if (log.check_in_time) return "Manual";
  return "-";
}

function resolveAdminAttendanceVerification(
  log: AttendanceLogRow,
  siteCoords?: {
    lat: number;
    lng: number;
    radiusMeters: number;
  } | null,
): Pick<AdminAttendanceOverviewRecord, "location" | "verification"> {
  const hasGps =
    log.check_in_latitude !== null &&
    log.check_in_latitude !== undefined &&
    log.check_in_longitude !== null &&
    log.check_in_longitude !== undefined;
  const hasSelfie = Boolean(log.check_in_selfie_url);

  if (!siteCoords && hasGps) {
    return {
      location: "GPS Captured",
      verification: "Location Not Configured",
    };
  }

  if (hasGps && siteCoords) {
    const distance = haversineDistance(
      Number(log.check_in_latitude),
      Number(log.check_in_longitude),
      siteCoords.lat,
      siteCoords.lng,
    );

    if (distance > siteCoords.radiusMeters) {
      return {
        location: `Off-Site (${Math.round(distance)}m away)`,
        verification: hasSelfie ? "Remote + Selfie" : "Remote",
      };
    }

    return {
      location: "GPS Verified",
      verification: hasSelfie ? "Selfie + GPS" : "GPS Only",
    };
  }

  if (log.check_in_time) {
    return {
      location: "Manual Entry",
      verification: "Manual",
    };
  }

  return {
    location: "Pending",
    verification: "Pending",
  };
}

export function mapPersonalAttendanceHistory(
  attendanceLogs: AttendanceLogRow[],
  shiftData: AttendanceShiftRelation | null | undefined,
): PersonalAttendanceHistoryRecord[] {
  const shiftLabel = formatShiftLabel(shiftData);

  return attendanceLogs.map((log) => ({
    id: log.id ?? "",
    rawDate: log.log_date ?? "",
    logDate: log.log_date ? formatAttendanceDate(log.log_date) : "",
    checkIn: formatAttendanceTime(log.check_in_time),
    checkOut: formatAttendanceTime(log.check_out_time),
    checkInTimestamp: log.check_in_time ?? null,
    checkOutTimestamp: log.check_out_time ?? null,
    shift: shiftLabel,
    status: mapAttendanceStatus(log.status),
    verification: getPersonalVerificationLabel(log),
    hoursWorked: formatHoursWorked(log.check_in_time, log.check_out_time),
  }));
}

export function mapAdminAttendanceOverview(
  attendanceData: AttendanceLogRow[],
  shiftData: AttendanceAssignmentRow[],
  locations: CompanyLocationRow[],
): AdminAttendanceOverviewRecord[] {
  const shiftMap: Record<string, { label: string; name: string; hours: number; start: string; end: string }> = {};

  shiftData.forEach((assignment) => {
    const shift = Array.isArray(assignment.shifts) ? assignment.shifts[0] : assignment.shifts;
    if (shift) {
      shiftMap[assignment.employee_id] = {
        label: formatShiftLabel({ shifts: shift }),
        name: shift.shift_name ?? "General Shift",
        hours: Number(shift.duration_hours) || 8,
        start: shift.start_time ?? "09:00:00",
        end: shift.end_time ?? "18:00:00",
      };
    }
  });

  const locationsMap = locations.reduce<
    Record<string, { lat: number; lng: number; radiusMeters: number }>
  >((acc, location) => {
    if (
      location.latitude !== null &&
      location.latitude !== undefined &&
      location.longitude !== null &&
      location.longitude !== undefined
    ) {
      acc[location.id] = {
        lat: Number(location.latitude),
        lng: Number(location.longitude),
        radiusMeters: Number(location.geo_fence_radius) || 50,
      };
    }
    return acc;
  }, {});

  return attendanceData.map((log) => {
    const employee = readSingleRelation(log.employees) || {};
    const fullName =
      `${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
      "Unknown";

    const shiftInfo = log.employee_id ? shiftMap[log.employee_id] : undefined;
    const fallbackShift = {
      label: "General Shift",
      name: "General Shift",
      hours: 8,
      start: "09:00:00",
      end: "18:00:00",
    };
    const currentShift = shiftInfo || fallbackShift;

    const verificationDetails = resolveAdminAttendanceVerification(
      log,
      log.check_in_location_id
        ? locationsMap[log.check_in_location_id] || null
        : null,
    );
    const totalHours = resolveTotalHours(log);
    const overtimeHours = calculateOvertimeHours(totalHours, currentShift.hours);

    return {
      id: log.id ?? "",
      employee: fullName,
      employeeId: log.employee_id ?? "",
      shift: currentShift.label,
      shiftName: currentShift.name,
      startTime: currentShift.start,
      endTime: currentShift.end,
      standardHours: currentShift.hours,
      checkIn: formatAttendanceTime(log.check_in_time),
      checkOut: log.check_out_time ? formatAttendanceTime(log.check_out_time) : undefined,
      checkInTimestamp: log.check_in_time ?? null,
      checkOutTimestamp: log.check_out_time ?? null,
      overtimeHours,
      location: verificationDetails.location,
      verification: verificationDetails.verification,
      status: mapAttendanceStatus(log.status),
      latitude: log.check_in_latitude ?? undefined,
      longitude: log.check_in_longitude ?? undefined,
      selfie_url: log.check_in_selfie_url ?? null,
    };
  });
}

export function buildPersonalAttendanceStats(
  records: PersonalAttendanceHistoryRecord[],
): PersonalAttendanceStats {
  const total = records.length;
  const present = records.filter((record) => record.status === "Present" || record.status === "Late").length;
  const absent = records.filter((record) => record.status === "Absent").length;
  const late = records.filter((record) => record.status === "Late").length;

  return {
    presentDays: present,
    absentDays: absent,
    lateDays: late,
    attendancePct: total > 0 ? Math.round((present / total) * 100) : 0,
  };
}

export function buildAdminAttendanceStats(
  records: AdminAttendanceOverviewRecord[],
): AdminAttendanceStats {
  const onDuty = records.filter((record) => record.status === "Present" || record.status === "Late").length;
  const absent = records.filter((record) => record.status === "Absent").length;
  const lateArrivals = records.filter((record) => record.status === "Late").length;
  const punchIns = records
    .map((record) => record.checkInTimestamp)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  const avgPunchIn =
    punchIns.length > 0
      ? new Date(punchIns.reduce((sum, value) => sum + value, 0) / punchIns.length).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "--:--";

  return {
    onDuty,
    absent,
    avgPunchIn,
    lateArrivals,
  };
}
