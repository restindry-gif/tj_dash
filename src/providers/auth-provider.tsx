'use client'

import { createContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  role?: string
}

export interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  logout: () => Promise<void>
  isAdmin: boolean
  isStaff: boolean
  isCustomer: boolean
}

export const AuthContext = createContext<AuthContextType | null>(null)

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Initialize from existing session
    supabaseClient.auth.getSession().then(({ data }) => {
      const session = data.session
      if (session) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          role: session.user.user_metadata?.role,
        })
      }
      setLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          role: session.user.user_metadata?.role,
        })
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const logout = async () => {
    try {
      await supabaseClient.auth.signOut()
      setUser(null)
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const isAdmin = user?.role === 'admin'
  const isStaff = user?.role === 'staff' || user?.role === 'admin'
  const isCustomer = user?.role === 'customer'

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        logout,
        isAdmin,
        isStaff,
        isCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
