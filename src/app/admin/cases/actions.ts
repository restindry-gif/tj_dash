import { createClient } from '@supabase/supabase-js' // Use admin client
import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createCase(formData: FormData) {
  'use server'

  const supabase = await createServerClient()
  
  // Verify admin role first
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.role !== 'admin') {
    throw new Error('Unauthorized')
  }

  // Use service role client to create users without login
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  const clientMode = formData.get('clientMode') // 'new' or 'existing'
  let clientId = formData.get('clientId') as string

  // 1. Handle Client Creation if New
  if (clientMode === 'new') {
    const email = formData.get('clientEmail') as string
    const password = formData.get('clientPassword') as string || 'temp1234' // Default temp password
    const fullName = formData.get('clientName') as string
    const phone = formData.get('clientPhone') as string

    // Create auth user
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })

    if (createUserError) {
      console.error('Error creating user:', createUserError)
      return { error: createUserError.message }
    }

    if (!newUser.user) {
        return { error: 'Failed to create user object' }
    }

    clientId = newUser.user.id

    // Update profile with phone (trigger creates profile, but we need to add phone)
    // Wait a bit for trigger? Or just upsert.
    // Trigger runs AFTER insert on auth.users, so profile should exist momentarily.
    // Let's manually upsert to be safe and add phone.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: clientId,
        email,
        full_name: fullName,
        phone,
        role: 'customer'
      })

    if (profileError) {
       console.error('Error updating profile:', profileError)
       // meaningful error handling?
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
    return { error: caseError.message }
  }

  revalidatePath('/admin')
  redirect('/admin')
}
