// Edge Function: Checklist Reminders
// Sends SMS/push notifications to guards with incomplete checklists at 9:00 AM

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface ChecklistReminderRequest {
  cron_secret?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify cron secret or allow internal service-role calls.
    const cronSecret = req.headers.get('x-cron-secret');
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const isAuthorized =
      cronSecret === Deno.env.get('CRON_SECRET') ||
      (serviceRoleKey ? authHeader === `Bearer ${serviceRoleKey}` : false);

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const remindersSent = [];
    const errors = [];

    // Find all active checklists
    const { data: checklists, error: checklistError } = await supabase
      .from('daily_checklists')
      .select('*')
      .eq('is_active', true);

    if (checklistError) throw checklistError;

    // Find all active security guards
    const { data: guards, error: guardError } = await supabase
      .from('security_guards')
      .select(`
        id,
        employee_id,
        employees!employee_id (
          id,
          first_name,
          last_name,
          mobile,
          auth_user_id
        )
      `)
      .eq('is_active', true);

    if (guardError) throw guardError;

    // SEC-H4 Fix: Use IST midnight for date comparison so "today" matches the
    // date visible on the guard's screen in India, not UTC which rolls over 5.5h earlier.
    const nowIST = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000));
    const today = nowIST.toISOString().split('T')[0]; // YYYY-MM-DD in IST

    // For each guard and checklist, check if response exists
    for (const guard of guards || []) {
      const employee = guard.employees;
      if (!employee) continue;

      for (const checklist of checklists || []) {
        // Check if response already exists for today
        const { data: existingResponse, error: responseError } = await supabase
          .from('checklist_responses')
          .select('id')
          .eq('checklist_id', checklist.id)
          .eq('employee_id', employee.id)
          .eq('response_date', today)
          .single();

        if (responseError && responseError.code !== 'PGRST116') {
          errors.push({
            guard: employee.first_name + ' ' + employee.last_name,
            checklist: checklist.checklist_name,
            error: responseError.message
          });
          continue;
        }

        // If no response found, send reminder
        if (!existingResponse) {
          // Create notification
          const { error: notifyError } = await supabase
            .from('notifications')
            .insert({
              user_id: employee.auth_user_id,
              title: 'Daily Checklist Reminder',
              body: `Please complete your checklist: ${checklist.checklist_name}`,
              type: 'checklist_reminder',
              data: {
                checklist_id: checklist.id,
                checklist_name: checklist.checklist_name
              }
            });

          if (notifyError) {
            errors.push({
              guard: employee.first_name + ' ' + employee.last_name,
              error: notifyError.message
            });
          } else {
            remindersSent.push({
              guard: employee.first_name + ' ' + employee.last_name,
              checklist: checklist.checklist_name,
              mobile: employee.mobile
            });

            // Here you would also integrate with SMS service
            // Example: await sendSMS(employee.mobile, `Reminder: Please complete ${checklist.checklist_name}`);
          }
        }
      }
    }

    // Log the job execution
    console.log(`Checklist reminders job completed at ${new Date().toISOString()}`);
    console.log(`Reminders sent: ${remindersSent.length}`);
    console.log(`Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        reminders_sent: remindersSent.length,
        reminders: remindersSent,
        errors: errors
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Checklist reminders error:', error);
    
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
