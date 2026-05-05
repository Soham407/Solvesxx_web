"use client";

import { sendNotification } from "@/src/lib/notifications";

interface AuthUserNotificationInput {
  userId: string;
  title: string;
  body: string;
  notificationType: string;
  referenceId?: string;
  referenceType?: string;
  actionUrl?: string | null;
  priority?: "low" | "normal" | "high" | "critical";
}

export async function notifyAuthUser(input: AuthUserNotificationInput): Promise<boolean> {
  const result = await sendNotification({
    user_id: input.userId,
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
    console.error("Failed to notify auth user:", result.error);
    return false;
  }

  return true;
}
