'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoutButton } from './logout-button'

interface SidebarClientProps {
  userEmail?: string | null
  userRole?: string | null
}

interface NavItem { href: string; label: string; icon: React.ReactNode; exact?: boolean; adminOnly?: boolean }
interface NavSection { section: string; items: NavItem[] }

const navItems: NavItem[] = [
  {
    href: '/admin',
    exact: true,
    label: '대시보드',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
  {
    href: '/admin/fieldwork',
    label: '사건 진행',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
        <path d="M2 12h20"/>
      </svg>
    ),
  },
]

const sectionItems: NavSection[] = [
  {
    section: '사건 관리',
    items: [
      {
        href: '/admin/cases',
        label: '사건 목록',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />
          </svg>
        ),
      },
      {
        href: '/admin/cases/new',
        label: '새 사건 등록',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M12 18v-6" /><path d="M9 15h6" />
          </svg>
        ),
      },
    ],
  },
  {
    section: '상담 관리',
    items: [
      {
        href: '/admin/consultations',
        label: '상담 목록',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        ),
      },
      {
        href: '/admin/consultations/new',
        label: '새 상담 등록',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <path d="M12 10v4" /><path d="M10 12h4" />
          </svg>
        ),
      },
    ],
  },
  {
    section: '관리',
    items: [
      {
        href: '/admin/customers',
        label: '고객 관리',
        adminOnly: false,
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
        ),
      },
      {
        href: '/admin/staff',
        label: '직원 관리',
        adminOnly: false,
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        href: '/admin/trash',
        label: '휴지통',
        adminOnly: true,
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        ),
      },
    ],
  },
]

export function SidebarClient({ userEmail, userRole }: SidebarClientProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close on route change
  useEffect(() => { setOpen(false) }, [pathname])

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    if (pathname === href) return true
    // 실제 prefix 일치 여부를 먼저 확인 (slice 위치만 비교하면 오판 발생)
    if (!pathname.startsWith(href)) return false
    const sub = pathname.slice(href.length)
    // 하위 경로에서 active - 단 /new, /new/ 는 별개 메뉴이므로 제외
    return sub.startsWith('/') && sub.slice(1) !== 'new' && !sub.slice(1).startsWith('new/')
  }

  const NavLink = ({ href, label, icon, exact }: { href: string; label: string; icon: React.ReactNode; exact?: boolean }) => (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer min-h-[44px] ${
        isActive(href, exact)
          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      {icon}
      {label}
    </Link>
  )

  return (
    <>
      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <span className="text-slate-50 text-base font-bold tracking-tight">TJ 탐정</span>
          <span className="text-xs text-slate-400 font-medium">관리자</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          aria-label="메뉴 열기"
        >
          {open ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>
            </svg>
          )}
        </button>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-screen w-72 lg:w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-50
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-14 flex items-center px-5 border-b border-slate-800 shrink-0">
          <span className="text-slate-50 text-lg font-bold tracking-tight">TJ 탐정</span>
          <span className="ml-2 text-xs text-slate-400 font-medium">관리자</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
          {sectionItems.map((section) => {
            const visibleItems = section.items.filter(
              (item) => !item.adminOnly || userRole === 'admin'
            )
            if (visibleItems.length === 0) return null
            return (
              <div key={section.section}>
                <div className="pt-4 pb-1 px-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{section.section}</p>
                </div>
                {visibleItems.map((item) => (
                  <NavLink key={item.href} {...item} />
                ))}
              </div>
            )
          })}
        </nav>

        <div className="shrink-0 border-t border-slate-800 p-4">
          {userEmail && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
                {userEmail[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-50 text-xs font-medium leading-tight truncate">{userEmail}</p>
                <p className="text-slate-400 text-xs leading-tight mt-0.5">
                  {userRole === 'admin' ? '관리자' : '직원'}
                </p>
              </div>
            </div>
          )}
          <LogoutButton />
        </div>
      </aside>
    </>
  )
}
