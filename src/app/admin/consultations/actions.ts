'use server'

import { createDatabaseClient } from '@/lib/supabase/client'
import { revalidatePath } from 'next/cache'
import { v4 as uuidv4 } from 'uuid'

export async function createConsultation(formData: FormData) {
  const supabase = createDatabaseClient()

  const customerName = formData.get('customerName') as string
  const customerEmail = formData.get('customerEmail') as string
  const customerPhone = formData.get('customerPhone') as string
  const consultationDate = formData.get('consultationDate') as string
  const content = formData.get('content') as string
  const notes = formData.get('notes') as string
  const staffIdValue = formData.get('assignedStaffId') as string
  const assignedStaffId = staffIdValue && staffIdValue.trim() ? staffIdValue : null

  const consultationId = uuidv4()

  console.log('Creating consultation with data:', {
    id: consultationId,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    consultation_date: consultationDate,
    content: content?.substring(0, 50),
    notes: notes?.substring(0, 50),
    assigned_staff_id: assignedStaffId,
    status: 'pending'
  })

  const { error } = await supabase
    .from('consultations')
    .insert({
      id: consultationId,
      customer_name: customerName,
      customer_email: customerEmail || null,
      customer_phone: customerPhone || null,
      consultation_date: consultationDate,
      content,
      notes: notes || null,
      assigned_staff_id: assignedStaffId,
      status: 'pending'
    })

  if (error) {
    console.error('상담 생성 오류:', error)
    throw new Error(`상담 생성 실패: ${error.message}`)
  }

  console.log('Consultation created successfully:', consultationId)

  revalidatePath('/admin/consultations')
  revalidatePath(`/admin/consultations/${consultationId}`)

  return consultationId
}

export async function updateConsultationStatus(consultationId: string, status: string) {
  const supabase = createDatabaseClient()

  const { error } = await supabase
    .from('consultations')
    .update({ status })
    .eq('id', consultationId)

  if (error) {
    console.error('상담 상태 업데이트 오류:', error)
  }

  revalidatePath('/admin/consultations')
}
