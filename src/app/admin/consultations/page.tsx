import { createDatabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { updateConsultationStatus } from './actions'
import { formatDateTime } from '@/lib/date'

export const revalidate = 30

export default async function ConsultationsPage() {
  const supabase = createDatabaseClient()

  const { data: consultations, error } = await supabase
    .from('consultations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('상담 목록 조회 오류:', error)
    return <div className="p-8 text-red-400">상담 목록을 불러올 수 없습니다.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-50">상담 관리</h1>
        <Link
          href="/admin/consultations/new"
          className="bg-green-500 text-slate-950 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-400 transition-colors"
        >
          + 신규 상담
        </Link>
      </div>

      {/* 통계 */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          title="전체 상담"
          value={consultations?.length || 0}
        />
        <StatsCard
          title="대기 중"
          value={consultations?.filter((c) => c.status === 'pending').length || 0}
          type="pending"
        />
        <StatsCard
          title="진행 중"
          value={consultations?.filter((c) => c.status === 'in_progress').length || 0}
          type="in_progress"
        />
        <StatsCard
          title="완료됨"
          value={consultations?.filter((c) => c.status === 'completed').length || 0}
          type="completed"
        />
      </div>

      {/* 상담 목록 */}
      <div className="space-y-3">
        {consultations?.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
            등록된 상담이 없습니다.
          </div>
        ) : (
          consultations?.map((consultation) => (
            <div
              key={consultation.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-lg font-semibold text-slate-50">
                    {consultation.customer_name}
                  </p>
                  <div className="text-sm text-slate-400 mt-0.5">
                    {consultation.customer_email && (
                      <span>{consultation.customer_email}</span>
                    )}
                    {consultation.customer_phone && (
                      <span> · {consultation.customer_phone}</span>
                    )}
                  </div>
                </div>
                <StatusBadge status={consultation.status} />
              </div>

              <div className="text-sm text-slate-400 mb-2">
                상담 일시: {formatDateTime(consultation.consultation_date, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>

              <div className="text-sm text-slate-300 bg-slate-800 rounded-lg px-3 py-2 line-clamp-2 whitespace-pre-wrap mb-3">
                {consultation.content}
              </div>

              <div className="pt-2 border-t border-slate-800">
                <Link
                  href={`/admin/consultations/${consultation.id}`}
                  className="text-sm font-medium text-green-400 hover:text-green-300 transition-colors"
                >
                  상세보기 →
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function StatsCard({
  title,
  value,
  type = 'default',
}: {
  title: string
  value: number
  type?: 'default' | 'pending' | 'in_progress' | 'completed'
}) {
  const colors = {
    default: 'text-slate-50',
    pending: 'text-yellow-400',
    in_progress: 'text-blue-400',
    completed: 'text-green-400',
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="text-sm font-medium text-slate-400">{title}</h3>
      <div className={`mt-2 text-3xl font-bold ${colors[type]}`}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20',
    in_progress: 'bg-blue-400/10 text-blue-400 border border-blue-400/20',
    completed: 'bg-green-400/10 text-green-400 border border-green-400/20',
    converted: 'bg-purple-400/10 text-purple-400 border border-purple-400/20',
  }

  const labels: Record<string, string> = {
    pending: '대기 중',
    in_progress: '진행 중',
    completed: '완료됨',
    converted: '사건 전환됨',
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        styles[status] || 'bg-slate-700 text-slate-300 border border-slate-600'
      }`}
    >
      {labels[status] || status}
    </span>
  )
}
