'use server'

import { createDatabaseClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'

export async function requestOriginalPhoto(
  reportId: string,
  caseId: string
): Promise<{ error: string } | void> {
  const user = await getCurrentUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const supabase = createDatabaseClient()

  // 본인 사건의 보고인지 확인
  const { data: report } = await supabase
    .from('case_reports')
    .select('id, case_id')
    .eq('id', reportId)
    .single()

  if (!report) return { error: '보고를 찾을 수 없습니다.' }

  const { data: caseData } = await supabase
    .from('cases')
    .select('id')
    .eq('id', report.case_id)
    .eq('client_id', user.id)
    .single()

  if (!caseData) return { error: '권한이 없습니다.' }

  const { error } = await supabase
    .from('case_reports')
    .update({ original_requested: true })
    .eq('id', reportId)

  if (error) return { error: error.message }

  revalidatePath(`/customer/cases/${caseId}`)
}

async function verifyReportOwnership(reportId: string, userId: string) {
  const supabase = createDatabaseClient()
  // step 1: report → case_id
  const { data: report } = await supabase
    .from('case_reports')
    .select('id, case_id')
    .eq('id', reportId)
    .single()
  if (!report) return null
  // step 2: case must belong to user
  const { data: caseData } = await supabase
    .from('cases')
    .select('id')
    .eq('id', report.case_id)
    .eq('client_id', userId)
    .single()
  if (!caseData) return null
  return report
}

export async function toggleReportCheck(
  reportId: string,
  caseId: string,
  checked: boolean
): Promise<{ error: string } | void> {
  const user = await getCurrentUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const report = await verifyReportOwnership(reportId, user.id)
  if (!report) return { error: '권한이 없습니다.' }

  const supabase = createDatabaseClient()
  const { error } = await supabase
    .from('case_reports')
    .update({ client_checked: checked })
    .eq('id', reportId)

  if (error) return { error: error.message }
  revalidatePath(`/customer/cases/${caseId}`)
}

export async function submitReportComment(
  reportId: string,
  caseId: string,
  comment: string
): Promise<{ error: string } | void> {
  const user = await getCurrentUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const report = await verifyReportOwnership(reportId, user.id)
  if (!report) return { error: '권한이 없습니다.' }

  const supabase = createDatabaseClient()
  const { error } = await supabase
    .from('case_reports')
    .update({ client_comment: comment.trim() || null })
    .eq('id', reportId)

  if (error) return { error: error.message }
  revalidatePath(`/customer/cases/${caseId}`)
}
