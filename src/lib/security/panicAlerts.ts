"use client";

import { supabase } from "@/src/lib/supabaseClient";
import { sendPanicAlertNotification } from "@/src/lib/notifications";

type SecurityAlertType =
  | "panic"
  | "inactivity"
  | "geo_fence_breach"
  | "checklist_incomplete"
  | "routine";

interface CreatePanicAlertInput {
  guardId: string;
  guardName: string;
  alertType: SecurityAlertType;
  latitude?: number | null;
  longitude?: number | null;
  locationId?: string | null;
  description?: string | null;
  locationText?: string | null;
}

interface CreatePanicAlertResult {
  success: boolean;
  alertId?: string;
  alertTime?: string;
  supervisorCount: number;
}

async function getSecuritySupervisorIds(): Promise<string[]> {
  const { data } = await supabase
    .from("employees")
    .select("auth_user_id, designations!inner(designation_name)")
    .eq("is_active", true)
    .or(
      "designation_name.eq.Security Supervisor,designation_name.eq.Society Manager,designation_name.eq.Admin",
      { referencedTable: "designations" },
    );

  return (data || [])
    .map((row: { auth_user_id: string | null }) => row.auth_user_id)
    .filter((id): id is string => Boolean(id));
}

export async function createPanicAlertWithNotifications(
  input: CreatePanicAlertInput,
): Promise<CreatePanicAlertResult> {
  const { data, error } = await supabase
    .from("panic_alerts")
    .insert({
      guard_id: input.guardId,
      alert_type: input.alertType,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      location_id: input.locationId ?? null,
      description:
        input.description ||
        (input.alertType === "inactivity"
          ? "Inactivity alert triggered by monitor"
          : "Emergency SOS triggered from Guard App"),
      is_resolved: false,
    })
    .select("id, alert_time")
    .single();

  if (error) {
    throw error;
  }

  const supervisorIds = await getSecuritySupervisorIds();
  if (supervisorIds.length > 0) {
    await sendPanicAlertNotification(
      supervisorIds,
      input.guardName?.trim() || "A guard",
      input.locationText || undefined,
    );
  }

  return {
    success: true,
    alertId: data.id,
    alertTime: data.alert_time || new Date().toISOString(),
    supervisorCount: supervisorIds.length,
  };
}
