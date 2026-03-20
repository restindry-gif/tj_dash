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
  }

  revalidatePath('/admin/staff')
}
