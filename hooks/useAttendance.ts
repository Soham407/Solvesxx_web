"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { MAIN_GATE_CODE } from "@/src/lib/constants";
import { SYSTEM_CONFIG_DEFAULTS } from "@/src/lib/platform/system-config";
import {
  buildAdminAttendanceStats,
  buildPersonalAttendanceStats,
  buildTodayAttendanceSnapshot,
  calculateDistanceMeters,
  isWithinGeoFence,
  mapAdminAttendanceOverview,
  mapPersonalAttendanceHistory,
  resolveAttendanceShiftSummary,
} from "@/src/lib/attendance/attendanceTransforms";

export {
  buildAdminAttendanceStats,
  buildPersonalAttendanceStats,
  calculateDistanceMeters,
} from "@/src/lib/attendance/attendanceTransforms";

interface GateLocation {
  id: string;
  latitude: number;
  longitude: number;
  geo_fence_radius: number;
  location_name: string;
}

interface AttendanceState {
  isWithinRange: boolean;
  distance: number | null;
  isLoading: boolean;
  error: string | null;
  gateLocation: GateLocation | null;
  currentPosition: { latitude: number; longitude: number } | null;
  isClockedIn: boolean;
  activeShift: {
    id: string;
    shift_name: string;
    start_time: string;
    end_time: string;
    duration_hours: number;
    standard_hours?: number;
    is_night_shift: boolean;
  } | null;
  todayAttendance: {
    log_date: string;
    check_in_time: string | null;
    check_out_time: string | null;
    check_in_selfie_url?: string | null;
    check_in_latitude?: number | null;
    check_in_longitude?: number | null;
    check_out_latitude?: number | null;
    check_out_longitude?: number | null;
  } | null;
}

type ShiftDetails = {
  id?: string;
  shift_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  duration_hours?: number | string | null;
  grace_time_minutes?: number | string | null;
  is_night_shift?: boolean | null;
};

type ShiftRelation = {
  shifts?: ShiftDetails | ShiftDetails[] | null;
};

type AttendanceEmployeeRelation = {
  first_name?: string | null;
  last_name?: string | null;
  employee_code?: string | null;
  employee_shift_assignments?: ShiftRelation | ShiftRelation[] | null;
};

