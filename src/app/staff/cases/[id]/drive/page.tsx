import { getCurrentUser } from '@/lib/auth/session'
import { createDatabaseClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import { DriveModeClient } from './drive-mode-client'

export default async function DriveModePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')

  const supabase = createDatabaseClient()
  const { data: caseData } = await supabase
    .from('cases')
    .select('id, title')
    .eq('id', id)
    .single()

  if (!caseData) redirect('/staff')

  return <DriveModeClient caseId={id} staffId={user.id} caseTitle={caseData.title || '사건'} />
}
