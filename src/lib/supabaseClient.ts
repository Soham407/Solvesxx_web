/**
 * Browser-side Supabase client.
 *
 * Re-exports the @supabase/ssr browser client for backward compatibility.
 * All existing hooks that import `supabase` from this module will continue to work.
 *
 * Auth tokens are now stored in cookies (not localStorage), enabling
 * server-side session validation in middleware.
 */
import { createClient } from '@/src/lib/supabase/client'
import { SupabaseClient } from '@supabase/supabase-js'

export const supabase: SupabaseClient<any> = createClient() as any
