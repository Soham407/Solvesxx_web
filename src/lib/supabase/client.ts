import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/src/types/supabase'

/**
 * Creates a Supabase client for use in browser/client components.
 * Uses @supabase/ssr which stores auth tokens in cookies (not localStorage),
 * enabling proper server-side session validation in middleware.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
