'use server'

import { createDatabaseClient } from '@/lib/supabase/client'
import { createAuthUser, getAuthUserByEmail } from '@/lib/auth/server'
import { getCurrentUser } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireAdminOrStaff() {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
    throw new Error('권한이 없습니다.')
  }
  return user
}

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    throw new Error('관리자만 가능합니다.')
  }
  return user
}

export async function createCase(formData: FormData): Promise<{ error: string } | void> {
  const supabase = createDatabaseClient()

  const clientMode = formData.get('clientMode') // 'new' or 'existing'
  let clientId = formData.get('clientId') as string

  // 1. Handle Client Creation if New
  if (clientMode === 'new') {
    const email = formData.get('clientEmail') as string
    const fullName = formData.get('clientName') as string
    const phone = formData.get('clientPhone') as string
    const password = (formData.get('clientPassword') as string) || 'temp1234'

    // Create auth user first, use auth user's ID as profile ID
    let authUserId: string | null = null
    try {
      const authUser = await createAuthUser(email, password, 'customer')
      authUserId = authUser.id
    } catch (e1) {
      // Email already registered — reuse existing auth user
      try {
        const existing = await getAuthUserByEmail(email)
        authUserId = existing?.id ?? null
      } catch {
        authUserId = null
      }
    }

    if (!authUserId) {
      return { error: '고객 계정 생성에 실패했습니다. 이메일을 확인해주세요.' }
    }

    clientId = authUserId

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: clientId,
        email,
        full_name: fullName,
        phone,
        role: 'customer'
      })

    if (profileError) {
      return { error: `고객 프로필 생성 실패: ${profileError.message}` }
    }
  }

  // 2. Create Case
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const consultationNotes = formData.get('consultationNotes') as string
  const assignedStaffId = formData.get('assignedStaffId') as string || null
  const status = formData.get('status') as string || 'pending'

  const { error: caseError } = await supabase
    .from('cases')
    .insert({
      title,
      description,
      consultation_notes: consultationNotes,
      client_id: clientId,
      assigned_staff_id: assignedStaffId,
      status
    })

  if (caseError) {
    return { error: `사건 등록 실패: ${caseError.message}` }
  }

  revalidatePath('/admin')
  redirect('/admin')
}

export async function updateCaseStatus(caseId: string, status: string) {
  await requireAdminOrStaff()
  const supabase = createDatabaseClient()

  const { error } = await supabase
    .from('cases')
    .update({ status })
    .eq('id', caseId)

  if (error) {
    console.error('사건 상태 업데이트 오류:', error)
    throw new Error(`상태 변경 실패: ${error.message}`)
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/cases/${caseId}`)
  revalidatePath('/staff')
  revalidatePath(`/staff/cases/${caseId}`)
}

/**
 * Update case assigned staff
 */
export async function updateCaseAssignedStaff(
  caseId: string,
  assignedStaffId: string | null
) {
  await requireAdmin()
  const supabase = createDatabaseClient()

  const { error } = await supabase
    .from('cases')
    .update({ assigned_staff_id: assignedStaffId })
    .eq('id', caseId)

  if (error) {
    console.error('직원 배정 업데이트 오류:', error)
    throw new Error(`직원 배정 변경 실패: ${error.message}`)
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/cases/${caseId}`)
  return { success: true }
}

/**
 * Toggle report sharing status with customer
 */
export async function toggleReportShare(
  reportId: string,
  caseId: string,
  shouldShare: boolean
): Promise<{ error?: string }> {
  try {
    await requireAdminOrStaff()
    const supabase = createDatabaseClient()

    // Verify report belongs to this case
    const { data: report, error: fetchError } = await supabase
      .from('case_reports')
      .select('id, case_id')
      .eq('id', reportId)
      .eq('case_id', caseId)
      .single()

    if (fetchError || !report) {
      return { error: 'Report not found' }
    }

    // Toggle share status
    const { error: updateError } = await supabase
      .from('case_reports')
      .update({ is_shared_with_customer: shouldShare })
      .eq('id', reportId)
      .eq('case_id', caseId)

    if (updateError) {
      console.error('Toggle share error:', updateError)
      return { error: 'Failed to update share status' }
    }

    // Revalidate customer case page to reflect changes
    revalidatePath(`/customer/cases/${caseId}`)

    return {}
  } catch (err) {
    console.error('toggleReportShare error:', err)
    return { error: 'An error occurred' }
  }
}

/**
 * 보고카드 소프트 삭제 (휴지통으로 이동)
 */
export async function deleteReport(
  reportId: string,
  caseId: string
): Promise<{ error?: string }> {
  try {
    const { getCurrentUser } = await import('@/lib/auth/session')
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') return { error: '관리자만 삭제할 수 있습니다.' }

    const supabase = createDatabaseClient()
    const { error } = await supabase
      .from('case_reports')
      .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
      .eq('id', reportId)
      .eq('case_id', caseId)

    if (error) return { error: error.message }

    revalidatePath(`/admin/cases/${caseId}`)
    revalidatePath('/admin/trash')
    return {}
  } catch (err) {
    return { error: (err as Error).message }
  }
}

/**
 * 휴지통에서 복구
 */
export async function restoreReport(
  reportId: string,
  caseId: string
): Promise<{ error?: string }> {
  try {
    const { getCurrentUser } = await import('@/lib/auth/session')
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') return { error: '관리자만 복구할 수 있습니다.' }

    const supabase = createDatabaseClient()
    const { error } = await supabase
      .from('case_reports')
      .update({ deleted_at: null, deleted_by: null })
      .eq('id', reportId)

    if (error) return { error: error.message }

    revalidatePath(`/admin/cases/${caseId}`)
    revalidatePath('/admin/trash')
    return {}
  } catch (err) {
    return { error: (err as Error).message }
  }
}

/**
 * 영구 삭제
 */
export async function permanentDeleteReport(
  reportId: string
): Promise<{ error?: string }> {
  try {
    const { getCurrentUser } = await import('@/lib/auth/session')
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') return { error: '관리자만 영구 삭제할 수 있습니다.' }

    const supabase = createDatabaseClient()
    const { error } = await supabase
      .from('case_reports')
      .delete()
      .eq('id', reportId)

    if (error) return { error: error.message }

    revalidatePath('/admin/trash')
    return {}
  } catch (err) {
    return { error: (err as Error).message }
  }
}

/**
 * 3일 지난 항목 자동 영구 삭제
 */
export async function purgeExpiredReports(): Promise<void> {
  const supabase = createDatabaseClient()
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  await supabase
    .from('case_reports')
    .delete()
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoff)
}
