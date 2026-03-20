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
    .select('id, case_id, cases!inner(client_id)')
    .eq('id', reportId)
    .single()

  if (!report) return { error: '보고를 찾을 수 없습니다.' }
  // @ts-expect-error Supabase join type
  if (report.cases.client_id !== user.id) return { error: '권한이 없습니다.' }

  const { error } = await supabase
    .from('case_reports')
    .update({ original_requested: true })
    .eq('id', reportId)

  if (error) return { error: error.message }

  revalidatePath(`/customer/cases/${caseId}`)
}
