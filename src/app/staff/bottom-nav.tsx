'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutAction } from '@/app/auth/actions'
import { useRouteTracking } from '@/providers/route-tracking-provider'

interface StaffBottomNavProps {
  userEmail?: string | null
}

export function StaffBottomNav({ userEmail }: StaffBottomNavProps) {
  const pathname = usePathname()
  const { status, session } = useRouteTracking()

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 z-40 safe-area-pb">
      {/* 동선 추적 중 배너 */}
      {(status === 'tracking' || status === 'confirming') && session && (
        <Link
          href={`/staff/cases/${session.caseId}`}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border-b border-orange-500/20 cursor-pointer"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse shrink-0" />
          <span className="text-orange-400 text-xs font-medium flex-1 truncate">
            {status === 'confirming' ? '업무 종료 확인 필요' : '업무 중 — 동선 추적 중'}
          </span>
          <span className="text-slate-500 text-xs truncate max-w-[120px]">{session.caseTitle}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 shrink-0">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </Link>
      )}
      <div className="flex items-stretch">
        {/* 대시보드 */}
        <Link
          href="/staff"
          className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[60px] transition-colors cursor-pointer ${
            isActive('/staff', true) ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" />
            <rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
          </svg>
          <span className="text-[10px] font-medium">홈</span>
        </Link>

        {/* 사건 */}
        <Link
          href="/staff"
          className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[60px] transition-colors cursor-pointer ${
            pathname.startsWith('/staff/cases') ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />
          </svg>
          <span className="text-[10px] font-medium">사건</span>
        </Link>

        {/* 보고 (+ 버튼) - 사건 상세일 때만 활성 */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60px]">
          {pathname.startsWith('/staff/cases/') ? (
            <a
              href="#report-form"
              className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 cursor-pointer"
              aria-label="보고 작성"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14"/><path d="M5 12h14"/>
              </svg>
            </a>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              </svg>
              <span className="text-[10px] font-medium text-slate-600">보고</span>
            </div>
          )}
        </div>

        {/* 로그아웃 */}
        <form action={logoutAction} className="flex-1">
          <button
            type="submit"
            className="w-full h-full min-h-[60px] flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>
            </svg>
            <span className="text-[10px] font-medium">로그아웃</span>
          </button>
        </form>
      </div>
    </nav>
  )
}
