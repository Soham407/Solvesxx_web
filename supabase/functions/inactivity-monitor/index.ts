// Edge Function: Guard Inactivity Monitor
// Detects guards who haven't moved in 30+ minutes and triggers panic alerts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify cron secret
    const cronSecret = req.headers.get('x-cron-secret');
    if (cronSecret !== Deno.env.get('CRON_SECRET')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const inactivityThresholdMinutes = await getSystemConfigNumber(
      supabase,
      'guard_inactivity_threshold_minutes',
      30
    );

    const alertsCreated = [];
    const errors = [];

    // Find all active guards with their latest GPS position
    const { data: guards, error: guardError } = await supabase
      .from('security_guards')
      .select(`
        id,
        employee_id,
        assigned_location_id,
        employees!employee_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq('is_active', true);

    if (guardError) throw guardError;

    const inactivityThreshold = new Date(
      Date.now() - inactivityThresholdMinutes * 60 * 1000
    ).toISOString();

    for (const guard of guards || []) {
      try {
        const employee = guard.employees;
        if (!employee) continue;

        // Get latest GPS position
        const { data: latestPosition, error: posError } = await supabase
          .from('gps_tracking')
          .select('*')
          .eq('employee_id', employee.id)
          .order('tracked_at', { ascending: false })
          .limit(1)
          .single();

        if (posError) {
          if (posError.code !== 'PGRST116') {
            errors.push({
              guard: employee.first_name + ' ' + employee.last_name,
              error: posError.message
            });
          }
          continue;
        }

        // Check if position is older than 30 minutes
        if (latestPosition && latestPosition.tracked_at < inactivityThreshold) {
          // Check if alert already exists for this guard in last hour
          const { data: existingAlert, error: alertCheckError } = await supabase
            .from('panic_alerts')
            .select('id')
            .eq('guard_id', guard.id)
            .eq('alert_type', 'inactivity')
            .gt('alert_time', new Date(Date.now() - 60 * 60 * 1000).toISOString())
            .eq('is_resolved', false)
            .limit(1);

          if (alertCheckError) {
            errors.push({
              guard: employee.first_name + ' ' + employee.last_name,
              error: alertCheckError.message
            });
            continue;
          }

          // Only create alert if none exists
          if (!existingAlert || existingAlert.length === 0) {
            // Create panic alert
            const { data: alert, error: alertError } = await supabase
                .from('panic_alerts')
                .insert({
                  guard_id: guard.id,
                  alert_type: 'inactivity',
                  description: `Guard has been stationary for more than ${inactivityThresholdMinutes} minutes. Last movement: ${latestPosition.tracked_at}`,
                  latitude: latestPosition.latitude,
                  longitude: latestPosition.longitude,
                  location_id: guard.assigned_location_id,
                is_resolved: false,
                alert_time: new Date().toISOString()
              })
              .select()
              .single();

            if (alertError) {
              errors.push({
                guard: employee.first_name + ' ' + employee.last_name,
                error: alertError.message
              });
            } else {
              alertsCreated.push({
                guard: employee.first_name + ' ' + employee.last_name,
                alert_id: alert.id,
                last_movement: latestPosition.tracked_at,
                location: `Lat: ${latestPosition.latitude}, Lng: ${latestPosition.longitude}`
              });

              // Notify supervisors
              const { data: supervisors } = await supabase
                .from('employees')
                .select('auth_user_id')
                .in('designation', ['Security Supervisor', 'Society Manager', 'Admin'])
                .eq('is_active', true);

              for (const supervisor of supervisors || []) {
                if (supervisor.auth_user_id) {
                  await supabase.from('notifications').insert({
                    user_id: supervisor.auth_user_id,
                    title: '🚨 Guard Inactivity Alert',
                    body: `${employee.first_name} ${employee.last_name} has been stationary for ${inactivityThresholdMinutes}+ minutes`,
                    type: 'panic_alert',
                    data: {
                      alert_id: alert.id,
                      guard_id: guard.id,
                      alert_type: 'inactivity'
                    }
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        errors.push({
          guard: guard.employees?.first_name + ' ' + guard.employees?.last_name,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    // Log the job execution
    console.log(`Inactivity monitor job completed at ${new Date().toISOString()}`);
    console.log(`Alerts created: ${alertsCreated.length}`);
    console.log(`Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        alerts_created: alertsCreated.length,
        alerts: alertsCreated,
        errors: errors,
        total_guards_checked: guards?.length || 0
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Inactivity monitor error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
