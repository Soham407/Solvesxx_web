"use client";

import { supabase } from "@/src/lib/supabaseClient";

interface NotificationPayload {
  user_id?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  channel?: 'fcm' | 'sms' | 'both';
  mobile?: string;
}

/**
 * Send notification via Supabase Edge Function
 * Supports FCM (push notifications) and SMS
 */
export async function sendNotification(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.functions.invoke('send-notification', {
      body: payload,
    });

    if (error) {
      console.error('Notification failed:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to send notification';
    console.error('Notification error:', err);
    return { success: false, error: errorMessage };
  }
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
