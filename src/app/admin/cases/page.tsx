import { createDatabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { searchCases } from './actions'
import { CaseFilterClient } from './case-filter-client'

export const revalidate = 30

export default async function AdminCasesPage() {
  const supabase = createDatabaseClient()

  // 초기 데이터 로드 (20건)
  const initialCases = await searchCases({
    offset: 0,
    limit: 20,
  })

  // 직원 목록 조회 (필터 드롭다운용)
  const { data: staffList } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('role', ['staff', 'admin'])
    .order('full_name', { ascending: true })

  // 전체 사건 개수 통계
  const { data: cases } = await supabase
    .from('cases')
    .select('status')
    .is('deleted_at', null)

  const total = cases?.length ?? 0
  const active = cases?.filter((c) => c.status === 'active').length ?? 0
  const pending = cases?.filter((c) => c.status === 'pending').length ?? 0
  const completed = cases?.filter((c) => c.status === 'completed').length ?? 0

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-50 font-manrope">사건 목록</h1>
          <p className="text-sm text-slate-400 mt-0.5">전체 {total}건</p>
        </div>
        <Link
          href="/admin/cases/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4v16m8-8H4"/>
          </svg>
          신규 사건 등록
        </Link>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: '전체', value: total, style: 'text-slate-200' },
          { label: '진행 중', value: active, style: 'text-blue-400' },
          { label: '대기', value: pending, style: 'text-yellow-400' },
          { label: '완료', value: completed, style: 'text-green-400' },
        ].map(({ label, value, style }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className={`text-2xl font-bold tabular-nums ${style}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* CaseFilterClient 렌더링 */}
      <CaseFilterClient initialCases={initialCases} staffList={staffList || []} />
    </div>
  )
}
