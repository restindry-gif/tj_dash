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
          <h1 className="text-2xl font-bold text-red-400 mb-4">상담을 찾을 수 없습니다</h1>
          <p className="text-slate-400 text-sm mb-4">ID: {id}</p>
          {error && <p className="text-slate-500 text-xs mb-4">오류: {error.message}</p>}
          <Link href="/admin/consultations" className="text-slate-400 hover:text-slate-200 transition-colors">
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
      {/* 뒤로가기 */}
      <div>
        <Link
          href="/admin/consultations"
          className="text-slate-400 hover:text-slate-200 transition-colors text-sm"
        >
          ← 상담 목록으로
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-slate-50">상담 상세보기</h1>

      {/* 기본 정보 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <p className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-3">기본 정보</p>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-slate-400 mb-1">의뢰인 이름</p>
            <p className="text-lg font-semibold text-slate-50">{consultation.customer_name}</p>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1">상담 상태</p>
            <StatusBadge status={consultation.status} />
          </div>

          {consultation.customer_email && (
            <div>
              <p className="text-xs text-slate-400 mb-1">이메일</p>
              <p className="text-slate-300">{consultation.customer_email}</p>
            </div>
          )}

          {consultation.customer_phone && (
            <div>
              <p className="text-xs text-slate-400 mb-1">전화번호</p>
              <p className="text-slate-300">{consultation.customer_phone}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-slate-400 mb-1">상담 일시</p>
            <p className="text-slate-300">{formatDate(consultation.consultation_date)}</p>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1">담당자</p>
            <p className="text-slate-300">{staffName}</p>
          </div>
        </div>
      </div>

      {/* 상담 내용 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
        <p className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-3">상담 내용</p>
        <div className="bg-slate-800 rounded-lg p-4 whitespace-pre-wrap text-slate-300 text-sm leading-relaxed">
          {consultation.content}
        </div>
      </div>

      {/* 메모 */}
      {consultation.notes && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
          <p className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-3">메모</p>
          <div className="bg-slate-800 rounded-lg p-4 whitespace-pre-wrap text-slate-300 text-sm leading-relaxed">
            {consultation.notes}
          </div>
        </div>
      )}

      {/* 상태 변환 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <p className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-4">상태 변환</p>
        <StatusChangeForm consultationId={consultation.id} currentStatus={consultation.status} />
      </div>

      {/* 사건 전환 */}
      <div className="bg-slate-900 border border-green-500/30 bg-green-500/5 rounded-xl p-6">
        <p className="text-slate-300 font-semibold text-sm uppercase tracking-wider mb-4">사건 전환</p>
        <ConvertToCaseButton
          consultationId={consultation.id}
          isConverted={consultation.status === 'converted'}
        />
      </div>

      {/* 메타 정보 */}
      <div className="text-xs text-slate-500 space-y-1 pb-4">
        <p>등록일: {formatDate(consultation.created_at)}</p>
        <p>ID: {consultation.id}</p>
      </div>
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
