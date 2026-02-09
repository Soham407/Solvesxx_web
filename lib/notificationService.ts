"use client";

import { supabase } from "@/src/lib/supabaseClient";

// ============================================
// Notification Types
// ============================================

export type NotificationType = 
  | 'panic_alert'
  | 'inactivity_alert'
  | 'geo_fence_breach'
  | 'checklist_reminder'
  | 'visitor_arrived'
  | 'visitor_checkout'
  | 'leave_status'
  | 'behavior_ticket'
  | 'general';

export type NotificationChannel = 'fcm' | 'sms' | 'in_app';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  priority?: NotificationPriority;
  data?: Record<string, string>;
  targetUserIds?: string[];
  targetRoles?: string[];
  targetPhone?: string; // For SMS
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  channel: NotificationChannel;
}

// ============================================
// Notification Service
// ============================================

/**
 * Unified notification service for FCM push and MSG91 SMS
 * 
 * Usage:
 * - FCM: Free, instant push notifications to web/mobile
 * - SMS: Paid (MSG91 ~Rs 0.20/msg), requires DLT registration for India
 * 
 * SMS is prepared but not active - requires:
 * 1. MSG91 account setup
 * 2. DLT registration (~Rs 5,900 one-time)
 * 3. Template approval from TRAI
 */
class NotificationService {
  
  /**
   * Send notification via Supabase Edge Function
   * The Edge Function handles FCM and SMS routing
   */
  async send(payload: NotificationPayload): Promise<NotificationResult[]> {
    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: payload,
      });

      if (error) {
        console.error('Notification service error:', error);
        return [{
          success: false,
          error: error.message,
          channel: 'fcm',
        }];
      }

      return data.results || [{
        success: true,
        messageId: data.messageId,
        channel: data.channel || 'fcm',
      }];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Notification send failed:', err);
      return [{
        success: false,
        error: errorMessage,
        channel: 'fcm',
      }];
    }
  }

  /**
   * Send panic alert notification to all supervisors/managers
   */
  async sendPanicAlert(params: {
    guardName: string;
    locationName: string;
    alertId: string;
    latitude?: number;
    longitude?: number;
  }): Promise<NotificationResult[]> {
    return this.send({
      type: 'panic_alert',
      title: '🚨 EMERGENCY PANIC ALERT',
      body: `Guard ${params.guardName} triggered an emergency at ${params.locationName}!`,
      priority: 'critical',
      targetRoles: ['admin', 'security_supervisor', 'society_manager'],
      data: {
        alertId: params.alertId,
        guardName: params.guardName,
        locationName: params.locationName,
        latitude: params.latitude?.toString() || '',
        longitude: params.longitude?.toString() || '',
        type: 'panic_alert',
        priority: 'critical',
      },
    });
  }

  /**
   * Send inactivity alert notification
   */
  async sendInactivityAlert(params: {
    guardName: string;
    guardId: string;
    lastSeenAt: string;
    locationName?: string;
  }): Promise<NotificationResult[]> {
    return this.send({
      type: 'inactivity_alert',
      title: '⚠️ Guard Inactivity Detected',
      body: `${params.guardName} has been inactive for 20+ minutes at ${params.locationName || 'unknown location'}`,
      priority: 'high',
      targetRoles: ['admin', 'security_supervisor', 'society_manager'],
      data: {
        guardId: params.guardId,
        guardName: params.guardName,
        lastSeenAt: params.lastSeenAt,
        type: 'inactivity_alert',
        priority: 'high',
      },
    });
  }

  /**
   * Send checklist reminder to guard
   */
  async sendChecklistReminder(params: {
    guardUserId: string;
    pendingItems: number;
    shiftEndTime: string;
  }): Promise<NotificationResult[]> {
    return this.send({
      type: 'checklist_reminder',
      title: '📋 Checklist Reminder',
      body: `You have ${params.pendingItems} pending checklist items. Shift ends at ${params.shiftEndTime}.`,
      priority: 'normal',
      targetUserIds: [params.guardUserId],
      data: {
        pendingItems: params.pendingItems.toString(),
        shiftEndTime: params.shiftEndTime,
        type: 'checklist_reminder',
      },
    });
  }

  /**
   * Send visitor arrival notification to resident
   */
  async sendVisitorArrived(params: {
    residentUserId: string;
    visitorName: string;
    visitorId: string;
    flatNumber: string;
  }): Promise<NotificationResult[]> {
    return this.send({
      type: 'visitor_arrived',
      title: '👋 Visitor at Gate',
      body: `${params.visitorName} has arrived at the gate for Flat ${params.flatNumber}`,
      priority: 'normal',
      targetUserIds: [params.residentUserId],
      data: {
        visitorId: params.visitorId,
        visitorName: params.visitorName,
        flatNumber: params.flatNumber,
        type: 'visitor_arrived',
      },
    });
  }

  /**
   * Create in-app notification record (always succeeds locally)
   */
  async createInAppNotification(params: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    referenceId?: string;
    priority?: NotificationPriority;
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: params.userId,
          notification_type: params.type,
          title: params.title,
          message: params.message,
          reference_type: params.type,
          reference_id: params.referenceId || null,
          priority: params.priority || 'normal',
          is_read: false,
        })
        .select('id')
        .single();

      if (error) throw error;

      return { success: true, id: data.id };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create notification';
      return { success: false, error: errorMessage };
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// ============================================
// MSG91 SMS Configuration (for future use)
// ============================================

/**
 * MSG91 SMS Integration Guide (India)
 * 
 * Setup Steps:
 * 1. Create account at https://msg91.com
 * 2. Complete DLT registration (~Rs 5,900):
 *    - Register on Jio DLT or VI DLT portal
 *    - Get Entity ID and Sender ID approved
 * 3. Create message templates:
 *    - Panic Alert: "ALERT: Guard {#var#} triggered emergency at {#var#}. Ref: {#var#}"
 *    - Checklist: "Reminder: {#var#} pending tasks. Shift ends {#var#}."
 * 4. Get template IDs after approval
 * 5. Add to .env:
 *    MSG91_AUTH_KEY=your_auth_key
 *    MSG91_SENDER_ID=FCLPRO (6 chars)
 *    MSG91_DLT_ENTITY_ID=your_entity_id
 *    MSG91_TEMPLATE_PANIC=template_id
 *    MSG91_TEMPLATE_CHECKLIST=template_id
 * 
 * Cost: ~Rs 0.20 per SMS (Transactional route)
 * DLT Fee: ~Rs 5,900 one-time
 * 
 * Note: SMS will be blocked without DLT registration
 */
export const MSG91_CONFIG = {
  baseUrl: 'https://api.msg91.com/api/v5',
  routes: {
    transactional: 4, // For alerts and OTPs
    promotional: 1,   // For marketing (not used)
  },
  // Template placeholders (approved via DLT)
  templates: {
    panic_alert: process.env.MSG91_TEMPLATE_PANIC,
    checklist_reminder: process.env.MSG91_TEMPLATE_CHECKLIST,
    visitor_arrived: process.env.MSG91_TEMPLATE_VISITOR,
  },
};
