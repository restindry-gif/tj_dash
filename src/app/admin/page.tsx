import { createDatabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { formatDate } from '@/lib/date'

export const revalidate = 30

export default async function AdminPage() {
  const supabase = createDatabaseClient()

  // Fetch cases
  const { data: cases, error } = await supabase
    .from('cases')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching cases:', error)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-red-400">데이터를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    )
  }

  // Calculate stats
  const totalCases = cases?.length || 0
  const activeCases = cases?.filter((c) => c.status === 'active').length || 0
  const pendingCases = cases?.filter((c) => c.status === 'pending').length || 0
  const completedCases = cases?.filter((c) => c.status === 'completed').length || 0

  return (
    <div className="min-h-screen bg-slate-950 p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50 tracking-tight">관리자 대시보드</h1>
          <p className="mt-1 text-sm text-slate-400">전체 사건 및 상담 현황을 확인합니다.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/consultations/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            신규 상담
          </Link>
          <Link
            href="/admin/cases/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-500 hover:bg-green-400 px-4 py-2 text-sm font-medium text-white transition-colors shadow-lg shadow-green-500/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            신규 사건 등록
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard
          title="전체 의뢰"
          value={totalCases}
          type="default"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z" />
            </svg>
          }
        />
        <StatsCard
          title="진행"
          value={activeCases}
          type="active"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          }
        />
        <StatsCard
          title="대기"
          value={pendingCases}
          type="pending"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          title="완료"
          value={completedCases}
          type="completed"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Cases Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-50">최근 의뢰 목록</h2>
          <span className="text-xs text-slate-500">{totalCases}건</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  사건명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  등록일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  상세보기
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {cases?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    등록된 의뢰가 없습니다.
                  </td>
                </tr>
              ) : (
                cases?.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-200">
                      {item.title}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/cases/${item.id}`}
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium"
                      >
                        상세보기
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatsCard({
  title,
  value,
  type = 'default',
  icon,
}: {
  title: string
  value: number
  type?: 'default' | 'active' | 'pending' | 'completed'
  icon: React.ReactNode
}) {
  const iconColors = {
    default: 'text-slate-400',
    active: 'text-blue-400',
    pending: 'text-yellow-400',
    completed: 'text-green-400',
  }

  const valueColors = {
    default: 'text-slate-50',
    active: 'text-blue-400',
    pending: 'text-yellow-400',
    completed: 'text-green-400',
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className={`mb-3 ${iconColors[type]}`}>{icon}</div>
      <div className={`text-3xl font-bold tabular-nums ${valueColors[type]}`}>{value}</div>
      <p className="mt-1 text-sm text-slate-400">{title}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20',
    active: 'bg-blue-400/10 text-blue-400 border border-blue-400/20',
    completed: 'bg-green-400/10 text-green-400 border border-green-400/20',
    cancelled: 'bg-red-400/10 text-red-400 border border-red-400/20',
  }

  const labels: Record<string, string> = {
    pending: '대기',
    active: '진행',
    completed: '완료',
    cancelled: '취소',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[status] || 'bg-slate-700/50 text-slate-400 border border-slate-700'
      }`}
    >
      {labels[status] || status}
    </span>
  )
}
