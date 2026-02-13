// Supabase Edge Function: check-checklist
// Checks if guards have completed checklists before shift ends (~2 hours), sends reminders.
//
// Authentication: Requires CRON_SECRET header for cron/scheduler invocations.
// Internal calls to send-notification use SUPABASE_SERVICE_ROLE_KEY as Bearer token.
//
// Deployment:
//   supabase functions deploy check-checklist
//   supabase secrets set CRON_SECRET=your-secret-here
//
// Schedule (hourly):
//   Use pg_cron or external scheduler with header: x-cron-secret: <CRON_SECRET>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

/**
 * Validate that the request is from an authorized cron scheduler.
 * Checks the x-cron-secret header against the CRON_SECRET env var.
 * Also allows requests with a valid SUPABASE_SERVICE_ROLE_KEY as Bearer token
 * (for internal function-to-function calls).
 */
function validateCronAuth(req: Request): boolean {
  // Check x-cron-secret header
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && req.headers.get('x-cron-secret') === cronSecret) {
    return true;
  }

  // Allow service role key as Bearer token (for internal calls / Supabase cron)
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (authHeader && serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
    return true;
  }

  return false;
}

/**
 * Parse a time string "HH:MM:SS" or "HH:MM" into total minutes since midnight.
 */
function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
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

    const now = new Date();
    const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const today = now.toISOString().split('T')[0];

    // Get active assignments
    const { data: assignments, error: assignError } = await supabaseClient
      .from('employee_shift_assignments')
      .select(`
        employee_id,
        employees!inner(user_id, first_name, last_name),
        shift:shifts!inner(id, end_time)
      `)
      .eq('is_active', true)
      .lte('assigned_from', today)
      .or(`assigned_to.is.null,assigned_to.gte.${today}`);

    if (assignError) throw assignError;

    const alertsSent: any[] = [];

    for (const assignment of assignments) {
      const shiftEndTime = assignment.shift.end_time; // "20:00:00"
      const shiftEndMinutes = parseTimeToMinutes(shiftEndTime);

      // Check if shift ends in approximately 1.5 to 2.5 hours (90 to 150 minutes)
      let diffMinutes = shiftEndMinutes - nowMinutes;
      // Handle midnight crossover
      if (diffMinutes < -720) diffMinutes += 1440;
      if (diffMinutes > 720) diffMinutes -= 1440;

      if (diffMinutes < 90 || diffMinutes > 150) {
        continue; // Shift doesn't end in ~2 hours, skip
      }

      // Check if checklist is completed
      const { data: checklistResponse } = await supabaseClient
        .from('checklist_responses')
        .select('is_complete')
        .eq('employee_id', assignment.employee_id)
        .eq('response_date', today)
        .maybeSingle();

      if (!checklistResponse || !checklistResponse.is_complete) {
        // Trigger Reminder
        const empName = `${assignment.employees.first_name} ${assignment.employees.last_name}`;

        // Send Push Notification
        if (assignment.employees.user_id) {
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: assignment.employees.user_id,
              title: "Checklist Reminder",
              body: "Your shift ends in 2 hours. Please complete your daily checklist.",
              channel: "fcm"
            })
          });
          alertsSent.push({ employee: empName, status: "Reminder Sent" });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, reminders: alertsSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[check-checklist] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
