'use server'

import { createDatabaseClient } from '@/lib/supabase/client'
import { createAuthUser, deleteAuthUser, updateAuthUserPassword, updateAuthUserRole } from '@/lib/auth/server'
import { getCurrentUser } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'

export async function createStaff(formData: FormData) {
  const email = formData.get('email') as string
  const fullName = formData.get('fullName') as string
  const phone = formData.get('phone') as string
  const password = formData.get('password') as string

  if (!email || !fullName || !password) {
    throw new Error('이메일, 이름, 비밀번호는 필수입니다.')
  }

  if (password.length < 6) {
    throw new Error('비밀번호는 6자 이상이어야 합니다.')
  }

  try {
    // 1. Create auth user
    const authUser = await createAuthUser(email, password, 'staff')

    // 2. Create staff profile
    const supabase = createDatabaseClient()
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authUser.id,
      email,
      full_name: fullName,
      phone,
      role: 'staff',
    })

    if (profileError) {
      throw new Error(`프로필 생성 실패: ${profileError.message}`)
    }

    revalidatePath('/admin/staff')
    return { success: true, staffId: authUser.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : '직원 생성 중 오류 발생'
    throw new Error(message)
  }
}

/**
 * Update staff info (name, phone, password)
 */
export async function updateStaff(formData: FormData) {
  const staffId = formData.get('staffId') as string
  const fullName = formData.get('fullName') as string
  const phone = formData.get('phone') as string
  const newPassword = formData.get('newPassword') as string

  if (!staffId || !fullName) {
    throw new Error('직원 ID와 이름은 필수입니다.')
  }

  try {
    const supabase = createDatabaseClient()
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone })
      .eq('id', staffId)

    if (error) throw new Error(`정보 수정 실패: ${error.message}`)

    if (newPassword) {
      if (newPassword.length < 6) throw new Error('비밀번호는 6자 이상이어야 합니다.')
      await updateAuthUserPassword(staffId, newPassword)
    }

    revalidatePath('/admin/staff')
    return { success: true }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : '직원 정보 수정 중 오류 발생')
  }
}

/**
 * Delete staff (auth user + profile)
 */
export async function deleteStaff(staffId: string) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('관리자만 직원을 삭제할 수 있습니다.')
    }
    if (currentUser.id === staffId) {
      throw new Error('자기 자신은 삭제할 수 없습니다.')
    }

    // auth.users 삭제 (없어도 계속 진행)
    try {
      await deleteAuthUser(staffId)
    } catch {
      // auth user가 없는 경우 무시
    }

    // profiles 삭제
    const supabase = createDatabaseClient()
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', staffId)

    if (error) throw new Error(`프로필 삭제 실패: ${error.message}`)

    revalidatePath('/admin/staff')
    return { success: true }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : '직원 삭제 중 오류 발생')
  }
}

/**
 * Update staff role (admin/staff)
 */
export async function updateStaffRole(
  staffId: string,
  newRole: 'admin' | 'staff'
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('관리자만 권한을 변경할 수 있습니다.')
    }

    // 1. profiles 테이블 업데이트
    const supabase = createDatabaseClient()
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', staffId)

    if (error) throw new Error(`권한 변경 실패: ${error.message}`)

    // 2. auth.users user_metadata 업데이트
    await updateAuthUserRole(staffId, newRole)

    revalidatePath('/admin/staff')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : '권한 변경 중 오류 발생'
    throw new Error(message)
  }
}
