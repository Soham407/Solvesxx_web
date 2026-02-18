// Supabase Edge Function: send-notification
// Sends push notifications via Firebase Cloud Messaging (FCM) and SMS via MSG91 Flow API.
//
// Authentication: Validates the caller's JWT via Supabase Auth.
// Also allows service role key as Bearer token for internal function-to-function calls.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import admin from "npm:firebase-admin@11.11.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
  if (serviceAccountStr) {
    try {
      const serviceAccount = JSON.parse(serviceAccountStr);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (e) {
      console.error('Error parsing FIREBASE_SERVICE_ACCOUNT:', e);
    }
  } else {
    // Optional: Log but don't crash if Firebase isn't critical for SMS-only flows
    console.error('FIREBASE_SERVICE_ACCOUNT env var not set');
  }
}

interface NotificationRequest {
  user_id?: string; // Optional if sending to specific non-user mobile
  title: string;
  body: string;
  data?: Record<string, string>;
  channel?: 'fcm' | 'sms' | 'both';
  mobile?: string; // Optional direct mobile override
}

/**
 * Validate the caller is authenticated.
 */
async function validateAuth(req: Request): Promise<{ authorized: boolean; userId?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { authorized: false };
  }

  // Check if it's the service role key (internal calls)
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  // Handle "Bearer <key>" format
  const token = authHeader.replace('Bearer ', '');
  if (serviceRoleKey && token === serviceRoleKey) {
    return { authorized: true, userId: 'service-role' };
  }

  // Validate as a user JWT
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { authorized: false };
  }

  return { authorized: true, userId: user.id };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const auth = await validateAuth(req);
  if (!auth.authorized) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, title, body, data, channel = 'fcm', mobile }: NotificationRequest = await req.json();

    if ((!user_id && !mobile) || !title || !body) {
      throw new Error('Missing required fields: user_id (or mobile), title, body');
    }

    const logs: any[] = [];
    const messaging = admin.messaging();

    // 1. Send Push Notifications (FCM)
    // Only if user_id is present (FCM tokens are linked to users)
    if (user_id && (channel === 'fcm' || channel === 'both')) {
      const { data: tokens, error: tokenError } = await supabaseClient
        .from('push_tokens')
        .select('token')
        .eq('user_id', user_id)
        .eq('is_active', true);

      if (tokenError) {
        console.error('Error fetching tokens:', tokenError);
      } else if (tokens && tokens.length > 0) {
        const promises = tokens.map(async (t) => {
          try {
            await messaging.send({
              token: t.token,
              notification: { title, body },
              data: data || {},
            });
            return { token: t.token, status: 'sent', error: null };
          } catch (error: any) {
             if (error.code === 'messaging/registration-token-not-registered') {
              await supabaseClient
                .from('push_tokens')
                .update({ is_active: false })
                .eq('token', t.token);
            }
            return { token: t.token, status: 'failed', error: error.message };
          }
        });

        const results = await Promise.all(promises);
        results.forEach(res => logs.push({ user_id, channel: 'fcm', status: res.status, error_message: res.error, sent_at: new Date().toISOString() }));
      }
    }

    // 2. Send SMS (MSG91 Flow API)
    if (channel === 'sms' || channel === 'both') {
      const msg91ApiKey = Deno.env.get('MSG91_API_KEY');
      const msg91TemplateId = Deno.env.get('MSG91_TEMPLATE_ID'); // Ensure this ID is for a Flow
      
      let targetMobile = mobile;

      if (!targetMobile && user_id) {
         const { data: profile } = await supabaseClient
          .from('users')
          .select('phone')
          .eq('id', user_id)
          .single();
        targetMobile = profile?.phone;
      }

      if (!msg91ApiKey || !msg91TemplateId) {
        logs.push({ user_id, channel: 'sms', status: 'failed', error_message: 'MSG91 Config Missing', sent_at: new Date().toISOString() });
      } else if (targetMobile) {
        try {
          // New Flow API Implementation
          const cleanPhone = targetMobile.replace(/\D/g, ''); 
           // MSG91 Flow API structure
          const flowUrl = "https://api.msg91.com/api/v5/flow/";
          
          const payload = {
            template_id: msg91TemplateId,
            sender: Deno.env.get('SMS_SENDER_ID') || 'FACITY',
            short_url: "0",
            recipients: [
              {
                mobiles: cleanPhone,
                var1: title, // Mapping title to first variable
                var2: body,  // Mapping body to second variable
                // Add more vars if your template needs them
              }
            ]
          };

          const response = await fetch(flowUrl, {
            method: "POST",
            headers: {
              "authkey": msg91ApiKey,
              "content-type": "application/json"
            },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            logs.push({ user_id, channel: 'sms', status: 'sent', recipient_phone: cleanPhone, sent_at: new Date().toISOString() });
          } else {
            const errText = await response.text();
            throw new Error(`MSG91 Flow Error: ${errText}`);
          }

        } catch (smsErr: any) {
           logs.push({ user_id, channel: 'sms', status: 'failed', error_message: smsErr.message, sent_at: new Date().toISOString() });
        }
      } else {
         logs.push({ user_id, channel: 'sms', status: 'failed', error_message: 'No mobile found', sent_at: new Date().toISOString() });
      }
    }

    // 3. Log results to DB
    if (logs.length > 0) {
      await supabaseClient.from('notification_logs').insert(logs);
    }

    return new Response(
      JSON.stringify({ success: true, logs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[send-notification] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
