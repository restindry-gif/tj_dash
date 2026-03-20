import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Session as AuthSession } from '@supabase/supabase-js'

export type Session = AuthSession

/**
 * Get current session from request cookies
 * Must be called in a server component or server action
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
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
          } catch (error) {
            // Ignore in case of middleware
          }
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session
}

/**
 * Get current authenticated user
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const session = await getSession()

  if (!session) {
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.user_metadata?.role,
  }
}

/**
 * Get user role from session
 */
export async function getUserRole(): Promise<string | null> {
  const user = await getCurrentUser()
  return user?.role || null
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser()
  return !!user
}

/**
 * Check if user has admin role
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'admin'
}

/**
 * Check if user has staff role
 */
export async function isStaff(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'staff' || role === 'admin'
}

/**
 * Check if user has customer role
 */
export async function isCustomer(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'customer'
}
