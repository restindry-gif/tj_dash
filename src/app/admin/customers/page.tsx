import { createDatabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default async function CustomersPage() {
  const supabase = createDatabaseClient()

  const { data: customers } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, created_at')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })

  // 각 고객의 사건 수 조회
  const ids = customers?.map((c) => c.id) ?? []
  const { data: caseCounts } = ids.length
    ? await supabase.from('cases').select('client_id').in('client_id', ids)
    : { data: [] }

  const countMap: Record<string, number> = {}
  caseCounts?.forEach((c) => {
    countMap[c.client_id] = (countMap[c.client_id] ?? 0) + 1
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">고객 관리</h1>
          <p className="text-sm text-slate-500 mt-0.5">총 {customers?.length ?? 0}명</p>
        </div>
      </div>

      {!customers?.length ? (
        <div className="text-center py-16 border border-slate-800 rounded-xl bg-slate-900/30">
          <p className="text-slate-500 text-sm">등록된 고객이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map((c) => (
            <Link
              key={c.id}
              href={`/admin/customers/${c.id}`}
              className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 hover:border-slate-700 hover:bg-slate-800/60 transition-colors"
            >
              {/* 아바타 */}
              <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-blue-400">
                  {(c.full_name ?? c.email ?? '?')[0].toUpperCase()}
                </span>
              </div>

              {/* 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-100 truncate">
                    {c.full_name ?? '(이름 없음)'}
                  </p>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">{c.email}</p>
                {c.phone && <p className="text-xs text-slate-600 mt-0.5">{c.phone}</p>}
              </div>

              {/* 사건 수 */}
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-slate-300">{countMap[c.id] ?? 0}</p>
                <p className="text-[11px] text-slate-600">사건</p>
              </div>

              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 shrink-0">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
