import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/src/types/supabase'

/**
 * Creates a Supabase client for use in Server Components, Route Handlers, and Server Actions.
 * Reads/writes auth tokens from/to cookies for proper SSR session management.
 *
 * Must be called inside an async function (Server Component or Route Handler).
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method is called from a Server Component where
            // cookies cannot be set. This can be safely ignored if you have
            // middleware refreshing user sessions.
          }
        },
      },
    }
  )
}
