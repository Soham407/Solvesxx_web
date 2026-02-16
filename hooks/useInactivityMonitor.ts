"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/src/lib/supabaseClient";

/**
 * Hook to detect guard inactivity (static GPS) and trigger alerts.
 * Requirement: 30 minutes of static GPS = Alert.
 */
export function useInactivityMonitor(employeeId: string | null, isClockedIn: boolean, currentPosition: { latitude: number; longitude: number } | null) {
  const lastActivePositionRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
  const MOVEMENT_THRESHOLD_METERS = 5; // GPS drift threshold

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
      // Guard is static. Check if it's been > 30 mins
      const duration = now - lastActivePositionRef.current.time;
      if (duration >= INACTIVITY_THRESHOLD_MS) {
        triggerInactivityAlert(employeeId, lat, lng);
        // Reset time to avoid spamming alerts every second
        lastActivePositionRef.current.time = now; 
      }
    }
  }, [isClockedIn, currentPosition, employeeId]);

  async function triggerInactivityAlert(empId: string, lat: number, lng: number) {
    try {
      // Get location_id if possible
      const { data: guard } = await supabase
        .from("security_guards")
        .select("assigned_location_id")
        .eq("employee_id", empId)
        .single();

      await supabase.from("panic_alerts").insert({
        employee_id: empId,
        alert_type: "inactivity",
        description: "Static inactivity detected for 30+ minutes. No GPS movement recorded.",
        latitude: lat,
        longitude: lng,
        location_id: guard?.assigned_location_id,
        status: "unresolved"
      });
      
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
