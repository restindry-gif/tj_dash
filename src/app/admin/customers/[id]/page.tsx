import { createDatabaseClient } from '@/lib/supabase/client'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CustomerEditForm } from './edit-form'
import { formatDate } from '@/lib/date'

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createDatabaseClient()

  const { data: customer } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, notes, created_at')
    .eq('id', id)
    .eq('role', 'customer')
    .single()

  if (!customer) notFound()

  const { data: cases } = await supabase
    .from('cases')
    .select('id, title, status, created_at')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  const STATUS_LABEL: Record<string, string> = {
    pending: '대기 중', active: '진행 중', completed: '완료', cancelled: '취소',
  }
  const STATUS_COLOR: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    active: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    completed: 'bg-green-500/10 text-green-400 border-green-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/customers" className="text-slate-400 hover:text-slate-300 text-sm transition-colors">
          ← 고객 목록
        </Link>
      </div>

      <h1 className="text-xl font-bold text-slate-100">
        {customer.full_name ?? '(이름 없음)'}
      </h1>

      {/* 편집 폼 */}
      <CustomerEditForm customer={customer} />

      {/* 담당 사건 목록 */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">담당 사건 ({cases?.length ?? 0})</p>
        {!cases?.length ? (
          <div className="text-center py-8 border border-slate-800 rounded-xl bg-slate-900/30">
            <p className="text-slate-500 text-sm">사건 없음</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cases.map((c) => (
              <Link
                key={c.id}
                href={`/admin/cases/${c.id}`}
                className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{c.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {formatDate(c.created_at)}
                  </p>
                </div>
                <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[c.status] ?? 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                  {STATUS_LABEL[c.status] ?? c.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
