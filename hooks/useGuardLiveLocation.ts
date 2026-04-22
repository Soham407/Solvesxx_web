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

async function getManagedSocieties(): Promise<string[]> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return [];

    const { data: societies, error: societiesError } = await supabase
      .from("societies")
      .select("id")
      .eq("society_manager_id", user.id);

    if (societiesError || !societies) return [];
    return societies.map((s: any) => s.id);
  } catch (err) {
    console.error("Error getting managed societies:", err);
    return [];
  }
}

export function useGuardLiveLocation(societyId?: string) {
  const [locations, setLocations] = useState<GuardLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLocations() {
      try {
        // Get managed society IDs if not provided explicitly
        let societyIds = societyId ? [societyId] : await getManagedSocieties();
        if (societyIds.length === 0) {
          societyIds = [];
        }

        // 1. Get currently clocked-in guards from attendance_logs
        const today = new Date().toISOString().split('T')[0];
        let logsQuery = supabase
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
        
        if (!activeLogs || activeLogs.length === 0) {
          setLocations([]);
          setIsLoading(false);
          return;
        }

        // Filter guards by managed societies if applicable
        let guardIds = activeLogs.map(l => l.employee_id);
        if (societyIds.length > 0) {
          const guardQuery = (supabase as any)
            .from("security_guards")
            .select("employee_id")
            .in("employee_id", guardIds)
            .in("society_id", societyIds);
          const { data: guardsByLocation, error: guardError } = await guardQuery;

          if (guardError) throw guardError;
          guardIds = (guardsByLocation || []).map(g => g.employee_id);
          
          if (guardIds.length === 0) {
            setLocations([]);
            setIsLoading(false);
            return;
          }
        }

        const employeeIds = guardIds;

        // 2. Get latest location for each active employee
        const { data: gpsData, error: gpsError } = await supabase
          .from("gps_tracking")
          .select("employee_id, latitude, longitude, tracked_at")
          .in("employee_id", employeeIds)
          .order("tracked_at", { ascending: false });

        if (gpsError) throw gpsError;

        // Group by employee and take the latest
        const latestLocations: Record<string, GuardLocation> = {};
        
        activeLogs.forEach(log => {
          if (!guardIds.includes(log.employee_id)) return;
          
          const empId = log.employee_id;
          const emp = log.employee as { first_name: string | null; last_name: string | null } | null;
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
  }, [societyId]);

  return { locations, isLoading };
}
