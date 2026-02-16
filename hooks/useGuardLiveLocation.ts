"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabaseClient";

interface GuardLocation {
  employee_id: string;
  guard_name: string;
  latitude: number;
  longitude: number;
  tracked_at: string;
  status: "active" | "inactive";
}

export function useGuardLiveLocation() {
  const [locations, setLocations] = useState<GuardLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLocations() {
      try {
        // 1. Get currently clocked-in guards from attendance_logs
        const today = new Date().toISOString().split('T')[0];
        const { data: activeLogs, error: logsError } = await supabase
          .from("attendance_logs")
          .select(`
            employee_id,
            status,
            security_guards:employees (
              first_name,
              last_name
            )
          `)
          .eq("log_date", today)
          .is("check_out_time", null);

        if (logsError) throw logsError;
        
        if (!activeLogs || activeLogs.length === 0) {
          setLocations([]);
          setIsLoading(false);
          return;
        }

        const employeeIds = activeLogs.map(l => l.employee_id);

        // 2. Get latest location for each active employee
        // We use a subquery approach or just fetch recent ones and filter
        const { data: gpsData, error: gpsError } = await supabase
          .from("gps_tracking")
          .select("employee_id, latitude, longitude, tracked_at")
          .in("employee_id", employeeIds)
          .order("tracked_at", { ascending: false });

        if (gpsError) throw gpsError;

        // Group by employee and take the latest
        const latestLocations: Record<string, GuardLocation> = {};
        
        activeLogs.forEach(log => {
          const empId = log.employee_id;
          const emp = log.security_guards as any;
          const fullName = emp ? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() : "Unknown Guard";
          
          // Find latest GPS record for this employee
          const latestGps = gpsData?.find(g => g.employee_id === empId);
          
          if (latestGps) {
            latestLocations[empId] = {
              employee_id: empId,
              guard_name: fullName,
              latitude: Number(latestGps.latitude),
              longitude: Number(latestGps.longitude),
              tracked_at: latestGps.tracked_at,
              status: "active"
            };
          }
        });

        setLocations(Object.values(latestLocations));
      } catch (err) {
        console.error("Error fetching live locations:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLocations();
    // Refresh every 30 seconds for "live" feel
    const interval = setInterval(fetchLocations, 30000);
    return () => clearInterval(interval);
  }, []);

  return { locations, isLoading };
}
