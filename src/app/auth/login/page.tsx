import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import LoginForm from './form'

export default async function LoginPage() {
  // If already logged in, redirect to dashboard
  const session = await getSession()
  if (session) {
    const role = session.user.role
    if (role === 'customer') {
      redirect('/customer')
    } else {
      redirect('/admin')
    }
  }

  return (
    <div className="bg-slate-950 min-h-screen flex items-center justify-center px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        {/* Logo area */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center">
            <span className="text-white font-bold text-xl">TJ</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-50">TJ Agency</h1>
            <p className="mt-1 text-sm text-slate-400">탐정사무소 대시보드</p>
          </div>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
