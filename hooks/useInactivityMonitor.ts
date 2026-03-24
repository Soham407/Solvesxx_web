"use client";

import { useEffect, useRef, useState } from "react";
import { supabase as supabaseClient } from "@/src/lib/supabaseClient";
import { sendPanicAlertNotification } from "@/src/lib/notifications";
import { SYSTEM_CONFIG_DEFAULTS } from "@/src/lib/platform/system-config";

const supabase = supabaseClient;

/**
 * Hook to detect guard inactivity (static GPS) and trigger alerts.
 * Threshold is read from system_config table (key: guard_inactivity_threshold_minutes).
 * Falls back to 30 minutes if the key is absent.
 */
export function useInactivityMonitor(employeeId: string | null, isClockedIn: boolean, currentPosition: { latitude: number; longitude: number } | null) {
  const lastActivePositionRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const [threshold, setThreshold] = useState(
    Number(SYSTEM_CONFIG_DEFAULTS.guard_inactivity_threshold_minutes)
  );
  const MOVEMENT_THRESHOLD_METERS = 5; // GPS drift threshold

  // Load inactivity threshold from system_config on mount
  useEffect(() => {
    async function loadThreshold() {
      try {
        const { data, error } = await (supabase as any)
          .from("system_config")
          .select("value")
          .eq("key", "guard_inactivity_threshold_minutes")
          .single();

        if (!error && data?.value) {
          const parsed = parseInt(data.value, 10);
          if (!isNaN(parsed) && parsed > 0) {
            setThreshold(parsed);
          }
        }
      } catch {
        // Keep default of 30 minutes on any failure
      }
    }
    loadThreshold();
  }, []);

  const INACTIVITY_THRESHOLD_MS = threshold * 60 * 1000;

  useEffect(() => {
    if (!isClockedIn || !currentPosition || !employeeId) {
      lastActivePositionRef.current = null;
      return;
    }

    const { latitude: lat, longitude: lng } = currentPosition;
    const now = Date.now();

    if (!lastActivePositionRef.current) {
      lastActivePositionRef.current = { lat, lng, time: now };
      return;
    }

    // Check distance moved from last active position
    const distance = haversineDistance(lat, lng, lastActivePositionRef.current.lat, lastActivePositionRef.current.lng);

    if (distance > MOVEMENT_THRESHOLD_METERS) {
      // Guard moved! Reset the inactivity timer
      lastActivePositionRef.current = { lat, lng, time: now };
    } else {
      // Guard is static. Check if it's been longer than the configured threshold.
      const duration = now - lastActivePositionRef.current.time;
      if (duration >= INACTIVITY_THRESHOLD_MS) {
        triggerInactivityAlert(employeeId, lat, lng, threshold);
        // Reset time to avoid spamming alerts every second
        lastActivePositionRef.current.time = now; 
      }
    }
  }, [INACTIVITY_THRESHOLD_MS, currentPosition, employeeId, isClockedIn, threshold]);

  async function triggerInactivityAlert(
    empId: string,
    lat: number,
    lng: number,
    inactivityThresholdMinutes: number
  ) {
    try {
      // Get guard details
      const { data: guard, error: guardError } = await supabase
        .from("security_guards")
        .select("id, assigned_location_id, employee_id")
        .eq("employee_id", empId)
        .single();

      // H2 FIX: guard_id FK points to security_guards.id — cannot use empId as fallback
      if (guardError || !guard?.id) {
        console.error("Cannot create inactivity alert: no guard record found for employee", empId);
        return;
      }

      // Get guard name
      const { data: empData } = await supabase
        .from("employees")
        .select("first_name, last_name")
        .eq("id", empId)
        .single();

      const guardName = empData 
        ? `${empData.first_name} ${empData.last_name}`.trim()
        : "A guard";

      // Insert panic alert
      await supabase
        .from("panic_alerts")
        .insert({
          guard_id: guard.id,
          alert_type: "inactivity",
          description: `Static inactivity detected for ${inactivityThresholdMinutes}+ minutes. No GPS movement recorded.`,
          latitude: lat,
          longitude: lng,
          location_id: guard.assigned_location_id,
          is_resolved: false
        })
        .select()
        .single();

      // Send notifications to supervisors
      // H3 FIX: Use .or() instead of .in() on joined column for reliable PostgREST filtering
      const { data: supervisors } = await supabase
        .from('employees')
        .select('auth_user_id, designations!inner(designation_name)')
        .eq('is_active', true)
        .or('designation_name.eq.Security Supervisor,designation_name.eq.Society Manager,designation_name.eq.Admin', { referencedTable: 'designations' });

      const supervisorIds = (supervisors || [])
        .map((s: { auth_user_id: string | null }) => s.auth_user_id)
        .filter((id): id is string => Boolean(id));

      if (supervisorIds.length > 0) {
        await sendPanicAlertNotification(
          supervisorIds,
          guardName,
          `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`
        );
      }
      
      console.log("Inactivity alert triggered for", empId);
    } catch (err) {
      console.error("Failed to trigger inactivity alert:", err);
    }
  }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
