// Supabase Edge Function: check-incomplete-checklists
// Detects guards with incomplete daily checklists and creates reminder alerts
// 
// Deployment:
//   supabase functions deploy check-incomplete-checklists
//
// Manual Invocation:
//   curl -X POST 'https://<project>.supabase.co/functions/v1/check-incomplete-checklists' \
//     -H 'Authorization: Bearer <anon-key>' \
//     -H 'Content-Type: application/json' \
//     -d '{"threshold": 50, "only_past_midpoint": true}'
//
// Schedule (every 30 minutes after shift midpoint):
//   Use pg_cron or external scheduler to call this endpoint

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers - restrict to allowed origin
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChecklistResult {
  guard_id: string
  guard_name: string
  shift_name: string
  completion_percentage: number
  total_items: number
  completed_items: number
  minutes_remaining: number
  alert_created: boolean
  error_message: string | null
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing Supabase configuration',
          results: []
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })

    // Parse request body for parameters
    let threshold = 50.00
    let onlyPastMidpoint = true
    
    try {
      const body = await req.json()
      if (body.threshold !== undefined) {
        threshold = parseFloat(body.threshold)
      }
      if (body.only_past_midpoint !== undefined) {
        onlyPastMidpoint = Boolean(body.only_past_midpoint)
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Validate threshold
    if (isNaN(threshold) || threshold < 0 || threshold > 100) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid threshold. Must be between 0 and 100.',
          results: []
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`[check-incomplete-checklists] Starting detection with threshold: ${threshold}%, past_midpoint_only: ${onlyPastMidpoint}`)

    // Call the SQL function to detect incomplete checklists
    const { data, error } = await supabase.rpc('detect_incomplete_checklists', {
      p_completion_threshold: threshold,
      p_only_past_midpoint: onlyPastMidpoint
    })

    if (error) {
      console.error('[check-incomplete-checklists] Error calling detect_incomplete_checklists:', error)
      return new Response(
        JSON.stringify({ 
          error: `Failed to detect incomplete checklists: ${error.message}`,
          results: []
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const results: ChecklistResult[] = data || []
    
    // Log summary
    const incompleteCount = results.length
    const alertsCreated = results.filter(r => r.alert_created).length
    const belowThresholdCount = results.filter(r => r.completion_percentage < threshold && !r.alert_created).length
    
    console.log(`[check-incomplete-checklists] Detection complete: ${incompleteCount} incomplete guards found, ${alertsCreated} alerts created, ${belowThresholdCount} below threshold (existing alerts)`)

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        config: {
          completion_threshold: threshold,
          only_past_midpoint: onlyPastMidpoint
        },
        summary: {
          total_incomplete: incompleteCount,
          alerts_created: alertsCreated,
          below_threshold_existing_alerts: belowThresholdCount,
          checked_guards: results.length
        },
        results: results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (err) {
    console.error('[check-incomplete-checklists] Unexpected error:', err)
    
    return new Response(
      JSON.stringify({ 
        error: err instanceof Error ? err.message : 'Unknown error occurred',
        results: []
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
