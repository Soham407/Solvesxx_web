// Supabase Edge Function: check-guard-inactivity
// Detects guards who haven't moved in 15+ minutes and creates alerts.
//
// Authentication: Requires CRON_SECRET header for cron/scheduler invocations.
//
// Deployment:
//   supabase functions deploy check-guard-inactivity
//   supabase secrets set CRON_SECRET=your-secret-here

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface InactivityResult {
  guard_id: string;
  guard_name: string;
  minutes_inactive: number;
  alert_created: boolean;
  error_message: string | null;
  supervisor_id?: string; // If the RPC returns this
}

async function getSystemConfigNumber(
  supabase: ReturnType<typeof createClient>,
  key: string,
  fallback: number
): Promise<number> {
  const { data, error } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error || !data?.value) {
    return fallback;
  }

  const parsed = Number(data.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Validate that the request is from an authorized cron scheduler.
 */
function validateCronAuth(req: Request): boolean {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && req.headers.get('x-cron-secret') === cronSecret) {
    return true;
  }

  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (authHeader && serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
    return true;
  }

  return false;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Authenticate the request
  if (!validateCronAuth(req)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized. Provide a valid x-cron-secret header or service role Bearer token.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration', results: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    // Get threshold from query param or fall back to system configuration.
    const url = new URL(req.url);
    const thresholdParam = url.searchParams.get('threshold');
    const thresholdMinutes = thresholdParam
      ? parseInt(thresholdParam, 10)
      : await getSystemConfigNumber(
          supabase,
          'guard_inactivity_threshold_minutes',
          30
        );

    console.log(`[check-guard-inactivity] Starting detection with threshold: ${thresholdMinutes} minutes`);

    // Call the SQL function to detect inactive guards
    const { data: results, error } = await supabase.rpc('detect_inactive_guards', {
      p_threshold_minutes: thresholdMinutes
    });

    if (error) {
      console.error('[check-guard-inactivity] Error calling detect_inactive_guards:', error);
      throw error;
    }

    const inactiveGuards: InactivityResult[] = results || [];
    const alertsCreated = inactiveGuards.filter(r => r.alert_created);

    const notificationsSent = [];
    const notificationErrors = [];

    // Trigger Notifications for created alerts
    if (alertsCreated.length > 0) {
      // Fetch Supervisors or Admin to notify
      // Schema: users.role_id FK → roles.id, roles.role_name is a user_role enum
      const { data: supervisors } = await supabase
        .from('users')
        .select('id, roles!inner(role_name)')
        .in('roles.role_name', ['admin', 'security_supervisor', 'society_manager'])
        .eq('is_active', true);

      const supervisorIds = supervisors?.map((s: { id: string }) => s.id) || [];
      const distinctSupervisorIds = [...new Set(supervisorIds)];

      if (distinctSupervisorIds.length > 0) {
          for (const alert of alertsCreated) {
              for (const supervisorId of distinctSupervisorIds) {
                  const { error: notifyErr } = await supabase.functions.invoke('send-notification', {
                      body: {
                          user_id: supervisorId,
                          title: "Guard Inactivity Alert",
                          body: `Guard ${alert.guard_name} has been inactive for ${alert.minutes_inactive} minutes.`,
                          channel: 'both', // Critical - send SMS + Push
                          data: { 
                              type: 'inactivity', 
                              guard_id: alert.guard_id 
                          }
                      }
                  });

                  if (notifyErr) {
                      console.error(`[check-guard-inactivity] Failed notification to ${supervisorId}:`, notifyErr);
                      notificationErrors.push({ supervisorId, error: notifyErr });
                  } else {
                      notificationsSent.push({ supervisorId, guardId: alert.guard_id });
                  }
              }
          }
      } else {
          console.warn('[check-guard-inactivity] No supervisors found to notify.');
      }
    }

    // Log summary
    console.log(`[check-guard-inactivity] Complete: ${inactiveGuards.length} inactive, ${alertsCreated.length} alerts, ${notificationsSent.length} notifications.`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_inactive: inactiveGuards.length,
          alerts_created: alertsCreated.length,
          notifications_sent: notificationsSent.length
        },
        results: inactiveGuards
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[check-guard-inactivity] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: err.message, results: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
