"use client";

import { supabase } from "@/src/lib/supabaseClient";
import { sendNotification } from "@/src/lib/notifications";

interface SupplierNotificationInput {
  supplierId: string;
  title: string;
  body: string;
  notificationType: string;
  referenceId?: string;
  referenceType?: string;
  actionUrl?: string | null;
  priority?: "low" | "normal" | "high" | "critical";
}

export async function notifySupplierUsers(input: SupplierNotificationInput): Promise<number> {
  const { data: supplierUsers, error } = await supabase
    .from("users")
    .select("id")
    .eq("supplier_id", input.supplierId);

  if (error) {
    throw error;
  }

  let notifiedCount = 0;

  for (const supplierUser of supplierUsers || []) {
    const result = await sendNotification({
      user_id: supplierUser.id,
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
      console.error("Failed to notify supplier portal user:", result.error);
    }
  }

  return notifiedCount;
}
