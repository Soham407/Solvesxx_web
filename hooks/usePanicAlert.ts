"use client";

import { useState, useCallback, useRef } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { sendPanicAlertNotification } from "@/src/lib/notifications";
import { getCurrentUserId } from "@/src/lib/security/getCurrentUserId";

interface PanicAlertState {
  isTriggering: boolean;
  isHolding: boolean;
  holdProgress: number; // 0-100 percentage
  error: string | null;
  lastAlert: {
    id: string;
    triggered_at: string;
  } | null;
}

interface TriggerPanicParams {
  latitude?: number;
  longitude?: number;
  locationId?: string;
  description?: string;
  alertType?:
    | "panic"
    | "inactivity"
    | "geo_fence_breach"
    | "checklist_incomplete"
    | "routine";
}

const HOLD_DURATION_MS = 3000; // 3 seconds to trigger

export function usePanicAlert() {
  const [state, setState] = useState<PanicAlertState>({
    isTriggering: false,
    isHolding: false,
    holdProgress: 0,
    error: null,
    lastAlert: null,
  });

  const holdStartRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const triggerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Trigger a panic alert - inserts into panic_alerts table
   * 
   * ✅ This function uses server-side authentication to derive guard identity.
   * The guard_id is looked up using the authenticated user's ID (auth.uid()),
   * preventing any impersonation attacks.
   * 
   * RLS Policy Required:
   * CREATE POLICY "Guards can insert their own alerts"
   * ON panic_alerts FOR INSERT
   * WITH CHECK (
   *   guard_id IN (
   *     SELECT id FROM security_guards WHERE employee_id = auth.uid()
   *   )
   * );
   */
  const triggerPanic = useCallback(
    async (
      params: TriggerPanicParams,
    ): Promise<{ success: boolean; alertId?: string; error?: string }> => {
      setState((prev) => ({ ...prev, isTriggering: true, error: null }));

      try {
        // ✅ Server-side authentication: Get the authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          throw new Error("Not authenticated. Please log in to use the panic alert.");
        }

        // ✅ Lookup guard_id via employees table using auth_user_id
        // 1. Get employee_id from auth_user_id
        const { data: employeeData, error: empError } = await supabase
          .from("employees")
          .select("id")
          .eq("auth_user_id", user.id)
          .single();

        if (empError || !employeeData) {
           throw new Error("Employee record not found for this user.");
        }

        // 2. Get guard_id from employee_id
        const { data: guardData, error: guardError } = await supabase
          .from("security_guards")
          .select("id")
          .eq("employee_id", employeeData.id)
          .single();

        if (guardError || !guardData) {
          throw new Error("Guard record not found. Ensure your account is linked to a guard profile.");
        }

        const { data, error } = await supabase
          .from("panic_alerts")
          .insert({
            guard_id: guardData.id,
            alert_type: params.alertType || "panic",
            latitude: params.latitude || null,
            longitude: params.longitude || null,
            location_id: params.locationId || null,
            description:
              params.description || "Emergency SOS triggered from Guard App",
            is_resolved: false,
          })
          .select("id, alert_time")
          .single();

        if (error) throw error;

        // Get supervisor IDs to notify
        // employees.designation_id is FK → designations.id — use .or() for reliable joined-column filtering
        const { data: supervisors } = await supabase
          .from('employees')
          .select('auth_user_id, designations!inner(designation_name)')
          .or('designation_name.eq.Security Supervisor,designation_name.eq.Society Manager,designation_name.eq.Admin', { referencedTable: 'designations' })
          .eq('is_active', true);

        const supervisorIds = (supervisors || [])
          .map((s: any) => s.auth_user_id)
          .filter(Boolean);

        if (supervisorIds.length > 0) {
          // Get guard name
          const { data: guardInfo } = await supabase
            .from('employees')
            .select('first_name, last_name')
            .eq('id', employeeData.id)
            .single();

          const guardName = guardInfo 
            ? `${guardInfo.first_name} ${guardInfo.last_name}`.trim()
            : 'A guard';

          await sendPanicAlertNotification(
            supervisorIds,
            guardName,
            params.locationId
          );
        }

        setState((prev) => ({
          ...prev,
          isTriggering: false,
          lastAlert: {
            id: data.id,
            triggered_at: data.alert_time || new Date().toISOString(),
          },
        }));

        return { success: true, alertId: data.id };
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to trigger panic alert";
        console.error("Panic alert error:", err);
        setState((prev) => ({
          ...prev,
          isTriggering: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    },
    [],
  );

  /**
   * Start the hold gesture for panic button
   */
  const startHold = useCallback(() => {
    holdStartRef.current = Date.now();
    setState((prev) => ({ ...prev, isHolding: true, holdProgress: 0 }));

    // Update progress every 50ms
    holdIntervalRef.current = setInterval(() => {
      if (!holdStartRef.current) return;

      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min((elapsed / HOLD_DURATION_MS) * 100, 100);

      setState((prev) => ({ ...prev, holdProgress: progress }));
    }, 50);
  }, []);

  /**
   * End the hold gesture - returns true if hold was long enough
   */
  const endHold = useCallback((): boolean => {
    const wasHoldingLongEnough =
      holdStartRef.current !== null &&
      Date.now() - holdStartRef.current >= HOLD_DURATION_MS;

    // Clear intervals and refs
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    if (triggerTimeoutRef.current) {
      clearTimeout(triggerTimeoutRef.current);
      triggerTimeoutRef.current = null;
    }
    holdStartRef.current = null;

    setState((prev) => ({ ...prev, isHolding: false, holdProgress: 0 }));

    return wasHoldingLongEnough;
  }, []);

  /**
   * Cancel the hold gesture
   */
  const cancelHold = useCallback(() => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    if (triggerTimeoutRef.current) {
      clearTimeout(triggerTimeoutRef.current);
      triggerTimeoutRef.current = null;
    }
    holdStartRef.current = null;
    setState((prev) => ({ ...prev, isHolding: false, holdProgress: 0 }));
  }, []);

  /**
   * Resolve an existing alert
   */
  const resolveAlert = useCallback(
    async (alertId: string, resolutionNotes?: string): Promise<boolean> => {
      try {
        const resolvedBy = await getCurrentUserId();

        const { error } = await supabase
          .from("panic_alerts")
          .update({
            is_resolved: true,
            resolved_at: new Date().toISOString(),
            resolved_by: resolvedBy,
            resolution_notes: resolutionNotes || "Alert resolved",
          })
          .eq("id", alertId);

        if (error) throw error;
        return true;
      } catch (err) {
        console.error("Failed to resolve alert:", err);
        return false;
      }
    },
    [],
  );

  return {
    ...state,
    triggerPanic,
    startHold,
    endHold,
    cancelHold,
    resolveAlert,
    HOLD_DURATION_MS,
  };
}
