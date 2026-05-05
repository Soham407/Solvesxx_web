"use client";

import { supabase } from "@/src/lib/supabaseClient";
import { sendNotification } from "@/src/lib/notifications";

interface SocietyManagerNotificationInput {
  societyId: string;
  title: string;
  body: string;
  notificationType: string;
  referenceId?: string;
  referenceType?: string;
  actionUrl?: string | null;
  priority?: "low" | "normal" | "high" | "critical";
}

export async function notifySocietyManager(
  input: SocietyManagerNotificationInput,
): Promise<boolean> {
  const { data: society, error } = await supabase
    .from("societies")
    .select("society_manager_id")
    .eq("id", input.societyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const managerId = society?.society_manager_id;
  if (!managerId) {
    return false;
  }

  const result = await sendNotification({
    user_id: managerId,
    title: input.title,
    body: input.body,
    channel: "fcm",
    data: {
      type: input.notificationType,
      priority: input.priority || "normal",
      ...(input.referenceId ? { reference_id: input.referenceId } : {}),
      ...(input.referenceType ? { reference_type: input.referenceType } : {}),
      ...(input.actionUrl ? { action_url: input.actionUrl } : {}),
    },
  });

  if (!result.success) {
    console.error("Failed to notify society manager:", result.error);
    return false;
  }

  return true;
}
