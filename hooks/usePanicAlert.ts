"use client";

import { useState, useCallback, useRef } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { createPanicAlertWithNotifications } from "@/src/lib/security/panicAlerts";
import { getCanonicalEmployeeIdClient, resolveCurrentWorkforceActorClient } from "@/src/lib/workforce/clientActor";

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
        const actor = await resolveCurrentWorkforceActorClient();

        if (!actor.employeeId) {
          throw new Error("Employee record not found for this user.");
        }

        if (!actor.guardId) {
          throw new Error("Guard record not found. Ensure your account is linked to a guard profile.");
        }

        const panicAlert = await createPanicAlertWithNotifications({
          guardId: actor.guardId,
          guardName: actor.fullName?.trim() || "A guard",
          alertType: params.alertType || "panic",
          latitude: params.latitude ?? null,
          longitude: params.longitude ?? null,
          locationId: params.locationId ?? null,
          description: params.description || "Emergency SOS triggered from Guard App",
        });

        setState((prev) => ({
          ...prev,
          isTriggering: false,
          lastAlert: {
            id: panicAlert.alertId || "",
            triggered_at: panicAlert.alertTime || new Date().toISOString(),
          },
        }));

        return { success: true, alertId: panicAlert.alertId };
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
        const resolvedBy = await getCanonicalEmployeeIdClient();

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
