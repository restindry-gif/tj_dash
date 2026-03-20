'use server'

import { createDatabaseClient } from '@/lib/supabase/client'
import { createAuthUser, deleteAuthUser, updateAuthUserPassword, getAuthUserByEmail } from '@/lib/auth/server'
import { revalidatePath } from 'next/cache'

export async function updateCustomer(
  id: string,
  data: { full_name: string; email: string; phone: string; notes: string }
): Promise<{ error: string } | void> {
  const supabase = createDatabaseClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: data.full_name || null,
      email: data.email,
      phone: data.phone || null,
      notes: data.notes || null,
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/customers')
  revalidatePath(`/admin/customers/${id}`)
}

export async function deleteCustomer(id: string) {
  const supabase = createDatabaseClient()

  // 사건에서 client_id 연결 해제
  await supabase.from('cases').update({ client_id: null }).eq('client_id', id)

  // 프로필 삭제
  await supabase.from('profiles').delete().eq('id', id)

  // Auth 유저 삭제
  try {
    await deleteAuthUser(id)
  } catch {
    // auth 유저가 없을 수도 있음
  }

  revalidatePath('/admin/customers')
}

export async function resetCustomerPassword(id: string, newPassword: string): Promise<{ error: string } | void> {
  if (newPassword.length < 6) return { error: '비밀번호는 6자 이상이어야 합니다.' }

  const supabase = createDatabaseClient()

  // Fetch profile to get email
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, role')
    .eq('id', id)
    .single()

  if (!profile?.email) return { error: '고객 이메일을 찾을 수 없습니다.' }

  try {
    let authUserId: string

    const authUser = await getAuthUserByEmail(profile.email)
    if (authUser) {
      await updateAuthUserPassword(authUser.id, newPassword)
      authUserId = authUser.id
    } else {
      // No auth account yet — create one
      const newAuthUser = await createAuthUser(profile.email, newPassword, 'customer')
      authUserId = newAuthUser.id
    }

    // If auth user ID differs from profile ID, migrate references
    if (authUserId !== id) {
      await supabase.from('profiles').insert({
        id: authUserId,
        email: profile.email,
        full_name: profile.full_name,
        phone: profile.phone,
        role: profile.role,
      })
      await supabase.from('cases').update({ client_id: authUserId }).eq('client_id', id)
      await supabase.from('profiles').delete().eq('id', id)
    }
  } catch (e) {
    return { error: (e as Error).message || '비밀번호 변경에 실패했습니다.' }
  }
}
