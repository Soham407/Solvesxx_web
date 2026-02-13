// Supabase Edge Function: check-document-expiry
// Scans employee_documents for items expiring within 30 days and triggers notifications.
//
// Authentication: Requires CRON_SECRET header for cron/scheduler invocations.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Validate CRON_SECRET or Service Role
  const cronSecret = Deno.env.get('CRON_SECRET');
  const authHeader = req.headers.get('Authorization');
  const providedCronSecret = req.headers.get('x-cron-secret');

  const isAuthorized = (cronSecret && providedCronSecret === cronSecret) || 
                     (authHeader === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`);

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // 1. Find documents expiring in the next 30 days that haven't been notified yet today
    const { data: expiringDocs, error } = await supabase
      .from('employee_documents')
      .select('id, document_name, expiry_date, employee_id, employees(first_name, last_name)')
      .lt('expiry_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
      .gt('expiry_date', new Date().toISOString())
      .or(`expiry_notified_at.is.null,expiry_notified_at.lt.${new Date().toISOString().split('T')[0]}`);

    if (error) throw error;

    console.log(`[check-document-expiry] Found ${expiringDocs?.length || 0} expiring documents.`);

    const notifications = [];
    const updateIds = [];

    for (const doc of expiringDocs || []) {
      // Find the user_id for this employee
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('employee_id', doc.employee_id)
        .single();

      if (userData) {
        notifications.push({
          user_id: userData.id,
          notification_type: 'document_expiry',
          title: 'Document Expiring Soon',
          message: `Your document "${doc.document_name}" is set to expire on ${doc.expiry_date}. Please renew it soon.`,
          reference_type: 'employee_document',
          reference_id: doc.id,
          priority: 'high'
        });
        updateIds.push(doc.id);
      }
    }

    // 2. Insert notifications
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
      
      // 3. Update documents to mark as notified
      await supabase
        .from('employee_documents')
        .update({ expiry_notified_at: new Date().toISOString() })
        .in('id', updateIds);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      count: notifications.length 
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[check-document-expiry] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
