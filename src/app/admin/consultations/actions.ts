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

export async function convertConsultationToCase(consultationId: string) {
  const supabase = createDatabaseClient()

  // 1. consultation 조회
  const { data: consultation, error: consultationError } = await supabase
    .from('consultations')
    .select('*')
    .eq('id', consultationId)
    .single()

  if (consultationError || !consultation) {
    throw new Error('상담을 찾을 수 없습니다.')
  }

  // 2. profiles 테이블에 customer 생성
  const customerId = uuidv4()
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: customerId,
      full_name: consultation.customer_name,
      email: consultation.customer_email || null,
      phone: consultation.customer_phone || null,
      role: 'customer'
    })

  if (profileError) {
    console.error('고객 프로필 생성 오류:', profileError)
    throw new Error(`고객 프로필 생성 실패: ${profileError.message}`)
  }

  // 3. cases 테이블에 사건 생성
  const caseId = uuidv4()
  const { error: caseError } = await supabase
    .from('cases')
    .insert({
      id: caseId,
      title: `[상담] ${consultation.customer_name}`,
      description: consultation.content,
      consultation_notes: consultation.notes || null,
      fee_amount: null,
      client_id: customerId,
      assigned_staff_id: consultation.assigned_staff_id || null,
      status: 'pending'
    })

  if (caseError) {
    console.error('사건 생성 오류:', caseError)
    throw new Error(`사건 생성 실패: ${caseError.message}`)
  }

  // 4. consultation 상태를 'converted'로 업데이트
  const { error: updateError } = await supabase
    .from('consultations')
    .update({ status: 'converted' })
    .eq('id', consultationId)

  if (updateError) {
    console.error('상담 상태 업데이트 오류:', updateError)
    throw new Error(`상담 상태 업데이트 실패: ${updateError.message}`)
  }

  console.log('Consultation converted to case successfully:', { consultationId, caseId, customerId })

  revalidatePath('/admin/consultations')
  revalidatePath(`/admin/consultations/${consultationId}`)
  revalidatePath('/admin')

  return caseId
}
