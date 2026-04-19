// Supabase Edge Function: dispatch-notification-queue
//
// Processes queued push notifications created by mobile RPCs
// (create_mobile_visitor, start_mobile_panic_alert, resolve_mobile_panic_alert).
//
// Called internally by pg_cron via trigger_mobile_notification_queue() every 60 seconds.
// Auth: service_role key passed as Bearer token by the DB function — NOT a user JWT.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import admin from "npm:firebase-admin@11.11.1";

const BATCH_LIMIT = 50;

function getServiceRoleKey() {
  return Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

function parseFirebaseServiceAccount(): Record<string, unknown> | null {
  const rawValue = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
  const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY");
  const candidates: string[] = [];

  if (rawValue) {
    candidates.push(rawValue);

    try {
      candidates.push(atob(rawValue));
    } catch {
      // Not standard base64 encoded; ignore.
    }

    try {
      const normalized = rawValue.replace(/-/g, "+").replace(/_/g, "/");
      const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
      candidates.push(atob(normalized + padding));
    } catch {
      // Not base64url encoded; ignore.
    }
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      const serviceAccount = (
        parsed?.type === "service_account" && parsed.private_key
          ? parsed
          : parsed?.service_account
      ) as Record<string, unknown> | undefined;

      if (!serviceAccount) {
        continue;
      }
      const parsedPrivateKey = serviceAccount.private_key;
      if (typeof parsedPrivateKey === "string") {
        serviceAccount.private_key = parsedPrivateKey.replace(/\\n/g, "\n");
      }

      if (
        typeof serviceAccount.project_id !== "string" ||
        typeof serviceAccount.client_email !== "string" ||
        typeof serviceAccount.private_key !== "string"
      ) {
        continue;
      }

      return serviceAccount;
    } catch {
      // Try the next encoding.
    }
  }

  if (projectId && clientEmail && privateKey) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    };
  }

  console.error("[dispatch] Firebase credentials not configured in a supported format");
  return null;
}

// Initialize Firebase Admin once
if (!admin.apps.length) {
  const serviceAccount = parseFirebaseServiceAccount();
  if (serviceAccount) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (e) {
      console.error("[dispatch] Firebase initialization error:", e);
    }
  }
}

interface QueuedNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  data: Record<string, unknown> | null;
  delivery_state: string;
  fallback_state: string;
  sms_fallback_at: string | null;
}

async function claimQueuedNotifications(
  supabase: ReturnType<typeof createClient>,
): Promise<QueuedNotification[]> {
  const { data: candidates, error: fetchError } = await supabase
    .from("notifications")
    .select("id")
    .eq("delivery_state", "push_queued")
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (fetchError) {
    throw fetchError;
  }

  if (!candidates || candidates.length === 0) {
    return [];
  }

  const candidateIds = candidates.map((row) => row.id);
  const { data: claimed, error: claimError } = await supabase
    .from("notifications")
    .update({ delivery_state: "processing" })
    .in("id", candidateIds)
    .eq("delivery_state", "push_queued")
    .select("id, user_id, title, message, notification_type, data, delivery_state, fallback_state, sms_fallback_at");

  if (claimError) {
    throw claimError;
  }

  return (claimed ?? []) as QueuedNotification[];
}

