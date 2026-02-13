// Supabase Edge Function: check-guard-inactivity
// Detects guards who haven't moved in 15+ minutes and creates alerts.
//
// Authentication: Requires CRON_SECRET header for cron/scheduler invocations.
//
// Deployment:
//   supabase functions deploy check-guard-inactivity
//   supabase secrets set CRON_SECRET=your-secret-here
//
// Schedule (every 5 minutes):
//   Use pg_cron or external scheduler with header: x-cron-secret: <CRON_SECRET>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface InactivityResult {
  guard_id: string;
  guard_name: string;
  minutes_inactive: number;
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

    // Get threshold from query param or use default (15 minutes)
    const url = new URL(req.url);
    const thresholdParam = url.searchParams.get('threshold');
    const thresholdMinutes = thresholdParam ? parseInt(thresholdParam, 10) : 15;

    // Validate threshold
    if (isNaN(thresholdMinutes) || thresholdMinutes < 1 || thresholdMinutes > 120) {
      return new Response(
        JSON.stringify({ error: 'Invalid threshold. Must be between 1 and 120 minutes.', results: [] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[check-guard-inactivity] Starting detection with threshold: ${thresholdMinutes} minutes`);

    // Call the SQL function to detect inactive guards
    const { data, error } = await supabase.rpc('detect_inactive_guards', {
      p_threshold_minutes: thresholdMinutes
    });

    if (error) {
      console.error('[check-guard-inactivity] Error calling detect_inactive_guards:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to detect inactive guards', results: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: InactivityResult[] = data || [];

    // Log summary
    const inactiveCount = results.length;
    const alertsCreated = results.filter(r => r.alert_created).length;

    console.log(`[check-guard-inactivity] Detection complete: ${inactiveCount} inactive guards found, ${alertsCreated} alerts created`);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        threshold_minutes: thresholdMinutes,
        summary: {
          total_inactive: inactiveCount,
          alerts_created: alertsCreated,
          checked_guards: results.length
        },
        results: results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[check-guard-inactivity] Unexpected error:', err);

    return new Response(
      JSON.stringify({ error: 'Internal server error', results: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
