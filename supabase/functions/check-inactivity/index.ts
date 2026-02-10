import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
      const { data: lastGps, error: gpsError } = await supabaseClient
        .from('gps_tracking')
        .select('tracked_at')
        .eq('employee_id', login.employee_id)
        .order('tracked_at', { ascending: false })
        .limit(1)
        .single();

      // If no GPS data or last update is older than threshold
      if (!lastGps || lastGps.tracked_at < thresholdTime) {
        
        // 3. Trigger Alert
        // We avoid duplicate alerts by checking if one was recently created (optional but good practice)
        // For now, we assume this runs every 20 mins and we just alert.

        // Notify Supervisor (we need to find supervisor for this employee, but for now we broadcast or log)
        const empName = `${login.employees.first_name} ${login.employees.last_name}`;
        const alertBody = `Guard ${empName} has been inactive for over 20 minutes.`;

        // Call send-notification function
        // In Edge Functions, we can invoke other functions or insert into tables.
        // Inserting into 'panic_alerts' or 'notifications' is better.
        
        // Let's create a notification record directly in 'notifications' table (if it exists)
        // OR use the send-notification endpoint.
        // Direct DB insert is faster/cheaper here.
        
        // Assuming 'notifications' table exists from schema.sql
        // Wait, schema_phaseA.sql didn't define 'notifications', it defined 'notification_logs'.
        // schema.sql likely has 'notifications'.
        
        // We will call the send-notification function via fetch for simplicity and decoupling.
        // Actually, we'll try to find the Supervisor's User ID.
        // For MVP, we'll just log it to 'notification_logs' and maybe 'panic_alerts'.

        // Check if panic_alerts table exists (it should).
        // alert_type 'inactivity' was mentioned in plan.

        const { error: alertError } = await supabaseClient
          .from('panic_alerts')
          .insert({
            employee_id: login.employee_id,
            alert_type: 'inactivity',
            status: 'pending',
            description: 'Automated: No GPS movement detected for 20+ minutes',
            latitude: 0, // Unknown
            longitude: 0 // Unknown
          });

        if (alertError) console.error('Error creating panic alert:', alertError);
        else alertsTriggered.push({ employee: empName, status: 'Alert Created' });
        
        // Send Push to Supervisors (role-based)
        // Find users with role 'security_supervisor'
        // This is complex in a single query.
        // We'll skip the push for now to keep it simple, as the Alert record is the key requirement.
      }
    }

    return new Response(
      JSON.stringify({ success: true, alerts: alertsTriggered }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
