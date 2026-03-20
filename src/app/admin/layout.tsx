import Link from "next/link"
import { LogoutButton } from "./logout-button"
import { getCurrentUser } from "@/lib/auth/session"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Fixed left sidebar */}
      <aside className="fixed top-0 left-0 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-50">
        {/* Logo / Header strip */}
        <div className="h-14 flex items-center px-5 border-b border-slate-800 shrink-0">
          <span className="text-slate-50 text-lg font-bold tracking-tight">TJ 탐정</span>
          <span className="ml-2 text-xs text-slate-400 font-medium">관리자</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {/* 대시보드 */}
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors group"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <rect width="7" height="9" x="3" y="3" rx="1" />
              <rect width="7" height="5" x="14" y="3" rx="1" />
              <rect width="7" height="9" x="14" y="12" rx="1" />
              <rect width="7" height="5" x="3" y="16" rx="1" />
            </svg>
            대시보드
          </Link>

          {/* 사건 관리 section */}
          <div className="pt-4 pb-1 px-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">사건 관리</p>
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
              <path d="M14 2v4a2 2 0 0 0 2 2h4" />
              <path d="M10 9H8" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
            </svg>
            사건 목록
          </Link>
          <Link
            href="/admin/cases/new"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
              <path d="M14 2v4a2 2 0 0 0 2 2h4" />
              <path d="M12 18v-6" />
              <path d="M9 15h6" />
            </svg>
            새 사건 등록
          </Link>

          {/* 상담 관리 section */}
          <div className="pt-4 pb-1 px-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">상담 관리</p>
          </div>
          <Link
            href="/admin/consultations"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            상담 목록
          </Link>
          <Link
            href="/admin/consultations/new"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <path d="M12 10v4" />
              <path d="M10 12h4" />
            </svg>
            새 상담 등록
          </Link>

          {/* 직원 관리 */}
          <div className="pt-4 pb-1 px-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">설정</p>
          </div>
          <Link
            href="/admin/staff"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            직원 관리
          </Link>
        </nav>

        {/* Bottom: user info + logout */}
        <div className="shrink-0 border-t border-slate-800 p-4">
          {user && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {user.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-50 text-xs font-medium leading-tight truncate">{user.email}</p>
                <p className="text-slate-400 text-xs leading-tight mt-0.5">
                  {user.role === "admin" ? "관리자" : "직원"}
                </p>
              </div>
            </div>
          )}
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 min-h-screen bg-slate-950 p-6">
        {children}
      </main>
    </div>
  )
}
