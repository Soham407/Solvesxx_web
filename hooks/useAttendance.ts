"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { MAIN_GATE_CODE } from "@/src/lib/constants";

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
  todayAttendance: {
    check_in_time: string | null;
    check_out_time: string | null;
    check_in_selfie_url?: string | null;
    check_in_latitude?: number | null;
    check_in_longitude?: number | null;
    check_out_latitude?: number | null;
    check_out_longitude?: number | null;
  } | null;
}

/**
 * Haversine formula to calculate the great-circle distance between two points
 * Reference: HR-Management-and-Geo-Attendance-System geofencing logic
 * @returns distance in meters
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
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

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function useAttendance(employeeId?: string, guardId?: string | null) {
  const [state, setState] = useState<AttendanceState>({
    isWithinRange: false,
    distance: null,
    isLoading: true,
    error: null,
    gateLocation: null,
    currentPosition: null,
    isClockedIn: false,
    todayAttendance: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const gpsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const latestPositionRef = useRef<{ latitude: number; longitude: number } | null>(null);

  // Fetch gate location from company_locations
  const fetchGateLocation = useCallback(async () => {
    try {
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
            geo_fence_radius: Number(data.geo_fence_radius) || 50, // Default 50m
            location_name: data.location_name,
          },
        }));
      }
    } catch (err: any) {
      console.error("Error fetching gate location:", err);
      setState((prev) => ({
        ...prev,
        error: "Failed to fetch gate location",
        isLoading: false,
      }));
    }
  }, []);

  // Fetch today's attendance record
  const fetchTodayAttendance = useCallback(async () => {
    if (!employeeId) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("check_in_time, check_out_time, check_in_selfie_url, check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude")
        .eq("employee_id", employeeId)
        .eq("log_date", today)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows found
        throw error;
      }

      setState((prev) => ({
        ...prev,
        todayAttendance: data || null,
        isClockedIn: data?.check_in_time && !data?.check_out_time ? true : false,
      }));
    } catch (err: any) {
      console.error("Error fetching attendance:", err);
    }
  }, [employeeId]);

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

          const distance = haversineDistance(
            latitude,
            longitude,
            prev.gateLocation.latitude,
            prev.gateLocation.longitude
          );

          const isWithinRange = distance <= prev.gateLocation.geo_fence_radius;

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
      options
    );
  }, []);

  // Clock In action with shift enforcement and selfie evidence
  const clockIn = useCallback(async (selfieUrl?: string): Promise<{ success: boolean; error?: string }> => {
    if (!employeeId || !state.isWithinRange || !state.gateLocation) {
      return { success: false, error: "Location requirements not met" };
    }

    if (!selfieUrl) {
      return { success: false, error: "Selfie capture is mandatory for check-in" };
    }

    try {
      // Step 1: Check if guard has an active shift assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("employee_shift_assignments")
        .select(`
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
        `)
        .eq("employee_id", employeeId)
        .eq("is_active", true)
        .single();

      if (assignmentError && assignmentError.code !== "PGRST116") {
        throw assignmentError;
      }

      // Step 2: If no shift assigned, allow clock-in but log warning
      let shiftValidation = { isValid: true, message: "" };

      if (assignmentData && assignmentData.shifts) {
        const shiftsArray = Array.isArray(assignmentData.shifts) ? assignmentData.shifts : [assignmentData.shifts];
        const shift = shiftsArray[0] as any;
        
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
        const isNightShift = shift.is_night_shift || endTotalMinutes < startTotalMinutes;

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

      const { error } = await supabase.from("attendance_logs").insert({
        employee_id: employeeId,
        log_date: today,
        check_in_time: now.toISOString(),
        check_in_location_id: state.gateLocation.id,
        check_in_latitude: state.currentPosition?.latitude,
        check_in_longitude: state.currentPosition?.longitude,
        check_in_selfie_url: selfieUrl,
        status: "present",
      });

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        isClockedIn: true,
        todayAttendance: {
          check_in_time: now.toISOString(),
          check_out_time: null,
          check_in_selfie_url: selfieUrl,
          check_in_latitude: state.currentPosition?.latitude,
          check_in_longitude: state.currentPosition?.longitude,
        },
      }));

      // GPS tracking will be started by the useEffect watching isClockedIn state

      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to clock in";
      console.error("Error clocking in:", err);
      return { success: false, error: errorMessage };
    }
  }, [employeeId, state.isWithinRange, state.gateLocation, state.currentPosition]);

  // Clock Out action
  const clockOut = useCallback(async (): Promise<boolean> => {
    if (!employeeId || !state.gateLocation) {
      return false;
    }

    try {
      const now = new Date();
      const today = now.toISOString().split("T")[0];

      // Calculate total hours worked
      const checkInTime = state.todayAttendance?.check_in_time
        ? new Date(state.todayAttendance.check_in_time)
        : null;
      const totalHours = checkInTime
        ? (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
        : null;

      const { error } = await supabase
        .from("attendance_logs")
        .update({
          check_out_time: now.toISOString(),
          check_out_location_id: state.gateLocation.id,
          check_out_latitude: state.currentPosition?.latitude,
          check_out_longitude: state.currentPosition?.longitude,
          total_hours: totalHours ? parseFloat(totalHours.toFixed(2)) : null,
        })
        .eq("employee_id", employeeId)
        .eq("log_date", today);

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        isClockedIn: false,
        todayAttendance: {
          ...prev.todayAttendance,
          check_in_time: prev.todayAttendance?.check_in_time || null,
          check_out_time: now.toISOString(),
          check_out_latitude: state.currentPosition?.latitude,
          check_out_longitude: state.currentPosition?.longitude,
        },
      }));

      // Stop GPS tracking after clock out
      stopGpsTracking();

      return true;
    } catch (err: any) {
      console.error("Error clocking out:", err);
      return false;
    }
  }, [employeeId, state.gateLocation, state.todayAttendance, state.currentPosition]);

  // Auto Punch Out action (triggered by system due to geo-fence breach)
  const autoClockOut = useCallback(async (reason: string): Promise<boolean> => {
    if (!employeeId || !state.gateLocation) {
      return false;
    }

    try {
      const now = new Date();
      const today = now.toISOString().split("T")[0];

      // Calculate total hours
      const checkInTime = state.todayAttendance?.check_in_time
        ? new Date(state.todayAttendance.check_in_time)
        : null;
      const totalHours = checkInTime
        ? (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
        : null;

      const { error } = await supabase
        .from("attendance_logs")
        .update({
          check_out_time: now.toISOString(),
          check_out_location_id: state.gateLocation.id,
          check_out_latitude: state.currentPosition?.latitude,
          check_out_longitude: state.currentPosition?.longitude,
          total_hours: totalHours ? parseFloat(totalHours.toFixed(2)) : null,
          is_auto_punch_out: true,
          status: "absent_breach", // Special status for auto-punch
        })
        .eq("employee_id", employeeId)
        .eq("log_date", today);

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        isClockedIn: false,
        todayAttendance: {
          ...prev.todayAttendance,
          check_in_time: prev.todayAttendance?.check_in_time || null,
          check_out_time: now.toISOString(),
          check_out_latitude: state.currentPosition?.latitude,
          check_out_longitude: state.currentPosition?.longitude,
        },
      }));

      stopGpsTracking();
      return true;
    } catch (err: any) {
      console.error("Error in auto clock out:", err);
      return false;
    }
  }, [employeeId, state.gateLocation, state.todayAttendance, state.currentPosition]);

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
      const distance = haversineDistance(
        latitude,
        longitude,
        state.gateLocation.latitude,
        state.gateLocation.longitude
      );
      
      const isWithinRange = distance <= state.gateLocation.geo_fence_radius;
      
      setState(prev => ({
        ...prev,
        distance: Math.round(distance),
        isWithinRange
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
  }, [state.isClockedIn, state.currentPosition, startGpsTracking, stopGpsTracking]);

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
