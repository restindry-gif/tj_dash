import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth/session'
import { StaffBottomNav } from './bottom-nav'
import { LogoutButton } from '@/app/admin/logout-button'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Desktop sidebar (lg+) */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-64 bg-slate-900 border-r border-slate-800 flex-col z-50">
        <div className="h-14 flex items-center px-5 border-b border-slate-800 shrink-0">
          <span className="text-slate-50 text-lg font-bold tracking-tight">TJ 탐정</span>
          <span className="ml-2 text-xs text-blue-400 font-medium">직원</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <Link href="/staff" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors min-h-[44px]">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" />
              <rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
            </svg>
            내 대시보드
          </Link>
          <div className="pt-4 pb-1 px-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">담당 사건</p>
          </div>
          <Link href="/staff" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors min-h-[44px]">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
              <path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />
            </svg>
            사건 목록
          </Link>
        </nav>

        <div className="shrink-0 border-t border-slate-800 p-4">
          {user && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
                {user.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-50 text-xs font-medium leading-tight truncate">{user.email}</p>
                <p className="text-slate-400 text-xs leading-tight mt-0.5">직원</p>
              </div>
            </div>
          )}
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile top header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900/95 backdrop-blur border-b border-slate-800 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <span className="text-slate-50 text-base font-bold tracking-tight">TJ 탐정</span>
          <span className="text-xs text-blue-400 font-medium">직원</span>
        </div>
        {user && (
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">
            {user.email?.[0].toUpperCase()}
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 min-h-screen bg-slate-950 pt-14 pb-20 lg:pt-0 lg:pb-0 lg:ml-64">
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <StaffBottomNav userEmail={user?.email} />
    </div>
  )
}
