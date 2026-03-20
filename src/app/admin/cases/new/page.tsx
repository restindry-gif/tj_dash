import { createClient } from '@/lib/supabase/server'
import { CreateCaseForm } from './create-form'

export default async function NewCasePage() {
  const supabase = await createClient()

  // Fetch staff for assignment dropdown
  const { data: staffMembers } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'staff')

  // Fetch existing customers for selection
  const { data: customers } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone')
    .eq('role', 'customer')
    .order('full_name', { ascending: true })

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">신규 사건 등록</h1>
      <CreateCaseForm staffMembers={staffMembers || []} customers={customers || []} />
    </div>
  )
}
