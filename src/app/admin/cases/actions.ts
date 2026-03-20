'use server'

import { createDatabaseClient } from '@/lib/supabase/client'
import { createAuthUser } from '@/lib/auth/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createCase(formData: FormData) {
  const supabase = createDatabaseClient()

  const clientMode = formData.get('clientMode') // 'new' or 'existing'
  let clientId = formData.get('clientId') as string

  // 1. Handle Client Creation if New
  if (clientMode === 'new') {
    const email = formData.get('clientEmail') as string
    const fullName = formData.get('clientName') as string
    const phone = formData.get('clientPhone') as string
    const password = (formData.get('clientPassword') as string) || 'temp1234'

    // Create auth user first, use auth user's ID as profile ID
    const authUser = await createAuthUser(email, password, 'customer')
    clientId = authUser.id

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
  const advancePayment = formData.get('advancePayment') ? parseFloat(formData.get('advancePayment') as string) : null
  const assignedStaffId = formData.get('assignedStaffId') as string || null
  const status = formData.get('status') as string || 'pending'

  const { error: caseError } = await supabase
    .from('cases')
    .insert({
      title,
      description,
      consultation_notes: consultationNotes,
      fee_amount: feeAmount,
      advance_payment: advancePayment,
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

export async function updateCaseStatus(caseId: string, status: string) {
  const supabase = createDatabaseClient()

  const { error } = await supabase
    .from('cases')
    .update({ status })
    .eq('id', caseId)

  if (error) {
    console.error('사건 상태 업데이트 오류:', error)
    throw new Error(`상태 변경 실패: ${error.message}`)
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/cases/${caseId}`)
}

/**
 * Update case assigned staff
 */
export async function updateCaseAssignedStaff(
  caseId: string,
  assignedStaffId: string | null
) {
  const supabase = createDatabaseClient()

  const { error } = await supabase
    .from('cases')
    .update({ assigned_staff_id: assignedStaffId })
    .eq('id', caseId)

  if (error) {
    console.error('직원 배정 업데이트 오류:', error)
    throw new Error(`직원 배정 변경 실패: ${error.message}`)
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/cases/${caseId}`)
  return { success: true }
}

/**
 * Update case fees
 */
export async function updateCaseFees(
  caseId: string,
  feeAmount: number | null,
  advancePayment: number | null
) {
  const supabase = createDatabaseClient()

  const { error } = await supabase
    .from('cases')
    .update({
      fee_amount: feeAmount,
      advance_payment: advancePayment
    })
    .eq('id', caseId)

  if (error) {
    console.error('수임료 업데이트 오류:', error)
    throw new Error(`수임료 변경 실패: ${error.message}`)
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/cases/${caseId}`)
  return { success: true }
}
