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
 * Soft-delete a case (move to trash)
 */
export async function deleteCase(caseId: string): Promise<{ error?: string }> {
  try {
    const user = await requireAdmin()
    const supabase = createDatabaseClient()
    const { error } = await supabase
      .from('cases')
      .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
      .eq('id', caseId)
    if (error) return { error: error.message }
    revalidatePath('/admin')
    revalidatePath('/admin/cases')
    revalidatePath('/admin/trash')
    return {}
  } catch (err) {
    return { error: (err as Error).message }
  }
}

/**
 * Restore a soft-deleted case
 */
export async function restoreCase(caseId: string): Promise<{ error?: string }> {
  try {
    await requireAdmin()
    const supabase = createDatabaseClient()
    const { error } = await supabase
      .from('cases')
      .update({ deleted_at: null, deleted_by: null })
      .eq('id', caseId)
    if (error) return { error: error.message }
    revalidatePath('/admin')
    revalidatePath('/admin/cases')
    revalidatePath('/admin/trash')
    return {}
  } catch (err) {
    return { error: (err as Error).message }
  }
}

/**
 * Permanently delete a case
 */
export async function permanentDeleteCase(caseId: string): Promise<{ error?: string }> {
  try {
    await requireAdmin()
    const supabase = createDatabaseClient()
    const { error } = await supabase.from('cases').delete().eq('id', caseId)
    if (error) return { error: error.message }
    revalidatePath('/admin/trash')
    return {}
  } catch (err) {
    return { error: (err as Error).message }
  }
}

/**
 * Auto-purge cases deleted more than 3 days ago
 */
export async function purgeExpiredCases(): Promise<void> {
  const supabase = createDatabaseClient()
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  await supabase
    .from('cases')
    .delete()
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoff)
}

/**
 * Update case basic info (title, consultation_notes, description)
 */
export async function updateCaseInfo(
  caseId: string,
  data: { title: string; consultationNotes: string; description: string }
) {
  await requireAdminOrStaff()
  const supabase = createDatabaseClient()

  const { error } = await supabase
    .from('cases')
    .update({
      title: data.title,
      consultation_notes: data.consultationNotes,
      description: data.description,
    })
    .eq('id', caseId)

  if (error) throw new Error(`사건 정보 변경 실패: ${error.message}`)

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

interface SearchParams {
  search?: string
  dateFrom?: string
  dateTo?: string
  assignedStaffId?: string | null
  statuses?: string[]
  starredOnly?: boolean
  offset: number
  limit: number
}

/**
 * 검색 & 필터로 사건 목록 조회
 */
export async function searchCases(params: SearchParams) {
  const supabase = createDatabaseClient()

  let query = supabase
    .from('cases')
    .select('id, title, status, created_at, is_starred, client_id, assigned_staff_id, description, consultation_notes, deleted_at, profiles!assigned_staff_id(full_name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // 검색 (title, description, consultation_notes)
  if (params.search?.trim()) {
    const terms = params.search.trim().split(/\s+/)
    const searchConditions = terms
      .map((term) => `title.ilike.%${term}%,description.ilike.%${term}%,consultation_notes.ilike.%${term}%`)
      .join(',')
    query = query.or(searchConditions)
  }

  // 날짜 범위
  if (params.dateFrom) {
    query = query.gte('created_at', `${params.dateFrom}T00:00:00`)
  }
  if (params.dateTo) {
    query = query.lte('created_at', `${params.dateTo}T23:59:59`)
  }

  // 담당자
  if (params.assignedStaffId !== undefined) {
    if (params.assignedStaffId === null) {
      query = query.is('assigned_staff_id', null)
    } else {
      query = query.eq('assigned_staff_id', params.assignedStaffId)
    }
  }

  // 상태 (다중 선택)
  if (params.statuses && params.statuses.length > 0) {
    query = query.in('status', params.statuses)
  }

  // 중요만
  if (params.starredOnly) {
    query = query.eq('is_starred', true)
  }

  // 페이지네이션
  query = query.range(params.offset, params.offset + params.limit - 1)

  const { data, error } = await query

  if (error) {
    console.error('searchCases error:', JSON.stringify(error, null, 2))
    console.error('Error code:', (error as any).code)
    console.error('Error status:', (error as any).status)
    throw new Error(`Failed to search cases: ${JSON.stringify(error)}`)
  }

  return data || []
}

/**
 * 사건 중요 표시 토글
 */
export async function toggleStarred(caseId: string) {
  const supabase = createDatabaseClient()

  // 현재 값 조회
  const { data: currentCase, error: fetchError } = await supabase
    .from('cases')
    .select('is_starred')
    .eq('id', caseId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch case: ${fetchError.message}`)
  }

  // 토글
  const { error: updateError } = await supabase
    .from('cases')
    .update({ is_starred: !currentCase.is_starred })
    .eq('id', caseId)

  if (updateError) {
    throw new Error(`Failed to update case: ${updateError.message}`)
  }

  return { id: caseId, is_starred: !currentCase.is_starred }
}
