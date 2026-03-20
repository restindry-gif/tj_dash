import { createDatabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { CaseStatusForm } from './status-form'

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createDatabaseClient()

  const { data: caseData, error } = await supabase
    .from('cases')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !caseData) {
    console.error('사건 조회 오류:', { error, caseId: id })
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">사건을 찾을 수 없습니다</h1>
          <p className="text-gray-600 text-sm mb-4">ID: {id}</p>
          {error && <p className="text-gray-500 text-xs mb-4">오류: {error.message}</p>}
          <Link href="/admin" className="text-blue-600 hover:underline">
            대시보드로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  // Fetch client info
  const { data: client } = await supabase
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', caseData.client_id)
    .single()

  // Fetch assigned staff info if exists
  let staffName = '-'
  if (caseData.assigned_staff_id) {
    const { data: staff } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', caseData.assigned_staff_id)
      .single()
    staffName = staff?.full_name || '-'
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">사건 상세보기</h1>
        <Link href="/admin" className="text-blue-600 hover:underline text-sm">
          ← 대시보드로
        </Link>
      </div>

      {/* 기본 정보 */}
      <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">사건명</h3>
            <p className="text-lg font-semibold">{caseData.title}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">상태</h3>
            <StatusBadge status={caseData.status} />
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">의뢰인</h3>
            <p className="text-gray-700">{client?.full_name || '-'}</p>
          </div>

          {client?.email && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">이메일</h3>
              <p className="text-gray-700">{client.email}</p>
            </div>
          )}

          {client?.phone && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">전화번호</h3>
              <p className="text-gray-700">{client.phone}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">담당자</h3>
            <p className="text-gray-700">{staffName}</p>
          </div>

          {caseData.fee_amount && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">착수금</h3>
              <p className="text-gray-700">₩{caseData.fee_amount.toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* 사건 개요 */}
      <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">사건 개요</h2>
        <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap text-gray-700">
          {caseData.description}
        </div>
      </div>

      {/* 상담 내용 */}
      {caseData.consultation_notes && (
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">상담 내용</h2>
          <div className="bg-blue-50 p-4 rounded whitespace-pre-wrap text-gray-700">
            {caseData.consultation_notes}
          </div>
        </div>
      )}

      {/* 상태 변환 */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-lg font-semibold mb-4">상태 변환</h2>
        <CaseStatusForm caseId={caseData.id} currentStatus={caseData.status} />
      </div>

      {/* 메타 정보 */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>생성일: {formatDate(caseData.created_at)}</p>
        <p>ID: {caseData.id}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  const labels: Record<string, string> = {
    pending: '대기 중',
    active: '진행 중',
    completed: '완료됨',
    cancelled: '취소됨',
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
