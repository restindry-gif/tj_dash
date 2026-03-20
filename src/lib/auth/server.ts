import { createClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client with service role key
 * ⚠️ ONLY FOR SERVER-SIDE USE
 * Never expose SUPABASE_SERVICE_ROLE_KEY to client
 */
function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Create a new auth user in Supabase
 * @param email - User email
 * @param password - User password
 * @param role - User role: 'admin' | 'staff' | 'customer'
 * @returns Created user object with id
 */
export async function createAuthUser(
  email: string,
  password: string,
  role: 'admin' | 'staff' | 'customer'
) {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Skip email verification for development
    user_metadata: { role },
  })

  if (error) {
    throw new Error(`Failed to create auth user: ${error.message}`)
  }

  return data.user
}

/**
 * Delete an auth user from Supabase
 * @param userId - User ID to delete
 */
export async function deleteAuthUser(userId: string) {
  const supabase = createServiceRoleClient()

  const { error } = await supabase.auth.admin.deleteUser(userId)

  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`)
  }
}

/**
 * Update user password
 * @param userId - User ID
 * @param password - New password
 */
export async function updateAuthUserPassword(userId: string, password: string) {
  const supabase = createServiceRoleClient()

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password,
  })

  if (error) {
    throw new Error(`Failed to update password: ${error.message}`)
  }
}

/**
 * Get user by email
 * @param email - User email
 */
export async function getAuthUserByEmail(email: string) {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase.auth.admin.listUsers()

  if (error) {
    throw new Error(`Failed to list users: ${error.message}`)
  }

  return data.users.find((user) => user.email === email)
}

/**
 * Check if any admin exists in the system
 */
export async function adminExists() {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase.auth.admin.listUsers()

  if (error) {
    throw new Error(`Failed to list users: ${error.message}`)
  }

  return data.users.some(
    (user) => user.user_metadata?.role === 'admin'
  )
}
