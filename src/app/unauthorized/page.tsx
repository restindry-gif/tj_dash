import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth/session'

export default async function UnauthorizedPage() {
  const user = await getCurrentUser()

  const dashboardHref =
    user?.role === 'admin' || user?.role === 'staff'
      ? '/admin'
      : user?.role === 'customer'
      ? '/customer'
      : '/auth/login'

  const dashboardLabel =
    user?.role === 'admin' || user?.role === 'staff'
      ? '관리자 대시보드로'
      : user?.role === 'customer'
      ? '내 대시보드로'
      : '로그인 페이지로'

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-sm">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-100">접근 권한이 없습니다</h1>
          <p className="text-sm text-slate-400">
            이 페이지에 접근할 수 있는 권한이 없습니다.
            {user && (
              <span className="block mt-1 text-slate-500">
                현재 계정: <span className="text-slate-400">{user.email}</span>
              </span>
            )}
          </p>
        </div>

        <Link
          href={dashboardHref}
          className="inline-block bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          ← {dashboardLabel}
        </Link>
      </div>
    </div>
  )
}
