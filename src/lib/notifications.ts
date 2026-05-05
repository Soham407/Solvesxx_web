"use client";

import { supabase } from "@/src/lib/supabaseClient";
import type { Json } from "@/src/types/supabase";

interface NotificationPayload {
  user_id?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channel?: 'fcm' | 'sms' | 'both';
  mobile?: string;
}

function normalizeNotificationType(payload: NotificationPayload): string {
  const rawType = payload.data?.type;
  return typeof rawType === "string" && rawType.trim() ? rawType.trim() : "general";
}

function normalizePriority(payload: NotificationPayload): string {
  const rawPriority = payload.data?.priority;
  return typeof rawPriority === "string" && rawPriority.trim() ? rawPriority.trim() : "normal";
}

function normalizeActionUrl(payload: NotificationPayload): string | null {
  const rawActionUrl = payload.data?.action_url;
  if (typeof rawActionUrl === "string" && rawActionUrl.trim()) {
    return rawActionUrl.trim();
  }

  const rawRoute = payload.data?.route;
  if (typeof rawRoute === "string" && rawRoute.trim()) {
    return rawRoute.trim();
  }

  return null;
}

function normalizeReferenceId(payload: NotificationPayload): string | null {
  const rawReferenceId = payload.data?.reference_id;
  return typeof rawReferenceId === "string" && rawReferenceId.trim()
    ? rawReferenceId.trim()
    : null;
}

function normalizeReferenceType(payload: NotificationPayload): string | null {
  const rawReferenceType = payload.data?.reference_type;
  return typeof rawReferenceType === "string" && rawReferenceType.trim()
    ? rawReferenceType.trim()
    : null;
}

function toJsonValue(value: unknown): Json {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value as Json;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
        key,
        toJsonValue(entryValue),
      ]),
    ) as Json;
  }

  return String(value);
}

async function insertNotificationRow(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
  if (!payload.user_id) {
    return { success: false, error: "Missing user_id for notification" };
  }

  const notificationType = normalizeNotificationType(payload);
  const priority = normalizePriority(payload);
  const actionUrl = normalizeActionUrl(payload);
  const referenceId = normalizeReferenceId(payload);
  const referenceType = normalizeReferenceType(payload);
  const deliveryState = payload.channel === "sms" ? "created" : "push_queued";
  const fallbackState = payload.channel === "both" ? "queued" : "not_applicable";

  try {
    const { error } = await supabase.rpc("mobile_insert_notification", {
      p_user_id: payload.user_id,
      p_title: payload.title,
      p_body: payload.body,
      p_type: notificationType,
      p_priority: priority,
      p_action_url: actionUrl,
      p_data: toJsonValue(payload.data ?? {}),
      p_delivery_state: deliveryState,
      p_fallback_state: fallbackState,
    });

    if (error) {
      console.error("Notification insert failed:", error);

      const { error: fallbackError } = await supabase.from("notifications").insert({
        user_id: payload.user_id,
        title: payload.title,
        message: payload.body,
        notification_type: notificationType,
        priority,
        action_url: actionUrl,
        data: toJsonValue(payload.data ?? {}),
        delivery_state: deliveryState,
        fallback_state: fallbackState,
        ...(referenceId ? { reference_id: referenceId } : {}),
        ...(referenceType ? { reference_type: referenceType } : {}),
      });

      if (fallbackError) {
        console.error("Notification fallback insert failed:", fallbackError);
        return {
          success: false,
          error: fallbackError.message ?? error.message ?? "Failed to create notification",
        };
      }
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to create notification";
    console.error("Notification error:", err);
    return { success: false, error: errorMessage };
  }
}

export async function sendNotification(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
  return insertNotificationRow(payload);
}

/**
 * Send leave approval notification to employee
 */
export async function sendLeaveApprovalNotification(
  employeeUserId: string,
  leaveType: string,
  status: 'approved' | 'rejected',
  approverName: string
): Promise<void> {
  await sendNotification({
    user_id: employeeUserId,
    title: `Leave Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
    body: `Your ${leaveType} leave request has been ${status} by ${approverName}.`,
    channel: 'fcm',
    data: {
      type: 'leave_status_update',
      status,
    },
  });
}

/**
 * Send panic alert notification to supervisors
 */
export async function sendPanicAlertNotification(
  supervisorIds: string[],
  guardName: string,
  location?: string
): Promise<void> {
  const locationText = location ? ` at ${location}` : '';
  
  for (const supervisorId of supervisorIds) {
    await sendNotification({
      user_id: supervisorId,
      title: '🚨 EMERGENCY ALERT',
      body: `${guardName} has triggered a panic alert${locationText}. Immediate attention required!`,
      channel: 'both', // Send both push and SMS for panic alerts
      data: {
        type: 'panic_alert',
        priority: 'high',
      },
    });
  }
}

/**
 * Send invoice payment confirmation to buyer
 */
export async function sendInvoicePaymentNotification(
  buyerUserId: string,
  invoiceNumber: string,
  amount: number
): Promise<void> {
  await sendNotification({
    user_id: buyerUserId,
    title: 'Payment Confirmed',
    body: `Your payment of ₹${amount} for invoice ${invoiceNumber} has been received.`,
    channel: 'fcm',
    data: {
      type: 'invoice_paid',
      invoice_number: invoiceNumber,
    },
  });
}

/**
 * Send service completion notification
 */
export async function sendServiceCompletionNotification(
  userId: string,
  serviceType: string,
  requestNumber: string
): Promise<void> {
  await sendNotification({
    user_id: userId,
    title: 'Service Completed',
    body: `Your ${serviceType} service request (${requestNumber}) has been completed.`,
    channel: 'fcm',
    data: {
      type: 'service_completed',
      request_number: requestNumber,
    },
  });
}

/**
 * Send reorder alert notification to managers/admins
 */
export async function sendReorderAlertNotification(
  managerIds: string[],
  productName: string,
  alertType: 'low_stock' | 'out_of_stock'
): Promise<void> {
  const isOutOfStock = alertType === 'out_of_stock';
  for (const userId of managerIds) {
    await sendNotification({
      user_id: userId,
      title: isOutOfStock ? 'Stock Out' : 'Low Stock Alert',
      body: `${productName} is ${isOutOfStock ? 'out of stock' : 'below reorder level'}. Raise a Purchase Order.`,
      channel: 'fcm',
      data: {
        type: 'reorder_alert',
        alert_type: alertType,
        product_name: productName,
      },
    });
  }
}

/**
 * Send visitor arrival notification to resident
 * Includes visitor photo URL in the FCM data payload so the resident app can display the photo.
 */
export async function sendVisitorArrivalNotification(
  residentUserId: string,
  visitorName: string,
  flatNumber: string,
  photoUrl?: string
): Promise<void> {
  await sendNotification({
    user_id: residentUserId,
    title: 'New Visitor at Gate',
    body: `Dear Resident, ${visitorName} is at the gate for Flat ${flatNumber}.`,
    channel: 'both',
    data: {
      type: 'visitor_arrival',
      flat_number: flatNumber,
      ...(photoUrl ? { photo_url: photoUrl } : {}),
    },
  });
}
