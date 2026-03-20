'use server'

import { createDatabaseClient } from '@/lib/supabase/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'

export async function createCase(formData: FormData) {
  const supabase = createDatabaseClient()

  const clientMode = formData.get('clientMode') // 'new' or 'existing'
  let clientId = formData.get('clientId') as string

  // 1. Handle Client Creation if New
  if (clientMode === 'new') {
    const email = formData.get('clientEmail') as string
    const fullName = formData.get('clientName') as string
    const phone = formData.get('clientPhone') as string

    // Create customer profile with a UUID
    clientId = uuidv4()
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: clientId,
        email,
        full_name: fullName,
        phone,
        role: 'customer'
      })

    if (profileError) {
      console.error('Error creating customer profile:', profileError)
    }
  }

  // 2. Create Case
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const consultationNotes = formData.get('consultationNotes') as string
  const feeAmount = formData.get('feeAmount') ? parseFloat(formData.get('feeAmount') as string) : null
  const assignedStaffId = formData.get('assignedStaffId') as string || null
  const status = formData.get('status') as string || 'pending'

  const { error: caseError } = await supabase
    .from('cases')
    .insert({
      title,
      description,
      consultation_notes: consultationNotes,
      fee_amount: feeAmount,
      client_id: clientId,
      assigned_staff_id: assignedStaffId,
      status
    })

  if (caseError) {
    console.error('Error creating case:', caseError)
  }

  revalidatePath('/admin')
  redirect('/admin')
}
