// Supabase Edge Function: check-document-expiry
// Scans for expiring items using `detect_expiring_items` RPC and triggers notifications.
//
// Authentication: Requires CRON_SECRET header for cron/scheduler invocations.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Validate CRON authorization
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

    // 1. Call Detection RPC
    const { data: expiringItems, error: rpcError } = await supabase
      .rpc('detect_expiring_items', { p_days_ahead: 30 }); // 30 days lookahead

    if (rpcError) throw rpcError;

    console.log(`[check-document-expiry] Found ${expiringItems?.length || 0} expiring items.`);

    const notificationsSent = [];
    const updateIds = [];

    // 2. Iterate and Notify
    for (const item of expiringItems || []) {
      // Determine Recipient based on Item Type
      let recipientUserId = null;
      let title = '';
      let body = '';
      let priority = item.severity === 'critical' ? 'high' : 'normal';

      if (item.item_type === 'document') {
        // Resolve Employee -> User
        const { data: docData } = await supabase
          .from('employee_documents')
          .select('employee_id, expiry_notified_at')
          .eq('id', item.item_id)
          .single();

        if (docData && !docData.expiry_notified_at) { // Avoid re-notifying if already flagged today (or handled by DB state in future)
           // For simplicity, we just check if it was notified recently. 
           // However, the RPC doesn't filter by 'already notified'.
           // The previous code had `.or(expiry_notified_at.is.null, ...)`
           // We'll re-implement that check here to be safe or rely on `expiry_notified_at` update.
           
           // Optimization: We could move this "already notified" check to the RPC or view, 
           // but for now we follow the plan: RPC detects, Function filters/delivers.
           
           const { data: userData } = await supabase
            .from('users')
            .select('id')
            .eq('employee_id', docData.employee_id)
            .single();

           if (userData) {
             recipientUserId = userData.id;
             title = item.severity === 'critical' ? 'CRITICAL: Document Expiring' : 'Document Expiring Soon';
             body = `Your document "${item.item_name}" expires in ${item.days_left} days.`;
             updateIds.push(item.item_id);
           }
        }
      } else if (item.item_type === 'chemical' || item.item_type === 'safety_equipment') {
        // Send to Facility Manager or Admin
        // For now, we'll try to find a user with role 'facility_manager' or 'admin' 
        // OR skip if no specific logic defined yet. The Plan focused on "Unified View".
        // We will log this for now.
        console.log(`[check-document-expiry] Unhandled item type for notification: ${item.item_type} (${item.item_name})`);
      }

      // 3. Send Notification if Recipient Found
      if (recipientUserId) {
        // Call send-notification function
        const { data: notifyRes, error: notifyErr } = await supabase.functions.invoke('send-notification', {
          body: {
            user_id: recipientUserId,
            title: title,
            body: body,
            channel: priority === 'high' ? 'both' : 'fcm', // Critical items get SMS
            data: { 
              type: 'expiry', 
              item_id: item.item_id, 
              item_type: item.item_type 
            }
          }
        });

        if (notifyErr) {
          console.error(`[check-document-expiry] Failed to notify ${recipientUserId}:`, notifyErr);
        } else {
          notificationsSent.push({ item_id: item.item_id, user_id: recipientUserId });
        }
      }
    }

    // 4. Update "Notified At" timestamp (specifically for documents, as they have the field)
    if (updateIds.length > 0) {
      await supabase
        .from('employee_documents')
        .update({ expiry_notified_at: new Date().toISOString() })
        .in('id', updateIds);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: expiringItems?.length,
      sent: notificationsSent.length 
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[check-document-expiry] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
