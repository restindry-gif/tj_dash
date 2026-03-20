import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { adminExists } from '@/lib/auth/server'
import SetupAdminForm from './form'

export default async function SetupPage() {
  // If already logged in, redirect to dashboard
  const session = await getSession()
  if (session) {
    redirect('/admin')
  }

  // Check if admin already exists
  const hasAdmin = await adminExists()
  if (hasAdmin) {
    // Redirect to login if admin already exists
    redirect('/auth/login')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-lg p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">TJ Dash</h1>
          <p className="mt-2 text-gray-600">탐정사무소 대시보드</p>
        </div>

        <div className="mb-6 rounded-md bg-blue-50 p-4 border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>첫 번째 로그인입니다.</strong> 관리자 계정을 생성해주세요.
          </p>
        </div>

        <SetupAdminForm />
      </div>
    </div>
  )
}
