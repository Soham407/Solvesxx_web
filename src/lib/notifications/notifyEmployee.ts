"use client";

import { supabase } from "@/src/lib/supabaseClient";
import { sendNotification } from "@/src/lib/notifications";

interface EmployeeNotificationInput {
  employeeId: string;
  title: string;
  body: string;
  notificationType: string;
  referenceId?: string;
  referenceType?: string;
  actionUrl?: string | null;
  priority?: "low" | "normal" | "high" | "critical";
}

export async function notifyEmployee(
  input: EmployeeNotificationInput,
): Promise<boolean> {
  const { data: employee, error } = await supabase
    .from("employees")
    .select("auth_user_id")
    .eq("id", input.employeeId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const authUserId = employee?.auth_user_id;
  if (!authUserId) {
    return false;
  }

  const result = await sendNotification({
    user_id: authUserId,
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
    console.error("Failed to notify employee:", result.error);
    return false;
  }

  return true;
}
