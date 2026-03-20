import { createDatabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

      {/* 1. 의뢰인 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>의뢰인 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">이름</label>
              <p className="text-gray-700">{client?.full_name || '-'}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">전화번호</label>
              <p className="text-gray-700">{client?.phone || '-'}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">이메일</label>
              <p className="text-gray-700">{client?.email || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. 사건 상세 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>사건 상세 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500">사건명 (Title)</label>
            <p className="text-gray-700">{caseData.title || '-'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">착수금/수임료 (원)</label>
              <p className="text-gray-700">
                {caseData.fee_amount ? `₩${caseData.fee_amount.toLocaleString()}` : '-'}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">담당 직원 배정</label>
              <p className="text-gray-700">{staffName}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500">상담 내용 (Consultation Notes)</label>
            <div className="bg-gray-50 p-3 rounded min-h-24 whitespace-pre-wrap text-gray-700">
              {caseData.consultation_notes || '(없음)'}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500">사건 개요 (Description)</label>
            <div className="bg-gray-50 p-3 rounded min-h-24 whitespace-pre-wrap text-gray-700">
              {caseData.description || '(없음)'}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500">상태</label>
            <div>
              <StatusBadge status={caseData.status} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. 상태 변환 */}
      <Card>
        <CardHeader>
          <CardTitle>상태 변환</CardTitle>
        </CardHeader>
        <CardContent>
          <CaseStatusForm caseId={caseData.id} currentStatus={caseData.status} />
        </CardContent>
      </Card>

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
