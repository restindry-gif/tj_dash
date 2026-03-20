import { createDatabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { StatusChangeForm } from './status-form'
import { ConvertToCaseButton } from './convert-button'

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function ConsultationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createDatabaseClient()

  const { data: consultation, error } = await supabase
    .from('consultations')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !consultation) {
    console.error('상담 조회 오류:', { error, paramsId: id, consultation })
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">상담을 찾을 수 없습니다</h1>
          <p className="text-gray-600 text-sm mb-4">ID: {id}</p>
          {error && <p className="text-gray-500 text-xs mb-4">오류: {error.message}</p>}
          <Link href="/admin/consultations" className="text-blue-600 hover:underline">
            상담 목록으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  // Fetch assigned staff info if exists
  let staffName = '-'
  if (consultation.assigned_staff_id) {
    const { data: staff } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', consultation.assigned_staff_id)
      .single()
    staffName = staff?.full_name || '-'
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">상담 상세보기</h1>
        <Link
          href="/admin/consultations"
          className="text-blue-600 hover:underline text-sm"
        >
          ← 목록으로
        </Link>
      </div>

      {/* 기본 정보 */}
      <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">의뢰인 이름</h3>
            <p className="text-lg font-semibold">{consultation.customer_name}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">상담 상태</h3>
            <StatusBadge status={consultation.status} />
          </div>

          {consultation.customer_email && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">이메일</h3>
              <p className="text-gray-700">{consultation.customer_email}</p>
            </div>
          )}

          {consultation.customer_phone && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">전화번호</h3>
              <p className="text-gray-700">{consultation.customer_phone}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">상담 일시</h3>
            <p className="text-gray-700">{formatDate(consultation.consultation_date)}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">담당자</h3>
            <p className="text-gray-700">{staffName}</p>
          </div>
        </div>
      </div>

      {/* 상담 내용 */}
      <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">상담 내용</h2>
        <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap text-gray-700">
          {consultation.content}
        </div>
      </div>

      {/* 메모 */}
      {consultation.notes && (
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">메모</h2>
          <div className="bg-blue-50 p-4 rounded whitespace-pre-wrap text-gray-700">
            {consultation.notes}
          </div>
        </div>
      )}

      {/* 상태 변환 */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-lg font-semibold mb-4">상태 변환</h2>
        <StatusChangeForm consultationId={consultation.id} currentStatus={consultation.status} />
      </div>

      {/* 사건 전환 */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-lg font-semibold mb-4">사건 전환</h2>
        <ConvertToCaseButton
          consultationId={consultation.id}
          isConverted={consultation.status === 'converted'}
        />
      </div>

      {/* 메타 정보 */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>등록일: {formatDate(consultation.created_at)}</p>
        <p>ID: {consultation.id}</p>
      </div>
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