type AttendanceLogRow = {
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

type AttendanceAssignmentRow = {
  employee_id: string;
  shifts?: ShiftDetails | ShiftDetails[] | null;
};

type CompanyLocationRow = {
  id: string;
  latitude: number | null;
  longitude: number | null;
  geo_fence_radius: number | null;
};

type SystemConfigRow = {
  value: string | number | null;
};

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

function mapAttendanceStatus(status?: string | null): AttendanceDisplayStatus {
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

function formatAttendanceTime(timestamp?: string | null): string {
  if (!timestamp) return "-";

  return new Date(timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAttendanceDate(logDate: string): string {
  return new Date(logDate).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatHoursWorked(
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

function resolveTotalHours(log: {
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

function calculateOvertimeHours(
  totalHours: number | null,
  standardHours: number,
): number {
  if (totalHours === null) return 0;
  return Math.max(0, Number(totalHours) - standardHours);
}

function formatShiftLabel(shiftData: ShiftRelation | null | undefined): string {
  const shifts = shiftData?.shifts;
  if (!shifts) return "General Shift";

  const shift = Array.isArray(shifts) ? shifts[0] : shifts;
  if (!shift) return "General Shift";

  const startTime = String(shift.start_time || "").slice(0, 5);
  const endTime = String(shift.end_time || "").slice(0, 5);

  return `${shift.shift_name} (${startTime}-${endTime})`;
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
    const distance = calculateDistanceMeters(
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

export async function getEmployeeAttendanceHistory(
  employeeId: string,
): Promise<PersonalAttendanceHistoryRecord[]> {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const since = new Date(today);
  since.setDate(since.getDate() - 30);
  const sinceStr = since.toISOString().split("T")[0];

  const [
    { data: attendanceLogs, error: attendanceError },
    { data: shiftData, error: shiftError },
  ] = await Promise.all([
    supabase
      .from("attendance_logs")
      .select(
        `
          id,
          log_date,
          check_in_time,
          check_out_time,
          check_in_selfie_url,
          check_in_latitude,
          check_in_longitude,
          status
        `,
      )
      .eq("employee_id", employeeId)
      .gte("log_date", sinceStr)
      .lte("log_date", todayStr)
      .order("log_date", { ascending: false }),
    supabase
      .from("employee_shift_assignments")
      .select("shifts ( shift_name, start_time, end_time )")
      .eq("employee_id", employeeId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle(),
  ]);

  if (attendanceError) throw attendanceError;
  if (shiftError && shiftError.code !== "PGRST116") throw shiftError;

  return mapPersonalAttendanceHistory((attendanceLogs || []) as AttendanceLogRow[], shiftData);
}

export async function getAdminAttendanceOverview(
  logDate?: string,
): Promise<AdminAttendanceOverviewRecord[]> {
  const targetDate = logDate || new Date().toISOString().split("T")[0];

  const { data: attendanceData, error: attendanceError } = await supabase
    .from("attendance_logs")
    .select(
      `
        id,
        employee_id,
        check_in_time,
        check_out_time,
        check_in_latitude,
        check_in_longitude,
        check_in_selfie_url,
        check_in_location_id,
        status,
        total_hours,
        employees:employee_id (
          first_name,
          last_name,
          employee_code
        )
      `,
    )
    .eq("log_date", targetDate)
    .order("check_in_time", { ascending: false });

  if (attendanceError) throw attendanceError;

  const employeeIds = (attendanceData || []).map((entry: AttendanceLogRow) => entry.employee_id);
  let shiftData: AttendanceAssignmentRow[] = [];
  let allLocations: CompanyLocationRow[] = [];

  if (employeeIds.length > 0) {
    const { data: shiftRows, error: shiftError } = await supabase
      .from("employee_shift_assignments")
      .select(
        `
          employee_id,
          shifts (
            shift_name,
            start_time,
            end_time,
            duration_hours
          )
        `,
      )
      .eq("is_active", true)
      .in("employee_id", employeeIds);

    if (shiftError) throw shiftError;

    const { data: locationRows, error: locationsError } = await supabase
      .from("company_locations")
      .select("id, latitude, longitude, geo_fence_radius")
      .eq("is_active", true);

    if (locationsError) throw locationsError;
    shiftData = (shiftRows || []) as AttendanceAssignmentRow[];
    allLocations = (locationRows || []) as CompanyLocationRow[];
  }

  return mapAdminAttendanceOverview(
    (attendanceData || []) as AttendanceLogRow[],
    shiftData,
    allLocations,
  );
}

export function useAttendance(employeeId?: string, guardId?: string | null) {
  const { role, userId } = useAuth();
  const [state, setState] = useState<AttendanceState>({
    isWithinRange: false,
    distance: null,
    isLoading: true,
    error: null,
    gateLocation: null,
    currentPosition: null,
    isClockedIn: false,
    activeShift: null,
    todayAttendance: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const gpsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const latestPositionRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Fetch gate location from company_locations
  const fetchGateLocation = useCallback(async () => {
    try {
      let defaultGeoFenceRadius = Number(
        SYSTEM_CONFIG_DEFAULTS.default_geo_fence_radius_meters
      );

      const { data: configData, error: configError } = await supabase
        .from("system_config")
      .select("value")
      .eq("key", "default_geo_fence_radius_meters")
      .maybeSingle();

      if (!configError && configData?.value) {
        const parsedRadius = Number(configData.value);
        if (Number.isFinite(parsedRadius) && parsedRadius > 0) {
          defaultGeoFenceRadius = parsedRadius;
        }
      }

      const { data, error } = await supabase
        .from("company_locations")
        .select("id, latitude, longitude, geo_fence_radius, location_name")
        .eq("location_code", MAIN_GATE_CODE)
        .single();

      if (error) throw error;

      if (data) {
        setState((prev) => ({
          ...prev,
          gateLocation: {
            id: data.id,
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            geo_fence_radius:
              Number(data.geo_fence_radius) || defaultGeoFenceRadius,
            location_name: data.location_name,
          },
        }));
      }
    } catch (err: unknown) {
      console.error("Error fetching gate location:", err);
      setState((prev) => ({
        ...prev,
        error: "Failed to fetch gate location",
        isLoading: false,
      }));
    }
  }, []);

  // Fetch today's attendance record and active shift
  const fetchTodayAttendance = useCallback(async () => {
    // Security: Non-admins can only view their own attendance
    const effectiveEmployeeId = (role === 'admin' || role === 'super_admin' || role === 'society_manager') 
      ? employeeId 
      : (employeeId || userId);

    if (!effectiveEmployeeId) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      
      const [attendanceRes, shiftRes] = await Promise.all([
        supabase
          .from("attendance_logs")
          .select("*")
          .eq("employee_id", effectiveEmployeeId)
          .eq("log_date", today)
          .maybeSingle(),
        supabase
          .from("employee_shift_assignments")
          .select(`
            shift_id,
            shifts (
              id,
              shift_name,
              start_time,
              end_time,
              duration_hours,
              is_night_shift
            )
          `)
          .eq("employee_id", effectiveEmployeeId)
          .eq("is_active", true)
          .maybeSingle()
      ]);

      if (attendanceRes.error && attendanceRes.error.code !== "PGRST116") {
        throw attendanceRes.error;
      }

      const activeShift = resolveAttendanceShiftSummary(shiftRes.data?.shifts as ShiftRelation | null | undefined);

      setState((prev) => ({
        ...prev,
        activeShift,
        todayAttendance: buildTodayAttendanceSnapshot(attendanceRes.data),
        isClockedIn:
          attendanceRes.data?.check_in_time && !attendanceRes.data?.check_out_time ? true : false,
      }));
    } catch (err: unknown) {
      console.error("Error fetching attendance/shift:", err);
    }
  }, [employeeId, role, userId]);

  // Get current browser/device location
  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by this browser",
        isLoading: false,
      }));
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // Update ref for GPS tracking to avoid stale closures
        latestPositionRef.current = { latitude, longitude };

        setState((prev) => {
          if (!prev.gateLocation) {
            return {
              ...prev,
              currentPosition: { latitude, longitude },
              isLoading: false,
            };
          }

          const { distance, isWithinRange } = isWithinGeoFence(
            latitude,
            longitude,
            prev.gateLocation.latitude,
            prev.gateLocation.longitude,
            prev.gateLocation.geo_fence_radius,
          );

          return {
            ...prev,
            currentPosition: { latitude, longitude },
            distance: Math.round(distance),
            isWithinRange,
            isLoading: false,
            error: null,
          };
        });
      },
      (error) => {
        let errorMessage = "Failed to get your location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable GPS.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }));
      },
      options,
    );
  }, []);

  // Clock In action with shift enforcement and selfie evidence
  const clockIn = useCallback(
    async (
      selfieUrl?: string,
    ): Promise<{ success: boolean; error?: string }> => {
      if (!employeeId || !state.gateLocation) {
        return { success: false, error: "Location requirements not met" };
      }

      if (!state.currentPosition) {
        return {
          success: false,
          error:
            "Live GPS location is required to clock in. Please enable location access and wait for a position fix.",
        };
      }

      if (!state.isWithinRange) {
        return { success: false, error: "You must be within the facility area to clock in" };
      }

      if (!selfieUrl) {
        return {
          success: false,
          error: "Selfie capture is mandatory for check-in",
        };
      }

      try {
        // Step 1: Check if guard has an active shift assignment
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("employee_shift_assignments")
          .select(
            `
          id,
          shift_id,
          shifts (
            id,
            shift_name,
            start_time,
            end_time,
            grace_time_minutes,
            is_night_shift
          )
        `,
          )
          .eq("employee_id", employeeId)
          .eq("is_active", true)
          .single();

        if (assignmentError && assignmentError.code !== "PGRST116") {
          throw assignmentError;
        }

        // Step 2: If no shift assigned, allow clock-in but log warning
        let shiftValidation = { isValid: true, message: "" };

        if (assignmentData && assignmentData.shifts) {
          const shiftsArray = Array.isArray(assignmentData.shifts)
            ? assignmentData.shifts
            : [assignmentData.shifts];
          const shift = shiftsArray[0] as {
            id: string;
            shift_name: string;
            start_time: string;
            end_time: string;
            grace_time_minutes: number | null;
            is_night_shift: boolean | null;
          };

          if (!shift) return { success: true }; // Should not happen given the if check

          const now = new Date();
          const currentHours = now.getHours();
          const currentMinutes = now.getMinutes();
          const currentTotalMinutes = currentHours * 60 + currentMinutes;

          // Parse shift times (format: "HH:MM:SS")
          const [startH, startM] = shift.start_time.split(":").map(Number);
          const [endH, endM] = shift.end_time.split(":").map(Number);
          const startTotalMinutes = startH * 60 + startM;
          const endTotalMinutes = endH * 60 + endM;
          const graceMinutes = shift.grace_time_minutes || 15;

          // Calculate allowed window (shift start - grace to shift end)
          const earliestClockIn = startTotalMinutes - graceMinutes;
          const latestClockIn = endTotalMinutes;

          // Handle night shifts that cross midnight
          const isNightShift =
            shift.is_night_shift || endTotalMinutes < startTotalMinutes;

          let isWithinShiftWindow = false;

          if (isNightShift) {
            // Night shift: e.g., 20:00 to 06:00
            // Valid if: currentTime >= (start - grace) OR currentTime <= end
            isWithinShiftWindow =
              currentTotalMinutes >= earliestClockIn ||
              currentTotalMinutes <= latestClockIn;
          } else {
            // Day shift: e.g., 08:00 to 20:00
            // Valid if: (start - grace) <= currentTime <= end
            isWithinShiftWindow =
              currentTotalMinutes >= earliestClockIn &&
              currentTotalMinutes <= latestClockIn;
          }

          if (!isWithinShiftWindow) {
            const shiftStartFormatted = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
            const shiftEndFormatted = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

            return {
              success: false,
              error: `Cannot clock in outside shift hours. Your shift (${shift.shift_name}) is ${shiftStartFormatted} - ${shiftEndFormatted}. Grace period: ${graceMinutes} minutes before shift.`,
            };
          }

          shiftValidation = {
            isValid: true,
            message: `Clocking in for ${shift.shift_name}`,
          };
        }

        // Step 3: Create attendance record
        const now = new Date();
        const today = now.toISOString().split("T")[0];

        const { error } = await supabase
          .from("attendance_logs")
          .insert({
            employee_id: employeeId,
            log_date: today,
            check_in_time: now.toISOString(),
            check_in_location_id: state.gateLocation.id,
            check_in_latitude: state.currentPosition?.latitude ?? null,
            check_in_longitude: state.currentPosition?.longitude ?? null,
            check_in_selfie_url: selfieUrl,
            status: "present",
          });

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          isClockedIn: true,
          todayAttendance: {
            log_date: today,
            check_in_time: now.toISOString(),
            check_out_time: null,
            check_in_selfie_url: selfieUrl,
            check_in_latitude: state.currentPosition?.latitude ?? null,
            check_in_longitude: state.currentPosition?.longitude ?? null,
          },
        }));

        // GPS tracking will be started by the useEffect watching isClockedIn state

        return { success: true };
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to clock in";
        console.error("Error clocking in:", err);
        return { success: false, error: errorMessage };
      }
    },
    [
      employeeId,
      state.isWithinRange,
      state.gateLocation,
      state.currentPosition,
    ],
  );

  // Clock Out action
  const clockOut = useCallback(async (): Promise<boolean> => {
    if (!employeeId || !state.gateLocation || !state.todayAttendance) {
      return false;
    }

    try {
      const now = new Date();
      // Use log_date from state to ensure we target the correct record even if crossing midnight
      const targetLogDate = state.todayAttendance.log_date;

      // Calculate total hours worked
      const checkInTime = state.todayAttendance.check_in_time
        ? new Date(state.todayAttendance.check_in_time)
        : null;
      
      let totalHours = 0;
      if (checkInTime) {
        totalHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      }
      
      // Calculate overtime hours based on shift duration
      const standardHours = state.activeShift?.standard_hours ?? state.activeShift?.duration_hours ?? 8;
      const overtimeHours = Math.max(0, totalHours - standardHours);
      const baseUpdate = {
        check_out_time: now.toISOString(),
        check_out_location_id: state.gateLocation.id,
        check_out_latitude: state.currentPosition?.latitude ?? null,
        check_out_longitude: state.currentPosition?.longitude ?? null,
        total_hours: parseFloat(totalHours.toFixed(2)),
      };

      const attemptWithOvertime = await supabase
        .from("attendance_logs")
        .update({
          ...baseUpdate,
          overtime_hours: parseFloat(overtimeHours.toFixed(2)),
        })
        .eq("employee_id", employeeId)
        .eq("log_date", targetLogDate);

      let updateError = attemptWithOvertime.error;

      if (
        updateError?.code === "42703" &&
        updateError.message?.includes("attendance_logs.overtime_hours")
      ) {
        const fallbackUpdate = await supabase
          .from("attendance_logs")
          .update(baseUpdate)
          .eq("employee_id", employeeId)
          .eq("log_date", targetLogDate);

        updateError = fallbackUpdate.error;
      }

      if (updateError) throw updateError;

      setState((prev) => ({
        ...prev,
        isClockedIn: false,
        todayAttendance: prev.todayAttendance ? {
          ...prev.todayAttendance,
          check_out_time: now.toISOString(),
          check_out_latitude: state.currentPosition?.latitude ?? null,
          check_out_longitude: state.currentPosition?.longitude ?? null,
        } : null,
      }));

      // Stop GPS tracking after clock out
      stopGpsTracking();

      return true;
    } catch (err: unknown) {
      console.error("Error clocking out:", err);
      return false;
    }
  }, [
    employeeId,
    state.gateLocation,
    state.todayAttendance,
    state.currentPosition,
    state.activeShift,
  ]);

  // Auto Punch Out action (triggered by system due to geo-fence breach)
  const autoClockOut = useCallback(
    async (reason: string): Promise<boolean> => {
      if (!employeeId || !state.gateLocation || !state.todayAttendance) {
        return false;
      }

      try {
        const now = new Date();
        const targetLogDate = state.todayAttendance.log_date;

        // Calculate total hours
        const checkInTime = state.todayAttendance.check_in_time
          ? new Date(state.todayAttendance.check_in_time)
          : null;
        
        let totalHours = 0;
        if (checkInTime) {
          totalHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
        }

        const standardHours = state.activeShift?.standard_hours ?? state.activeShift?.duration_hours ?? 8;
        const overtimeHours = Math.max(0, totalHours - standardHours);
        const baseUpdate = {
          check_out_time: now.toISOString(),
          check_out_location_id: state.gateLocation.id,
          check_out_latitude: state.currentPosition?.latitude ?? null,
          check_out_longitude: state.currentPosition?.longitude ?? null,
          total_hours: parseFloat(totalHours.toFixed(2)),
          is_auto_punch_out: true,
          status: "absent_breach",
        };

        const attemptWithOvertime = await supabase
          .from("attendance_logs")
          .update({
            ...baseUpdate,
            overtime_hours: parseFloat(overtimeHours.toFixed(2)),
          })
          .eq("employee_id", employeeId)
          .eq("log_date", targetLogDate);

        let updateError = attemptWithOvertime.error;

        if (
          updateError?.code === "42703" &&
          updateError.message?.includes("attendance_logs.overtime_hours")
        ) {
          const fallbackUpdate = await supabase
            .from("attendance_logs")
            .update(baseUpdate)
            .eq("employee_id", employeeId)
            .eq("log_date", targetLogDate);

          updateError = fallbackUpdate.error;
        }

        if (updateError) throw updateError;

        setState((prev) => ({
          ...prev,
          isClockedIn: false,
          todayAttendance: prev.todayAttendance ? {
            ...prev.todayAttendance,
            check_out_time: now.toISOString(),
            check_out_latitude: state.currentPosition?.latitude ?? null,
            check_out_longitude: state.currentPosition?.longitude ?? null,
          } : null,
        }));

        stopGpsTracking();
        return true;
      } catch (err: unknown) {
        console.error("Error in auto clock out:", err);
        return false;
      }
    },
    [
      employeeId,
      state.gateLocation,
      state.todayAttendance,
      state.currentPosition,
      state.activeShift,
    ],
  );

  // Start GPS tracking (every 5 minutes)
  const startGpsTracking = useCallback(() => {
    if (gpsIntervalRef.current) return; // Already tracking

    const trackLocation = async () => {
      // Read from ref to avoid stale closure
      // Note: GPS tracking schema requires guard_id (but column is named employee_id)
      if (!guardId || !latestPositionRef.current) return;

      try {
        await supabase.from("gps_tracking").insert({
          employee_id: guardId, // References security_guards(id) despite column name
          latitude: latestPositionRef.current.latitude,
          longitude: latestPositionRef.current.longitude,
          tracked_at: new Date().toISOString(),
          is_mock_location: false,
        });
      } catch (err) {
        console.error("GPS tracking error:", err);
      }
    };

    // Track immediately, then every 5 minutes
    trackLocation();
    gpsIntervalRef.current = setInterval(trackLocation, 5 * 60 * 1000);
  }, [guardId]);

  // Stop GPS tracking
  const stopGpsTracking = useCallback(() => {
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
  }, []);

  // Refresh location data
  const refresh = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    fetchGateLocation();
    fetchTodayAttendance();
    getCurrentPosition();
  }, [fetchGateLocation, fetchTodayAttendance, getCurrentPosition]);

  // Initialize
  useEffect(() => {
    fetchGateLocation();
    fetchTodayAttendance();
    getCurrentPosition(); // Start getting position immediately
  }, [fetchGateLocation, fetchTodayAttendance, getCurrentPosition]);

  // Handle updates when gate location is loaded or changed
  useEffect(() => {
    if (state.gateLocation && state.currentPosition) {
      // Re-calculate distance if both become available later
      const { latitude, longitude } = state.currentPosition;
      const { distance, isWithinRange } = isWithinGeoFence(
        latitude,
        longitude,
        state.gateLocation.latitude,
        state.gateLocation.longitude,
        state.gateLocation.geo_fence_radius,
      );

      setState((prev) => ({
        ...prev,
        distance: Math.round(distance),
        isWithinRange,
      }));
    }
  }, [state.gateLocation]);

  // Start GPS tracking if already clocked in
  useEffect(() => {
    if (state.isClockedIn && state.currentPosition) {
      startGpsTracking();
    }
    return () => {
      stopGpsTracking();
    };
  }, [
    state.isClockedIn,
    state.currentPosition,
    startGpsTracking,
    stopGpsTracking,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      stopGpsTracking();
    };
  }, [stopGpsTracking]);

  return {
    ...state,
    clockIn,
    clockOut,
    autoClockOut,
    refresh,
  };
}
