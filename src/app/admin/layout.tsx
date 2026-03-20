import { SidebarClient } from './sidebar-client'
import { getCurrentUser } from '@/lib/auth/session'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  return (
    <div className="flex min-h-screen bg-slate-950">
      <SidebarClient userEmail={user?.email} userRole={user?.role} />

      {/* Main content: offset for desktop sidebar, top padding for mobile header */}
      <main className="flex-1 min-h-screen bg-slate-950 pt-14 lg:pt-0 lg:ml-64">
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
