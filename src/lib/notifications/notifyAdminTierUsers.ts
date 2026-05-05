"use client";

import { supabase } from "@/src/lib/supabaseClient";
import { sendNotification } from "@/src/lib/notifications";

interface AdminTierNotificationInput {
  title: string;
  body: string;
  notificationType: string;
  referenceId?: string;
  referenceType?: string;
  actionUrl?: string | null;
  priority?: "low" | "normal" | "high" | "critical";
}

const ADMIN_DESIGNATIONS = [
  "Admin",
  "Security Supervisor",
  "Society Manager",
  "Company HOD",
];

export async function notifyAdminTierUsers(
  input: AdminTierNotificationInput,
): Promise<number> {
  const { data: recipients, error } = await supabase
    .from("employees")
    .select("auth_user_id, designations!inner(designation_name)")
    .eq("is_active", true)
    .or(
      ADMIN_DESIGNATIONS.map((designation) => `designation_name.eq.${designation}`).join(","),
      { referencedTable: "designations" },
    );

  if (error) {
    throw error;
  }

  let notifiedCount = 0;

  for (const recipient of recipients || []) {
    const authUserId = (recipient as { auth_user_id: string | null }).auth_user_id;
    if (!authUserId) {
      continue;
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

    if (result.success) {
      notifiedCount += 1;
    } else {
      console.error("Failed to notify admin tier user:", result.error);
    }
  }

  return notifiedCount;
}
