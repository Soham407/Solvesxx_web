// Supabase Edge Function: check-inactivity
// Checks GPS inactivity for clocked-in employees, creates panic alerts.
//
// Authentication: Requires CRON_SECRET header for cron/scheduler invocations.
//
// Deployment:
//   supabase functions deploy check-inactivity
//   supabase secrets set CRON_SECRET=your-secret-here
//
// Schedule (every 20 minutes):
//   Use pg_cron or external scheduler with header: x-cron-secret: <CRON_SECRET>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Get currently clocked-in employees
    const today = new Date().toISOString().split('T')[0];
    const { data: activeLogins, error: loginError } = await supabaseClient
      .from('attendance_logs')
      .select('employee_id, employees!inner(id, user_id, first_name, last_name)')
      .eq('log_date', today)
      .is('check_out_time', null);

    if (loginError) throw loginError;

    if (!activeLogins || activeLogins.length === 0) {
      return new Response(JSON.stringify({ message: "No active employees found" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const alertsTriggered: any[] = [];
    const INACTIVITY_THRESHOLD_MINUTES = 20;
    const thresholdTime = new Date(Date.now() - INACTIVITY_THRESHOLD_MINUTES * 60 * 1000).toISOString();

    for (const login of activeLogins) {
      // 2. Check last GPS update
      const { data: lastGps } = await supabaseClient
        .from('gps_tracking')
        .select('tracked_at')
        .eq('employee_id', login.employee_id)
        .order('tracked_at', { ascending: false })
        .limit(1)
        .single();

      // If no GPS data or last update is older than threshold
      if (!lastGps || lastGps.tracked_at < thresholdTime) {
        const empName = `${login.employees.first_name} ${login.employees.last_name}`;

        // Check if a recent alert already exists to avoid duplicates
        const recentThreshold = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 min cooldown
        const { data: existingAlert } = await supabaseClient
          .from('panic_alerts')
          .select('id')
          .eq('employee_id', login.employee_id)
          .eq('alert_type', 'inactivity')
          .gte('created_at', recentThreshold)
          .limit(1)
          .maybeSingle();

        if (existingAlert) {
          continue; // Skip — alert already created recently
        }

        const { error: alertError } = await supabaseClient
          .from('panic_alerts')
          .insert({
            employee_id: login.employee_id,
            alert_type: 'inactivity',
            status: 'pending',
            description: 'Automated: No GPS movement detected for 20+ minutes',
            latitude: 0,
            longitude: 0
          });

        if (alertError) console.error('Error creating panic alert:', alertError);
        else alertsTriggered.push({ employee: empName, status: 'Alert Created' });
      }
    }

    return new Response(
      JSON.stringify({ success: true, alerts: alertsTriggered }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[check-inactivity] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
