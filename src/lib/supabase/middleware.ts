import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/src/types/supabase'
import { normalizePermissions } from '@/src/lib/platform/permissions'

/**
 * Updates the Supabase auth session by refreshing tokens via cookies.
 * This must be called in middleware on every request to protected routes.
 *
 * Returns { supabaseResponse, user } where user is null if not authenticated.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do NOT use getSession() here. getUser() sends a request to the
  // Supabase Auth server every time to revalidate the Auth token, while
  // getSession() reads from the local storage/cookie without validation.
  // Only trust getUser() for security-critical middleware checks.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let role: string | null = null;
  let permissions: string[] = []
  let isActive = true
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('is_active, roles!inner(role_name, permissions)')
      .eq('id', user.id)
      .maybeSingle();

    const roleData = Array.isArray((data as any)?.roles)
      ? (data as any)?.roles[0]
      : (data as any)?.roles

    role = roleData?.role_name || null
    permissions = normalizePermissions(roleData?.permissions)
    isActive = (data as any)?.is_active !== false
  }

  return { supabaseResponse, user, role, permissions, isActive }
}
