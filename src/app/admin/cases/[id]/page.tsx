import { createDatabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { CaseStatusForm } from './status-form'
import { AssignStaffForm } from './assign-staff-form'
import { FeeForm } from './fee-form'
import { ReportsPanel } from './reports-panel'

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
      <div className="min-h-screen bg-slate-950 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">사건을 찾을 수 없습니다</h1>
          <p className="text-slate-400 text-sm mb-4">ID: {id}</p>
          {error && <p className="text-slate-500 text-xs mb-4">오류: {error.message}</p>}
          <Link href="/admin" className="text-blue-400 hover:text-blue-300">
            대시보드로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  // Fetch client, staff, staffList in parallel
  const [{ data: client }, staffResult, { data: staffList }] = await Promise.all([
    supabase.from('profiles').select('full_name, email, phone').eq('id', caseData.client_id).single(),
    caseData.assigned_staff_id
      ? supabase.from('profiles').select('full_name').eq('id', caseData.assigned_staff_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('profiles').select('id, full_name').in('role', ['staff', 'admin']).order('full_name', { ascending: true }),
  ])

  const staffName = (staffResult as { data: { full_name: string } | null }).data?.full_name || '-'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <Link href="/admin" className="text-slate-400 hover:text-slate-300 text-sm transition-colors">
          ← 대시보드로
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-slate-50">사건 상세</h1>

      {/* 1. 의뢰인 정보 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">의뢰인 정보</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">이름</p>
            <p className="text-slate-300">{client?.full_name || '-'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">전화번호</p>
            <p className="text-slate-300">{client?.phone || '-'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">이메일</p>
            <p className="text-slate-300">{client?.email || '-'}</p>
          </div>
        </div>
      </div>

      {/* 2. 사건 정보 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">사건 정보</p>

        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">사건명</p>
          <p className="text-slate-300">{caseData.title || '-'}</p>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">수임료</p>
          <FeeForm
            caseId={caseData.id}
            feeAmount={caseData.fee_amount}
            advancePayment={caseData.advance_payment}
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">담당 직원</p>
          <AssignStaffForm
            caseId={caseData.id}
            currentStaffId={caseData.assigned_staff_id}
            staffList={staffList || []}
            currentStaffName={staffName}
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">상담 내용</p>
          <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 min-h-24 whitespace-pre-wrap text-slate-300 text-sm">
            {caseData.consultation_notes || '(없음)'}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">사건 개요</p>
          <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 min-h-24 whitespace-pre-wrap text-slate-300 text-sm">
            {caseData.description || '(없음)'}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">상태</p>
          <div>
            <StatusBadge status={caseData.status} />
          </div>
        </div>
      </div>

      {/* 3. 상태 변경 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">상태 변경</p>
        <CaseStatusForm caseId={caseData.id} currentStatus={caseData.status} />
      </div>

      {/* 4. 현장 보고 내역 */}
      <ReportsPanel caseId={caseData.id} />

      {/* 메타 정보 */}
      <div className="text-slate-600 text-xs space-y-1">
        <p>생성일: {formatDate(caseData.created_at)}</p>
        <p>ID: {caseData.id}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 rounded-full px-3 py-1 text-xs font-medium',
    active: 'bg-blue-400/10 text-blue-400 border border-blue-400/20 rounded-full px-3 py-1 text-xs font-medium',
    completed: 'bg-green-400/10 text-green-400 border border-green-400/20 rounded-full px-3 py-1 text-xs font-medium',
    cancelled: 'bg-red-400/10 text-red-400 border border-red-400/20 rounded-full px-3 py-1 text-xs font-medium',
  }

  const labels: Record<string, string> = {
    pending: '대기',
    active: '진행',
    completed: '완료',
    cancelled: '취소',
  }

  return (
    <span
      className={
        styles[status] ||
        'bg-slate-700 text-slate-300 border border-slate-600 rounded-full px-3 py-1 text-xs font-medium'
      }
    >
      {labels[status] || status}
    </span>
  )
}
