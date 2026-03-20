import { createDatabaseClient } from '@/lib/supabase/client'
import { CreateCaseForm } from './create-form'

export default async function NewCasePage() {
  const supabase = createDatabaseClient()

  const [{ data: staffMembers }, { data: customers }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email').eq('role', 'staff'),
    supabase.from('profiles').select('id, full_name, email, phone').eq('role', 'customer').order('full_name', { ascending: true }),
  ])

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">신규 사건 등록</h1>
      <CreateCaseForm staffMembers={staffMembers || []} customers={customers || []} />
    </div>
  )
}
