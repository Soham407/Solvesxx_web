import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    // 2. Send SMS (Placeholder for MSG91)
    if (channel === 'sms' || channel === 'both') {
      // TODO: Integrate MSG91 API here
      console.log(`[MSG91] Would send SMS to user ${user_id}: ${body}`);
      
      logs.push({
        user_id,
        channel: 'sms',
        status: 'skipped',
        error_message: 'SMS provider not configured',
        sent_at: new Date().toISOString()
      });
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
