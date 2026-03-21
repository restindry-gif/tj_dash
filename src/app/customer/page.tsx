import { getCurrentUser } from '@/lib/auth/session'
import { createDatabaseClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/date'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:   { label: '대기 중',     color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  active:    { label: '조사 진행 중', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  completed: { label: '완료',        color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  cancelled: { label: '취소',        color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

export default async function CustomerDashboard() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  const supabase = createDatabaseClient()
  const { data: cases } = await supabase
    .from('cases')
    .select('id, title, status, created_at')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">나의 의뢰</h1>
        <p className="text-sm text-slate-500 mt-0.5">의뢰 내역과 현장 보고를 확인할 수 있습니다.</p>
      </div>

      {!cases?.length ? (
        <div className="text-center py-16 border border-slate-800 rounded-xl bg-slate-900/30">
          <p className="text-slate-500 text-sm">등록된 의뢰가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => {
            const st = STATUS_CONFIG[c.status] ?? { label: c.status, color: 'bg-slate-700/50 text-slate-400 border-slate-600/30' }
            return (
              <Link
                key={c.id}
                href={`/customer/cases/${c.id}`}
                className="block bg-slate-900/60 border border-slate-800 rounded-xl p-4 hover:border-slate-700 hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-sm font-semibold text-slate-100 leading-snug">{c.title}</h2>
                  <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${st.color}`}>
                    {st.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>{formatDate(c.created_at, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