function validateServiceRole(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return false;

  const token = authHeader.replace("Bearer ", "");
  const serviceRoleKey = getServiceRoleKey();
  if (!serviceRoleKey) return false;

  return token === serviceRoleKey;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200 });
  }

  if (!validateServiceRole(req)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    getServiceRoleKey()
  );

  const stats = { processed: 0, delivered: 0, failed: 0, skipped: 0 };
  const logs: Array<Record<string, unknown>> = [];

  try {
    // Claim a batch first so overlapping cron invocations do not double-send.
    let queued: QueuedNotification[] = [];
    try {
      queued = await claimQueuedNotifications(supabase);
    } catch (fetchError) {
      console.error("[dispatch] Claim error:", fetchError);
      return new Response(
        JSON.stringify({
          error: fetchError instanceof Error ? fetchError.message : String(fetchError),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!queued || queued.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No queued notifications", stats }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const firebaseReady = admin.apps.length > 0;
    const messaging = firebaseReady ? admin.messaging() : null;

    for (const notification of queued as QueuedNotification[]) {
      stats.processed++;

      if (!firebaseReady || !messaging) {
        // Firebase not configured — mark as failed so it doesn't loop forever
        await supabase
          .from("notifications")
          .update({ delivery_state: "failed" })
          .eq("id", notification.id);

        logs.push({
          notification_id: notification.id,
          user_id: notification.user_id,
          channel: "fcm",
          status: "failed",
          error_message: "Firebase not configured",
          sent_at: new Date().toISOString(),
        });
        stats.failed++;
        continue;
      }

      // Look up active FCM tokens for this user
      const { data: tokens, error: tokenError } = await supabase
        .from("push_tokens")
        .select("token")
        .eq("user_id", notification.user_id)
        .eq("token_type", "fcm")
        .eq("is_active", true);

      if (tokenError) {
        console.error(`[dispatch] Token lookup error for ${notification.user_id}:`, tokenError);
        await supabase
          .from("notifications")
          .update({ delivery_state: "failed" })
          .eq("id", notification.id);

        logs.push({
          notification_id: notification.id,
          user_id: notification.user_id,
          channel: "fcm",
          status: "failed",
          error_message: `Token lookup: ${tokenError.message}`,
          sent_at: new Date().toISOString(),
        });
        stats.failed++;
        continue;
      }

      const activeTokens = (tokens ?? []).filter((row) =>
        typeof row.token === "string" && row.token.trim().length > 0
      );

      if (activeTokens.length === 0) {
        // No tokens registered — mark failed, don't retry
        await supabase
          .from("notifications")
          .update({ delivery_state: "failed" })
          .eq("id", notification.id);

        logs.push({
          notification_id: notification.id,
          user_id: notification.user_id,
          channel: "fcm",
          status: "failed",
          error_message: "No active FCM tokens for user",
          sent_at: new Date().toISOString(),
        });
        stats.failed++;
        continue;
      }

      // Build FCM data payload (stringify all values as FCM requires string values)
      const fcmData: Record<string, string> = {};
      if (notification.data && typeof notification.data === "object") {
        for (const [key, value] of Object.entries(notification.data)) {
          if (value !== null && value !== undefined) {
            fcmData[key] = String(value);
          }
        }
      }
      fcmData["notification_type"] = notification.notification_type;

      let anySuccess = false;

      for (const tokenRow of activeTokens) {
        try {
          const channelId =
            notification.notification_type === "sos_alert"
              ? "critical"
              : notification.notification_type === "visitor_at_gate"
                ? "high"
                : "high";

          await messaging.send({
            token: tokenRow.token,
            notification: {
              title: notification.title,
              body: notification.message,
            },
            android: {
              priority: "high",
              notification: {
                channelId,
                priority: "high",
                defaultSound: true,
              },
            },
            data: fcmData,
          });
          anySuccess = true;

          logs.push({
            notification_id: notification.id,
            user_id: notification.user_id,
            channel: "fcm",
            status: "sent",
            sent_at: new Date().toISOString(),
          });
        } catch (sendError: unknown) {
          const errorMessage = sendError instanceof Error ? sendError.message : String(sendError);
          const errorCode = (sendError as { code?: string })?.code;

          // Deactivate invalid tokens
          if (errorCode === "messaging/registration-token-not-registered" ||
              errorCode === "messaging/invalid-registration-token") {
            await supabase
              .from("push_tokens")
              .update({ is_active: false })
              .eq("token", tokenRow.token);
          }

          logs.push({
            notification_id: notification.id,
            user_id: notification.user_id,
            channel: "fcm",
            status: "failed",
            error_message: errorMessage,
            sent_at: new Date().toISOString(),
          });
        }
      }

      // Update notification delivery state
      if (anySuccess) {
        await supabase
          .from("notifications")
          .update({
            delivery_state: "delivered",
            delivered_at: new Date().toISOString(),
          })
          .eq("id", notification.id);
        stats.delivered++;
      } else {
        await supabase
          .from("notifications")
          .update({ delivery_state: "failed" })
          .eq("id", notification.id);
        stats.failed++;
      }
    }

    // Bulk insert logs
    if (logs.length > 0) {
      const { error: logError } = await supabase
        .from("notification_logs")
        .insert(logs);

      if (logError) {
        console.error("[dispatch] Log insert error:", logError);
      }
    }

    console.log(`[dispatch] Processed ${stats.processed}: ${stats.delivered} delivered, ${stats.failed} failed`);

    return new Response(
      JSON.stringify({ success: true, stats }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[dispatch] Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
