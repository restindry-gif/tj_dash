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
  const assignedStaffId = formData.get('assignedStaffId') as string || null

  const { error } = await supabase
    .from('consultations')
    .insert({
      id: uuidv4(),
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      consultation_date: consultationDate,
      content,
      notes,
      assigned_staff_id: assignedStaffId,
      status: 'pending'
    })

  if (error) {
    console.error('상담 생성 오류:', error)
  }

  revalidatePath('/admin/consultations')
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
