'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAuthUser, adminExists } from '@/lib/auth/server'
import { createDatabaseClient } from '@/lib/supabase/client'

/**
 * Login with email and password
 */
export async function loginAction(formData: FormData) {
  const email = (formData.get('email') as string)?.trim() || ''
  const password = (formData.get('password') as string)?.trim() || ''

  console.log('🔐 Login attempt:', { email, passwordLength: password.length })

  if (!email || !password) {
    throw new Error('이메일과 비밀번호를 입력해주세요.')
  }

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
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  console.log('🔐 Auth response:', {
    hasSession: !!data?.session,
    error: error?.message,
  })

  if (error) {
    console.error('❌ Login error:', error.message)
    throw new Error(
      `로그인 실패: ${error.message || '이메일 또는 비밀번호가 틀렸습니다.'}`
    )
  }

  if (!data.session) {
    console.error('❌ No session returned')
    throw new Error('로그인에 실패했습니다.')
  }

  console.log('✅ Login successful:', {
    email: data.session.user.email,
    role: data.session.user.user_metadata?.role,
  })

  // Redirect based on role
  const role = data.session.user.user_metadata?.role
  if (role === 'admin') {
    redirect('/admin')
  } else if (role === 'staff') {
    redirect('/staff')
  } else if (role === 'customer') {
    redirect('/customer')
  } else {
    redirect('/admin')
  }
}

/**
 * Create first admin account
 */
export async function setupAdminAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    throw new Error('이메일과 비밀번호를 입력해주세요.')
  }

  if (password.length < 6) {
    throw new Error('비밀번호는 6자 이상이어야 합니다.')
  }

  // Check if admin already exists
  const admin = await adminExists()
  if (admin) {
    throw new Error('관리자가 이미 존재합니다.')
  }

  // Create auth user
  const authUser = await createAuthUser(email, password, 'admin')

  // Create admin profile
  const supabase = createDatabaseClient()
  const { error: profileError } = await supabase.from('profiles').insert({
    id: authUser.id,
    email,
    full_name: '관리자',
    role: 'admin',
  })

  if (profileError) {
    throw new Error(`프로필 생성 실패: ${profileError.message}`)
  }

  redirect('/auth/login')
}

/**
 * Logout
 */
export async function logoutAction() {
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
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.signOut()
  redirect('/auth/login')
}

/**
 * Change password
 */
export async function changePasswordAction(formData: FormData) {
  const oldPassword = formData.get('oldPassword') as string
  const newPassword = formData.get('newPassword') as string

  if (!oldPassword || !newPassword) {
    throw new Error('현재 비밀번호와 새 비밀번호를 입력해주세요.')
  }

  if (newPassword.length < 6) {
    throw new Error('새 비밀번호는 6자 이상이어야 합니다.')
  }

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
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // First verify old password by attempting login
  const { data: user } = await supabase.auth.getUser()
  if (!user.user?.email) {
    throw new Error('사용자를 찾을 수 없습니다.')
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.user.email,
    password: oldPassword,
  })

  if (signInError) {
    throw new Error('현재 비밀번호가 틀렸습니다.')
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    throw new Error(`비밀번호 변경 실패: ${updateError.message}`)
  }

  return { success: true }
}
