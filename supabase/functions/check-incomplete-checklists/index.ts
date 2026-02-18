// Supabase Edge Function: check-incomplete-checklists
// Detects guards with incomplete daily checklists and creates reminder alerts.
//
// Authentication: Requires CRON_SECRET header for cron/scheduler invocations.
//
// Deployment:
//   supabase functions deploy check-incomplete-checklists
//   supabase secrets set CRON_SECRET=your-secret-here

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface ChecklistResult {
  guard_id: string;
  guard_name: string;
  shift_name: string;
  completion_percentage: number;
  total_items: number;
  completed_items: number;
  minutes_remaining: number;
  alert_created: boolean;
  error_message: string | null;
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
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration', results: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    // Parse request body for parameters
    let threshold = 50.00;
    let onlyPastMidpoint = true;

    try {
      const body = await req.json();
      if (body.threshold !== undefined) {
        threshold = parseFloat(body.threshold);
      }
      if (body.only_past_midpoint !== undefined) {
        onlyPastMidpoint = Boolean(body.only_past_midpoint);
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Validate threshold
    if (isNaN(threshold) || threshold < 0 || threshold > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid threshold. Must be between 0 and 100.', results: [] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[check-incomplete-checklists] Starting detection with threshold: ${threshold}%, past_midpoint_only: ${onlyPastMidpoint}`);

    // Call the SQL function to detect incomplete checklists
    const { data, error } = await supabase.rpc('detect_incomplete_checklists', {
      p_completion_threshold: threshold,
      p_only_past_midpoint: onlyPastMidpoint
    });

    if (error) {
      console.error('[check-incomplete-checklists] Error calling detect_incomplete_checklists:', error);
      throw error;
    }

    const results: ChecklistResult[] = data || [];
    const alertsCreated = results.filter(r => r.alert_created);
    const notificationsSent = [];
    const notificationErrors = [];

    // Trigger Notifications
    if (alertsCreated.length > 0) {
       // Fetch Supervisors
       const { data: supervisors } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'security_supervisor', 'facility_manager']);

      const supervisorIds = supervisors?.map(s => s.user_id) || [];
      const distinctSupervisorIds = [...new Set(supervisorIds)];

      if (distinctSupervisorIds.length > 0) {
          for (const alert of alertsCreated) {
              for (const supervisorId of distinctSupervisorIds) {
                  const { error: notifyErr } = await supabase.functions.invoke('send-notification', {
                      body: {
                          user_id: supervisorId,
                          title: "Checklist Incompletion Alert",
                          body: `Guard ${alert.guard_name} has only completed ${alert.completion_percentage}% of checklists.`,
                          channel: 'fcm', // Warning level - Push only (Plan 3.2)
                          data: { 
                              type: 'checklist_incomplete', 
                              guard_id: alert.guard_id 
                          }
                      }
                  });

                  if (notifyErr) {
                      console.error(`[check-incomplete-checklists] Failed notification to ${supervisorId}:`, notifyErr);
                      notificationErrors.push({ supervisorId, error: notifyErr });
                  } else {
                      notificationsSent.push({ supervisorId, guardId: alert.guard_id });
                  }
              }
          }
      }
    }

    // Log summary
    console.log(`[check-incomplete-checklists] Complete: ${results.length} checked, ${alertsCreated.length} alerts, ${notificationsSent.length} notifications.`);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_checked: results.length,
          alerts_created: alertsCreated.length,
          notifications_sent: notificationsSent.length
        },
        results: results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[check-incomplete-checklists] Unexpected error:', err);

    return new Response(
      JSON.stringify({ error: err.message, results: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
