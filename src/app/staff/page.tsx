import { createDatabaseClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/session'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/date'

const STATUS_LABELS: Record<string, string> = {
  pending: '대기',
  active: '진행',
  completed: '완료',
  cancelled: '취소',
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
    .select('id, title, status, created_at')
    .eq('assigned_staff_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const activeCases = cases?.filter((c) => c.status === 'active') || []
  const pendingCases = cases?.filter((c) => c.status === 'pending') || []
  const completedCases = cases?.filter((c) => c.status === 'completed') || []

  return (
    <div className="space-y-5">
      {/* 인사 */}
      <div>
        <h1 className="text-xl font-bold text-slate-50">안녕하세요 👋</h1>
        <p className="text-slate-400 text-sm mt-0.5">담당 사건 현황입니다</p>
      </div>

      {/* KPI 카드 - 모바일 3열 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{activeCases.length}</p>
          <p className="text-xs text-slate-500 mt-1">진행</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{pendingCases.length}</p>
          <p className="text-xs text-slate-500 mt-1">대기</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{completedCases.length}</p>
          <p className="text-xs text-slate-500 mt-1">완료</p>
        </div>
      </div>

      {/* 사건 목록 */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">담당 사건</h2>

        {!cases || cases.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 mx-auto mb-3">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
              <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            </svg>
            <p className="text-slate-500 text-sm">배정된 사건이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cases.map((c) => (
              <Link
                key={c.id}
                href={`/staff/cases/${c.id}`}
                className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:bg-slate-800 active:scale-[0.98] transition-all cursor-pointer group min-h-[72px]"
              >
                {/* 상태 인디케이터 */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  c.status === 'active' ? 'bg-blue-400' :
                  c.status === 'pending' ? 'bg-yellow-400' :
                  c.status === 'completed' ? 'bg-green-400' : 'bg-red-400'
                }`} />

                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm font-medium truncate group-hover:text-white">
                    {c.title || '(제목 없음)'}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {formatDate(c.created_at, { month: 'long', day: 'numeric' })}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs rounded-full px-2.5 py-1 font-medium ${STATUS_STYLES[c.status] || 'bg-slate-700 text-slate-300 border border-slate-600'}`}>
                    {STATUS_LABELS[c.status] || c.status}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 group-hover:text-slate-400 transition-colors">
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
