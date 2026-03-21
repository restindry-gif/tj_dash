'use server'

import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'

/** Service role client — RLS 우회 (서버 전용, 클라이언트 미노출) */
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** 보고카드가 해당 고객의 사건에 속하는지 DB에서 검증 */
async function verifyReportOwnership(reportId: string, userId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('case_reports')
    .select('cases!inner(client_id)')
    .eq('id', reportId)
    .single()

  if (!data) return false
  const c = data.cases as { client_id: string } | { client_id: string }[]
  const clientId = Array.isArray(c) ? c[0]?.client_id : c?.client_id
  return clientId === userId
}

export async function requestOriginalPhoto(
  reportId: string,
  caseId: string
): Promise<{ error: string } | void> {
  const user = await getCurrentUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  if (!(await verifyReportOwnership(reportId, user.id))) return { error: '권한이 없습니다.' }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('case_reports')
    .update({ original_requested: true })
    .eq('id', reportId)

  if (error) return { error: error.message }
  revalidatePath(`/customer/cases/${caseId}`)
}

export async function toggleReportCheck(
  reportId: string,
  caseId: string,
  checked: boolean
): Promise<{ error: string } | void> {
  const user = await getCurrentUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  if (!(await verifyReportOwnership(reportId, user.id))) return { error: '권한이 없습니다.' }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('case_reports')
    .update({ client_checked: checked })
    .eq('id', reportId)

  if (error) return { error: error.message }
}

export async function submitReportComment(
  reportId: string,
  caseId: string,
  comment: string
): Promise<{ error: string } | void> {
  const user = await getCurrentUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  if (!(await verifyReportOwnership(reportId, user.id))) return { error: '권한이 없습니다.' }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('case_reports')
    .update({ client_comment: comment.trim() || null })
    .eq('id', reportId)

  if (error) return { error: error.message }
  revalidatePath(`/customer/cases/${caseId}`)
}
