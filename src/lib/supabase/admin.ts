import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/src/types/supabase'

/**
 * Creates a Supabase admin client for use in Server Components, Route Handlers, and Server Actions.
 * USES SERVICE ROLE KEY - NEVER EXPOSE TO BROWSER.
 * Bypass RLS and can perform admin operations.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase URL or Service Role Key is missing')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
