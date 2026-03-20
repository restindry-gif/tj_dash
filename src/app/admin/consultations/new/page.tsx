import { createDatabaseClient } from '@/lib/supabase/client'
import { ConsultationForm } from './form'

export default async function NewConsultationPage() {
  const supabase = createDatabaseClient()

  // Fetch staff members for assignment
  const { data: staffMembers } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('role', ['staff', 'admin'])
    .order('full_name', { ascending: true })

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">신규 상담 등록</h1>
      <ConsultationForm staffMembers={staffMembers || []} />
    </div>
  )
}
