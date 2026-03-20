import Link from "next/link"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold">TJ 탐정 - 관리자</h1>
            <nav className="hidden md:flex gap-4 text-sm font-medium text-slate-300">
              <Link href="/admin" className="hover:text-white transition-colors">
                대시보드
              </Link>
              <Link href="/admin/cases/new" className="hover:text-white transition-colors">
                사건 등록
              </Link>
              <Link href="/admin/staff" className="hover:text-white transition-colors">
                직원 관리
              </Link>
            </nav>
          </div>
          <div>
             {/* Future: User Profile / Logout */}
          </div>
        </div>
      </header>
      <main className="flex-1 p-6 bg-slate-50">
        {children}
      </main>
    </div>
  )
}
