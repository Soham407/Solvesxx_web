"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { buildGuardLiveLocations, type GuardLocation } from "@/src/lib/security/guardLiveLocationPlanning";

export function useGuardLiveLocation() {
  const [locations, setLocations] = useState<GuardLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  function normalizeAttendanceRows(
    rows: unknown
  ): Array<{
    employee_id: string;
    status: string | null;
    employee?: { first_name: string | null; last_name: string | null } | null;
  }> {
    return Array.isArray(rows) ? (rows as Array<{
      employee_id: string;
      status: string | null;
      employee?: { first_name: string | null; last_name: string | null } | null;
    }>) : [];
  }

  function normalizeGpsRows(rows: unknown): Array<{
    employee_id: string;
    latitude: number | string;
    longitude: number | string;
    tracked_at: string;
  }> {
    return Array.isArray(rows) ? (rows as Array<{
      employee_id: string;
      latitude: number | string;
      longitude: number | string;
      tracked_at: string;
    }>) : [];
  }

  useEffect(() => {
    let isActive = true;

    async function fetchLocations() {
      try {
        // 1. Get currently clocked-in guards from attendance_logs
        const today = new Date().toISOString().split('T')[0];
        const logsQuery = supabase
          .from("attendance_logs")
          .select(`
            employee_id,
            status,
            employee:employees (
              first_name,
              last_name
            )
          `)
          .eq("log_date", today)
          .is("check_out_time", null);

        const { data: activeLogs, error: logsError } = await logsQuery;

        if (logsError) throw logsError;
        
        if (!isActive) return;

        const typedActiveLogs = normalizeAttendanceRows(activeLogs);
        if (typedActiveLogs.length === 0) {
          setLocations([]);
          setIsLoading(false);
          return;
        }

        // 2. Get latest location for each active employee
        const { data: gpsData, error: gpsError } = await supabase
          .from("gps_tracking")
          .select("employee_id, latitude, longitude, tracked_at")
          .in("employee_id", typedActiveLogs.map((log) => log.employee_id))
          .order("tracked_at", { ascending: false });

        if (gpsError) throw gpsError;

        if (!isActive) return;

        setLocations(
          buildGuardLiveLocations(
            typedActiveLogs,
            typedActiveLogs.map((log) => log.employee_id),
            normalizeGpsRows(gpsData)
          )
        );
      } catch (err) {
        console.error("Error fetching live locations:", err);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    fetchLocations();
    // Refresh every 30 seconds for "live" feel
    const interval = setInterval(fetchLocations, 30000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, []);

  return { locations, isLoading };
}
