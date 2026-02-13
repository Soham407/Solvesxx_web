// Supabase Edge Function: send-notification
// Sends push notifications via Firebase Cloud Messaging (FCM), with SMS placeholder.
//
// Authentication: Validates the caller's JWT via Supabase Auth.
// Also allows service role key as Bearer token for internal function-to-function calls.
//
// Deployment:
//   supabase functions deploy send-notification

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import admin from "npm:firebase-admin@11.11.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '',
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
    console.error('FIREBASE_SERVICE_ACCOUNT env var not set');
  }
}

interface NotificationRequest {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  channel?: 'fcm' | 'sms' | 'both';
}

/**
 * Validate the caller is authenticated.
 * Accepts either:
 * 1. A valid user JWT (validated via supabase.auth.getUser())
 * 2. The service role key as Bearer token (for internal function-to-function calls)
 */
async function validateAuth(req: Request): Promise<{ authorized: boolean; userId?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { authorized: false };
  }

  // Check if it's the service role key (internal calls)
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
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

  // Authenticate the request
  const auth = await validateAuth(req);
  if (!auth.authorized) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized. Provide a valid JWT or service role Bearer token.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Service role client for DB operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, title, body, data, channel = 'fcm' }: NotificationRequest = await req.json();

    if (!user_id || !title || !body) {
      throw new Error('Missing required fields: user_id, title, body');
    }

    const logs: any[] = [];
    const messaging = admin.messaging();

    // 1. Send Push Notifications (FCM)
    if (channel === 'fcm' || channel === 'both') {
      const { data: tokens, error: tokenError } = await supabaseClient
        .from('push_tokens')
        .select('token')
        .eq('user_id', user_id)
        .eq('is_active', true);

      if (tokenError) {
        console.error('Error fetching tokens:', tokenError);
      } else if (tokens && tokens.length > 0) {
        // Send to each token
        const promises = tokens.map(async (t) => {
          try {
            await messaging.send({
              token: t.token,
              notification: {
                title,
                body,
              },
              data: data || {},
            });
            return { token: t.token, status: 'sent', error: null };
          } catch (error: any) {
            // Handle invalid tokens
            if (error.code === 'messaging/registration-token-not-registered') {
              // Mark as inactive
              await supabaseClient
                .from('push_tokens')
                .update({ is_active: false })
                .eq('token', t.token);
            }
            return { token: t.token, status: 'failed', error: error.message };
          }
        });

        const results = await Promise.all(promises);

        results.forEach(res => {
          logs.push({
            user_id,
            channel: 'fcm',
            status: res.status,
            error_message: res.error,
            sent_at: new Date().toISOString()
          });
        });
      } else {
        logs.push({
          user_id,
          channel: 'fcm',
          status: 'failed',
          error_message: 'No active tokens found',
          sent_at: new Date().toISOString()
        });
      }
    }

    // 2. Send SMS (MSG91 Integration)
    if (channel === 'sms' || channel === 'both') {
      const msg91ApiKey = Deno.env.get('MSG91_API_KEY');
      const senderId = Deno.env.get('SMS_SENDER_ID');

      if (!msg91ApiKey) {
        console.warn('[send-notification] MSG91_API_KEY not found. Skipping SMS.');
        logs.push({
          user_id,
          channel: 'sms',
          status: 'failed',
          error_message: 'MSG91_API_KEY not configured',
          sent_at: new Date().toISOString()
        });
      } else {
        // Fetch phone number from profile
        const { data: profile } = await supabaseClient
          .from('users')
          .select('phone')
          .eq('id', user_id)
          .single();

        if (profile?.phone) {
          try {
            // MSG91 API call (Flow/Transactional)
            // Note: Standard MSG91 flow requires mobile number without '+'
            const cleanPhone = profile.phone.replace(/\D/g, ''); 
            
            const msgResponse = await fetch('https://api.msg91.com/api/v5/otp/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'authkey': msg91ApiKey
              },
              body: JSON.stringify({
                template_id: Deno.env.get('MSG91_TEMPLATE_ID'),
                mobile: cleanPhone,
                authkey: msg91ApiKey,
                sender: senderId || 'FACITY',
                message: body // Using body as the raw message content
              })
            });

            if (msgResponse.ok) {
              logs.push({
                user_id,
                channel: 'sms',
                status: 'sent',
                recipient_phone: profile.phone,
                sent_at: new Date().toISOString()
              });
            } else {
              const errData = await msgResponse.text();
              throw new Error(`MSG91 Error: ${errData}`);
            }
          } catch (smsErr: any) {
            console.error('[send-notification] SMS Error:', smsErr);
            logs.push({
              user_id,
              channel: 'sms',
              status: 'failed',
              error_message: smsErr.message,
              sent_at: new Date().toISOString()
            });
          }
        } else {
          logs.push({
            user_id,
            channel: 'sms',
            status: 'failed',
            error_message: 'Recipient phone number missing in profile',
            sent_at: new Date().toISOString()
          });
        }
      }
    }

    // 3. Log results
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
      JSON.stringify({ error: 'Internal server error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
