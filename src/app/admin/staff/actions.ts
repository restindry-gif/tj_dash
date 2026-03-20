import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createStaff(formData: FormData) {
  'use server'

  const supabase = await createServerClient()
  
  // Verify admin role
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

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const phone = formData.get('phone') as string

  // Use service role client to create user
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

  // 1. Create Auth User
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto confirm email
    user_metadata: { full_name: fullName }
  })

  if (createError) {
    console.error('Error creating staff user:', createError)
    // In a real app, you'd want to return this error to the UI
    return
  }

  if (!newUser.user) return

  // 2. Create Profile with Staff Role
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: newUser.user.id,
      email,
      full_name: fullName,
      phone,
      role: 'staff' // Important: Set role to staff
    })

  if (profileError) {
    console.error('Error creating staff profile:', profileError)
  }

  revalidatePath('/admin/staff')
}
