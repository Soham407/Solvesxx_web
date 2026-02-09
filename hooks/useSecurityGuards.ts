"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

/**
 * Security Guards Hook
 * PRD Reference: "Alert System" (III) + "Smart Attendance & Geo-Fencing" (HRMS III)
 * 
 * Features:
 * - GPS Tracking with Geo-Fencing
 * - Static Alert (30-min inactivity)
 * - Auto-Punch Out if guard leaves geo-fence
 * - Live battery levels and device status
 */

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
  // Joined data
  employee?: {
    first_name: string;
    last_name: string;
    phone: string;
    photo_url: string | null;
  };
  assigned_location?: {
    location_name: string;
    location_code: string;
    latitude: number | null;
    longitude: number | null;
    geo_fence_radius: number | null;
  };
  // Computed/fetched separately
  lastLocation?: GuardLocation;
  attendance?: {
    check_in_time: string | null;
    check_out_time: string | null;
    status: string;
  };
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

  // Fetch all guards with details
  const fetchGuards = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("security_guards")
        .select(`
          *,
          employee:employees(first_name, last_name, phone, photo_url),
          assigned_location:company_locations(location_name, location_code, latitude, longitude, geo_fence_radius)
        `)
        .eq("is_active", true)
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

      const typedData = (data || []) as unknown as SecurityGuard[];
      setGuards(typedData);

      // Fetch today's attendance for each guard
      const today = new Date().toISOString().split("T")[0];
      const { data: attendanceData } = await supabase
        .from("attendance_logs")
        .select("employee_id, check_in_time, check_out_time, status")
        .eq("log_date", today)
        .in("employee_id", typedData.map(g => g.employee_id));

      // Map attendance to guards
      const attendanceMap = new Map(
        (attendanceData || []).map(a => [a.employee_id, {
          check_in_time: a.check_in_time,
          check_out_time: a.check_out_time,
          status: a.status || "unknown",
        }])
      );

      const guardsWithAttendance: SecurityGuard[] = typedData.map(guard => ({
        ...guard,
        attendance: attendanceMap.get(guard.employee_id) || undefined,
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

      // Group by employee_id and take latest
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

      setStats({
        totalGuards: totalCount || 0,
        activeOnDuty: onDutyCount || 0,
        inactiveAlerts: inactivityCount || 0,
        geoFenceBreaches: breachCount || 0,
      });
    } catch (err) {
      console.error("Error fetching guard stats:", err);
    }
  }, []);

  // Check if guard is within geo-fence
  const isWithinGeoFence = (guard: SecurityGuard, location: GuardLocation): boolean => {
    if (!guard.assigned_location?.latitude || !guard.assigned_location?.longitude) {
      return true; // No geo-fence configured
    }

    const radius = guard.assigned_location.geo_fence_radius || 50; // Default 50m
    const distance = calculateDistance(
      guard.assigned_location.latitude,
      guard.assigned_location.longitude,
      location.latitude,
      location.longitude
    );

    return distance <= radius;
  };

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Get guard status label
  const getGuardStatus = (guard: SecurityGuard): { label: string; color: string } => {
    if (!guard.attendance?.check_in_time) {
      return { label: "Off Duty", color: "text-muted-foreground" };
    }
    if (guard.attendance?.check_out_time) {
      return { label: "Shift Ended", color: "text-muted-foreground" };
    }

    const location = guardLocations.get(guard.employee_id);
    if (!location) {
      return { label: "No GPS Signal", color: "text-warning" };
    }

    // Check last update time
    const lastUpdate = new Date(location.tracked_at);
    const minutesAgo = (Date.now() - lastUpdate.getTime()) / 60000;

    if (minutesAgo > 30) {
      return { label: "Inactive", color: "text-critical" };
    }

    if (!isWithinGeoFence(guard, location)) {
      return { label: "Outside Geo-fence", color: "text-warning" };
    }

    return { label: "Active", color: "text-success" };
  };

  // Get battery status
  const getBatteryStatus = (guard: SecurityGuard): { level: number | null; color: string } => {
    const location = guardLocations.get(guard.employee_id);
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
  };

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
    getGuardStatus,
    getBatteryStatus,
    isWithinGeoFence,
    calculateDistance,
    
    // Filters
    filters,
    setFilters,
    
    // Refresh
    refresh: fetchGuards,
    refreshLocations: fetchGuardLocations,
  };
}
