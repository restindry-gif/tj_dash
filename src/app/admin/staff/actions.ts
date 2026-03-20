'use server'

import { createDatabaseClient } from '@/lib/supabase/client'
import { revalidatePath } from 'next/cache'
import { v4 as uuidv4 } from 'uuid'

export async function createStaff(formData: FormData) {
  const supabase = createDatabaseClient()

  const email = formData.get('email') as string
  const fullName = formData.get('fullName') as string
  const phone = formData.get('phone') as string

  // Create a staff profile with a UUID (since no auth in this version)
  const staffId = uuidv4()

  console.log('Creating staff with data:', {
    id: staffId,
    email,
    full_name: fullName,
    phone,
    role: 'staff'
  })

  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: staffId,
      email,
      full_name: fullName,
      phone,
      role: 'staff'
    })

  if (profileError) {
    console.error('Error creating staff profile:', profileError)
    throw new Error(`직원 생성 실패: ${profileError.message}`)
  }

  console.log('Staff created successfully:', staffId)

  revalidatePath('/admin/staff')
  return staffId
}
