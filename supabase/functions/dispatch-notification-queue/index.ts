import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  priority: string | null;
  action_url: string | null;
  data: Record<string, string | number | boolean | null> | null;
  delivery_state: string;
  fallback_state: string;
  sms_fallback_at: string | null;
}

interface DeliveryLog {
  channel?: string;
  status?: string;
}

function validateCronAuth(req: Request): boolean {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && req.headers.get('x-cron-secret') === cronSecret) {
    return true;
  }

  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  return Boolean(authHeader && serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`);
}

function isPushPending(value: string) {
  return value === 'created' || value === 'push_queued' || value === 'failed';
}

function isFallbackDue(row: NotificationRow, nowMs: number) {
  return (
    row.fallback_state === 'queued' &&
    (!row.sms_fallback_at || new Date(row.sms_fallback_at).getTime() <= nowMs)
  );
}

function isImmediateSos(row: NotificationRow) {
  return row.type === 'panic';
}

function toStringRecord(
  row: NotificationRow,
): Record<string, string> {
  const next: Record<string, string> = {
    notification_id: row.id,
    backendType: row.type,
  };

  if (row.action_url) {
    next.actionUrl = row.action_url;
  }

  if (row.data) {
    for (const [key, value] of Object.entries(row.data)) {
      if (value !== null && value !== undefined) {
        next[key] = String(value);
      }
    }
  }

  return next;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!validateCronAuth(req)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const now = new Date();
    const nowIso = now.toISOString();
    const nowMs = now.getTime();

    const { data, error } = await supabase
      .from('notifications')
      .select(
        'id, user_id, title, body, type, priority, action_url, data, delivery_state, fallback_state, sms_fallback_at',
      )
      .or('delivery_state.in.(created,push_queued,failed),fallback_state.eq.queued')
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as NotificationRow[];
    const summary = {
      processed: 0,
      pushDelivered: 0,
      pushFailed: 0,
      smsSent: 0,
      smsFailed: 0,
      skipped: 0,
    };

    for (const row of rows) {
      const pushPending = isPushPending(row.delivery_state);
      const fallbackDue = isFallbackDue(row, nowMs);

      if (!pushPending && !fallbackDue) {
        summary.skipped += 1;
        continue;
      }

      const channel =
        isImmediateSos(row) && pushPending
          ? 'both'
          : pushPending
            ? 'fcm'
            : 'sms';

      const { data: deliveryResponse, error: deliveryError } = await supabase.functions.invoke(
        'send-notification',
        {
          body: {
            notification_id: row.id,
            user_id: row.user_id,
            title: row.title,
            body: row.body,
            channel,
            data: toStringRecord(row),
          },
        },
      );

      if (deliveryError) {
        await supabase
          .from('notifications')
          .update({
            delivery_state: pushPending ? 'failed' : row.delivery_state,
            fallback_state: fallbackDue ? 'failed' : row.fallback_state,
          })
          .eq('id', row.id);
        summary.processed += 1;
        continue;
      }

      const logs = Array.isArray(deliveryResponse?.logs)
        ? (deliveryResponse.logs as DeliveryLog[])
        : [];
      const pushSucceeded = logs.some((entry) => entry.channel === 'fcm' && entry.status === 'sent');
      const pushFailed = logs.some((entry) => entry.channel === 'fcm' && entry.status === 'failed');
      const smsSucceeded = logs.some((entry) => entry.channel === 'sms' && entry.status === 'sent');
      const smsFailed = logs.some((entry) => entry.channel === 'sms' && entry.status === 'failed');

      const nextState: Record<string, string | null> = {};

      if (pushPending) {
        if (pushSucceeded) {
          nextState.delivery_state = 'delivered';
          nextState.delivered_at = nowIso;
        } else if (pushFailed) {
          nextState.delivery_state = 'failed';
        }
      }

      if (isImmediateSos(row) || fallbackDue) {
        if (smsSucceeded) {
          nextState.fallback_state = 'sent';
          nextState.sms_fallback_at = nowIso;
        } else if (smsFailed) {
          nextState.fallback_state = 'failed';
        }
      } else if (pushSucceeded && row.fallback_state === 'queued') {
        nextState.fallback_state = 'not_needed';
      }

      if (Object.keys(nextState).length > 0) {
        const { error: updateError } = await supabase
          .from('notifications')
          .update(nextState)
          .eq('id', row.id);

        if (updateError) {
          throw updateError;
        }
      }

      summary.processed += 1;
      if (pushSucceeded) summary.pushDelivered += 1;
      if (pushFailed) summary.pushFailed += 1;
      if (smsSucceeded) summary.smsSent += 1;
      if (smsFailed) summary.smsFailed += 1;
    }

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('[dispatch-notification-queue] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
