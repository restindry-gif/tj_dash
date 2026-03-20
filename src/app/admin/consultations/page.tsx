import { createDatabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { updateConsultationStatus } from './actions'

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function ConsultationsPage() {
  const supabase = createDatabaseClient()

  const { data: consultations, error } = await supabase
    .from('consultations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('상담 목록 조회 오류:', error)
    return <div className="p-8 text-red-600">상담 목록을 불러올 수 없습니다.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">상담 관리</h1>
        <Link
          href="/admin/consultations/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
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
      <div className="space-y-4">
        {consultations?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              등록된 상담이 없습니다.
            </CardContent>
          </Card>
        ) : (
          consultations?.map((consultation) => (
            <Card key={consultation.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {consultation.customer_name}
                    </CardTitle>
                    <div className="text-sm text-gray-500 mt-1">
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
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    <strong>상담 일시:</strong> {formatDate(consultation.consultation_date)}
                  </div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                    {consultation.content}
                  </div>
                  {consultation.notes && (
                    <div className="text-sm text-gray-600 border-t pt-3">
                      <strong>메모:</strong> {consultation.notes}
                    </div>
                  )}
                  <div className="flex gap-2 pt-3 border-t">
                    <Link
                      href={`/admin/consultations/${consultation.id}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      상세보기 →
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
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
    default: 'text-gray-900',
    pending: 'text-yellow-600',
    in_progress: 'text-blue-600',
    completed: 'text-green-600',
  }

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <div className={`mt-2 text-3xl font-bold ${colors[type]}`}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    converted: 'bg-purple-100 text-purple-800',
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
        styles[status] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {labels[status] || status}
    </span>
  )
}
