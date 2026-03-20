import { createDatabaseClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/session'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const STATUS_LABELS: Record<string, string> = {
  pending: '대기 중',
  active: '진행 중',
  completed: '완료됨',
  cancelled: '취소됨',
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20',
  active: 'bg-blue-400/10 text-blue-400 border border-blue-400/20',
  completed: 'bg-green-400/10 text-green-400 border border-green-400/20',
  cancelled: 'bg-red-400/10 text-red-400 border border-red-400/20',
}

export default async function StaffDashboard() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')

  const supabase = createDatabaseClient()

  const { data: cases } = await supabase
    .from('cases')
    .select('id, title, status, created_at, client_id')
    .eq('assigned_staff_id', user.id)
    .order('created_at', { ascending: false })

  const activeCases = cases?.filter((c) => c.status === 'active') || []
  const pendingCases = cases?.filter((c) => c.status === 'pending') || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-50">내 대시보드</h1>
        <p className="text-slate-400 text-sm mt-1">담당 사건 현황</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '전체 담당', value: cases?.length ?? 0, color: 'text-slate-50' },
          { label: '진행 중', value: activeCases.length, color: 'text-blue-400' },
          { label: '대기 중', value: pendingCases.length, color: 'text-yellow-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* 사건 목록 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-300">담당 사건 목록</h2>
        </div>
        {!cases || cases.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-500 text-sm">
            배정된 사건이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {cases.map((c) => (
              <Link
                key={c.id}
                href={`/staff/cases/${c.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-800/50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm font-medium group-hover:text-white truncate">
                    {c.title || '(제목 없음)'}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {new Date(c.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <span className={`text-xs rounded-full px-3 py-1 font-medium ${STATUS_STYLES[c.status] || 'bg-slate-700 text-slate-300 border border-slate-600'}`}>
                    {STATUS_LABELS[c.status] || c.status}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 group-hover:text-slate-400">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
