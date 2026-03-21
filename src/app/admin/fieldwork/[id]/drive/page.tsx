import { getCurrentUser } from '@/lib/auth/session'
import { createDatabaseClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import { DriveModeClient } from '@/app/staff/cases/[id]/drive/drive-mode-client'

export default async function AdminDriveModePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/admin')

  const supabase = createDatabaseClient()
  const { data: caseData } = await supabase
    .from('cases')
    .select('id, title')
    .eq('id', id)
    .single()

  if (!caseData) redirect('/admin/fieldwork')

  return <DriveModeClient caseId={id} staffId={user.id} caseTitle={caseData.title || '사건'} />
}
