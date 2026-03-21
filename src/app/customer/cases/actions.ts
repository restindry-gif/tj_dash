'use server'

import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'

/** RLS 우회 필요한 고객 액션용 서비스 롤 클라이언트 */
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function requestOriginalPhoto(
  reportId: string,
  caseId: string
): Promise<{ error: string } | void> {
  const user = await getCurrentUser()
  if (!user) return { error: '로그인이 필요합니다.' }

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

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('case_reports')
    .update({ client_checked: checked })
    .eq('id', reportId)

  if (error) return { error: error.message }
  // revalidatePath 제거 — optimistic update로 충분, 새로고침 시 리셋 방지
}

export async function submitReportComment(
  reportId: string,
  caseId: string,
  comment: string
): Promise<{ error: string } | void> {
  const user = await getCurrentUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('case_reports')
    .update({ client_comment: comment.trim() || null })
    .eq('id', reportId)

  if (error) return { error: error.message }
  revalidatePath(`/customer/cases/${caseId}`)
}
