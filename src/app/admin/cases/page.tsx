import { createDatabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'

export const revalidate = 30

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

export default async function AdminCasesPage() {
  const supabase = createDatabaseClient()

  const { data: cases } = await supabase
    .from('cases')
    .select('*')
    .order('created_at', { ascending: false })

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
          { label: '진행', value: active, style: 'text-blue-400' },
          { label: '대기', value: pending, style: 'text-yellow-400' },
          { label: '완료', value: completed, style: 'text-green-400' },
        ].map(({ label, value, style }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className={`text-2xl font-bold tabular-nums ${style}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* 사건 목록 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {!cases || cases.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-500 text-sm">등록된 사건이 없습니다.</p>
            <Link href="/admin/cases/new" className="mt-3 inline-block text-blue-400 hover:text-blue-300 text-sm">
              첫 사건 등록하기 →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {cases.map((c) => (
              <Link
                key={c.id}
                href={`/admin/cases/${c.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-800/50 transition-colors cursor-pointer group"
              >
                {/* 상태 인디케이터 */}
                <div className={`w-1.5 h-10 rounded-full shrink-0 ${
                  c.status === 'active' ? 'bg-blue-500' :
                  c.status === 'pending' ? 'bg-yellow-500' :
                  c.status === 'completed' ? 'bg-green-500' : 'bg-slate-600'
                }`} />

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                    {c.title || '(제목 없음)'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-600">
                      {new Date(c.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* 상태 배지 */}
                <span className={`text-xs rounded-full px-2.5 py-1 font-medium shrink-0 ${STATUS_STYLES[c.status] || 'bg-slate-700 text-slate-300 border border-slate-600'}`}>
                  {STATUS_LABELS[c.status] || c.status}
                </span>

                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
