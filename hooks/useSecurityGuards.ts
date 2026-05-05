"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import {
  buildGuardStats,
  getBatteryStatus,
  getGuardStatus as getGuardStatusTransform,
  isWithinGeoFence as isWithinGeoFenceTransform,
  mapSecurityGuardRow,
  type CompanyLocationRow,
  type GuardFilters,
  type GuardLocation,
  type GuardStats,
  type SecurityGuard,
  type SecurityGuardRow,
  type ShiftAssignmentRow,
} from "@/src/lib/security/guardTransforms";

export type {
  GuardFilters,
  GuardGrade,
  GuardLocation,
  GuardStats,
  SecurityGuard,
} from "@/src/lib/security/guardTransforms";

export function useSecurityGuards(initialFilters?: GuardFilters) {
  const { toast } = useToast();
  const [guards, setGuards] = useState<SecurityGuard[]>([]);
  const [activeGuards, setActiveGuards] = useState<SecurityGuard[]>([]);
  const [guardLocations, setGuardLocations] = useState<Map<string, GuardLocation>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<GuardStats>({
    totalGuards: 0,
    activeOnDuty: 0,
    inactiveAlerts: 0,
    geoFenceBreaches: 0,
  });
  const [filters, setFilters] = useState<GuardFilters>(initialFilters || {});

  function normalizeGuardRows(rows: unknown): SecurityGuardRow[] {
    return Array.isArray(rows) ? (rows as SecurityGuardRow[]) : [];
  }

  function normalizeLocationRows(rows: unknown): CompanyLocationRow[] {
    return Array.isArray(rows) ? (rows as CompanyLocationRow[]) : [];
  }

  function normalizeShiftRows(rows: unknown): ShiftAssignmentRow[] {
    return Array.isArray(rows) ? (rows as ShiftAssignmentRow[]) : [];
  }

  const getLocationForGuard = useCallback(
    (guard: Pick<SecurityGuard, "id" | "employee_id">): GuardLocation | undefined =>
      guardLocations.get(guard.id) || guardLocations.get(guard.employee_id),
    [guardLocations],
  );

  // Fetch all guards with details
  const fetchGuards = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("security_guards")
        .select(`
          *,
          employee:employees(first_name, last_name, employee_code, phone, photo_url, auth_user_id)
        `)
        .order("guard_code", { ascending: true });

      // Apply filters
      if (filters.grade) {
        query = query.eq("grade", filters.grade);
      }

      if (filters.locationId) {
        query = query.eq("assigned_location_id", filters.locationId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const guardRows = normalizeGuardRows(data);
      const assignedLocationIds = Array.from(
        new Set(
          guardRows
            .map((row) => row.assigned_location_id)
            .filter((locationId): locationId is string => typeof locationId === "string" && locationId.length > 0),
        ),
      );

      const { data: locationData, error: locationError } = assignedLocationIds.length
        ? await supabase
            .from("company_locations")
            .select("id, location_name, location_code, latitude, longitude, geo_fence_radius")
            .in("id", assignedLocationIds)
        : { data: [], error: null };

      if (locationError) throw locationError;

      const locationMap = new Map<string, CompanyLocationRow>(
        normalizeLocationRows(locationData).map((location) => [location.id, location]),
      );

      const typedData: SecurityGuard[] = guardRows.map((row) =>
        mapSecurityGuardRow(row, row.assigned_location_id ? locationMap.get(row.assigned_location_id) : undefined),
      );

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("employee_shift_assignments")
        .select(`
          employee_id,
          shifts(id, shift_name)
        `)
        .eq("is_active", true)
        .in("employee_id", typedData.map((guard) => guard.employee_id));

      if (assignmentsError) throw assignmentsError;

      const shiftMap = new Map<string, { id: string; shift_name: string }>();
      normalizeShiftRows(assignmentsData).forEach((assignment) => {
        const shift = Array.isArray(assignment.shifts) ? assignment.shifts[0] : assignment.shifts;
        if (assignment.employee_id && shift?.id) {
          shiftMap.set(assignment.employee_id, {
            id: shift.id,
            shift_name: shift.shift_name,
          });
        }
      });

      // Fetch today's attendance for each guard
      const today = new Date().toISOString().split("T")[0];
      const { data: attendanceData } = await supabase
        .from("attendance_logs")
        .select("employee_id, check_in_time, check_out_time, status")
        .eq("log_date", today)
        .in("employee_id", typedData.map((g) => g.employee_id));

      // Map attendance to guards
      const attendanceMap = new Map(
      (attendanceData || []).map((a) => [
        a.employee_id,
        {
          check_in_time: a.check_in_time,
          check_out_time: a.check_out_time,
          status: a.status || "unknown",
        },
      ])
      );

      const guardsWithAttendance: SecurityGuard[] = typedData.map(guard => ({
        ...guard,
        attendance: attendanceMap.get(guard.employee_id) || undefined,
        currentShift: shiftMap.get(guard.employee_id) || null,
      }));

      setGuards(guardsWithAttendance);

      // Filter active guards (checked in, not checked out)
      const active = guardsWithAttendance.filter(
        g => g.attendance?.check_in_time && !g.attendance?.check_out_time
      );
      setActiveGuards(active);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load guards";
      console.error("Error fetching guards:", err);
      setError(errorMessage);
      toast({
        title: "Error",
        description: "Failed to load security guard data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, toast]);

  // Fetch latest GPS locations for all guards
  const fetchGuardLocations = useCallback(async () => {
    try {
      // Get latest location for each guard (last 30 minutes)
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { data, error: fetchError } = await supabase
        .from("gps_tracking")
        .select("*")
        .gte("tracked_at", thirtyMinsAgo)
        .order("tracked_at", { ascending: false });

      if (fetchError) throw fetchError;

      // GPS rows are now written with security_guards.id to satisfy RLS,
      // but some older staging rows may still use employees.id. Keep both.
      const locationMap = new Map<string, GuardLocation>();
      (data || []).forEach((loc: GuardLocation) => {
        if (!locationMap.has(loc.employee_id)) {
          locationMap.set(loc.employee_id, loc);
        }
      });

      setGuardLocations(locationMap);

    } catch (err) {
      console.error("Error fetching guard locations:", err);
    }
  }, []);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Total active guards
      const { count: totalCount } = await supabase
        .from("security_guards")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Guards on duty today
      const { count: onDutyCount } = await supabase
        .from("attendance_logs")
        .select("*", { count: "exact", head: true })
        .eq("log_date", today)
        .not("check_in_time", "is", null)
        .is("check_out_time", null);

      // Inactivity alerts today
      const { count: inactivityCount } = await supabase
        .from("panic_alerts")
        .select("*", { count: "exact", head: true })
        .eq("alert_type", "inactivity")
        .gte("alert_time", `${today}T00:00:00`);

      // Geo-fence breaches today
      const { count: breachCount } = await supabase
        .from("panic_alerts")
        .select("*", { count: "exact", head: true })
        .eq("alert_type", "geo_fence_breach")
        .gte("alert_time", `${today}T00:00:00`);

      setStats(
        buildGuardStats({
          totalGuards: totalCount,
          activeOnDuty: onDutyCount,
          inactiveAlerts: inactivityCount,
          geoFenceBreaches: breachCount,
        }),
      );
    } catch (err) {
      console.error("Error fetching guard stats:", err);
    }
  }, []);

  // Check if guard is within geo-fence
  // Real-time subscription for GPS updates
  useEffect(() => {
    const channel = supabase
      .channel("gps-tracking-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gps_tracking",
        },
        () => {
          // Refresh locations on new GPS data
          fetchGuardLocations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGuardLocations]);

  // Poll for location updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchGuardLocations();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchGuardLocations]);

  // Initial fetch
  useEffect(() => {
    fetchGuards();
    fetchGuardLocations();
    fetchStats();
  }, [fetchGuards, fetchGuardLocations, fetchStats]);

  return {
    // Data
    guards,
    activeGuards,
    guardLocations,
    stats,
    isLoading,
    error,
    
    // Helpers
    getGuardStatus: (guard: SecurityGuard) => getGuardStatusTransform(guard, getLocationForGuard),
    getBatteryStatus: (guard: SecurityGuard) => getBatteryStatus(guard, getLocationForGuard),
    getLocationForGuard,
    isWithinGeoFence: isWithinGeoFenceTransform,
    
    // Filters
    filters,
    setFilters,
    
    // Refresh
    refresh: fetchGuards,
    refreshLocations: fetchGuardLocations,
  };
}
