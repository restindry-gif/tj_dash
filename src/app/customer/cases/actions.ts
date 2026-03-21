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

  const supabase = createDatabaseClient()
  const { error } = await supabase
    .from('case_reports')
    .update({ client_comment: comment.trim() || null })
    .eq('id', reportId)

  if (error) return { error: error.message }
  revalidatePath(`/customer/cases/${caseId}`)
}
