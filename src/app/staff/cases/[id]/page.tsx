import React from 'react'
import { createDatabaseClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/session'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ReportForm } from './report-form'
import { WorkSessionControl } from './work-session-control'
import { CopyLinkButton } from '@/components/copy-link-button'
import { CaseStatusForm } from '@/app/admin/cases/[id]/status-form'
import { formatDateTime } from '@/lib/date'
import { ReportItem } from './report-item'

const STATUS_LABELS: Record<string, string> = {
  pending: '대기',
  active: '진행',
  completed: '완료',
  cancelled: '취소',
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20',
  active: 'bg-blue-400/10 text-blue-400 border border-blue-400/20',
  completed: 'bg-green-400/10 text-green-400 border border-green-400/20',
  cancelled: 'bg-red-400/10 text-red-400 border border-red-400/20',
}

interface CaseReport {
  id: string
  report_type: string
  content: string | null
  address: string | null
  lat: number | null
  lng: number | null
  media_url: string | null
  is_live: boolean
  is_shared_with_customer: boolean
  original_requested: boolean | null
  client_checked: boolean | null
  client_comment: string | null
  created_at: string
}

export default async function StaffCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')

  const supabase = createDatabaseClient()

  const [{ data: caseData }, { data: reports }] = await Promise.all([
    supabase.from('cases').select('*').eq('id', id).single(),
    supabase
      .from('case_reports')
      .select('*')
      .eq('case_id', id)
      .order('created_at', { ascending: false }),
  ])

  // 의뢰인 정보 조회
  const { data: client } = caseData?.client_id
    ? await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', caseData.client_id)
        .maybeSingle()
    : { data: null }

  if (!caseData) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400">사건을 찾을 수 없습니다.</p>
        <Link href="/staff" className="text-blue-400 hover:text-blue-300 text-sm mt-4 inline-block">← 목록으로</Link>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* 뒤로가기 + 제목 */}
      <div className="flex items-center gap-3">
        <Link
          href="/staff"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          aria-label="뒤로가기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-50 truncate font-manrope">{caseData.title || '(제목 없음)'}</h1>
        </div>
        <span className={`text-xs rounded-full px-3 py-1.5 font-medium shrink-0 ${STATUS_STYLES[caseData.status] || 'bg-slate-700 text-slate-300 border border-slate-600'}`}>
          {STATUS_LABELS[caseData.status] || caseData.status}
        </span>
      </div>

      {/* 드라이브 모드 진입 버튼 */}
      <Link
        href={`/staff/cases/${id}/drive`}
        className="flex items-center justify-between w-full px-4 py-3 rounded-2xl transition-all cursor-pointer active:scale-[0.98] group"
        style={{ background: 'linear-gradient(135deg, rgba(233,193,118,0.12) 0%, rgba(233,193,118,0.06) 100%)', border: '1px solid rgba(233,193,118,0.2)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(233,193,118,0.15)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e9c176" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
              <path d="M2 12h20"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold font-manrope" style={{ color: '#e9c176' }}>드라이브 모드</p>
            <p className="text-xs text-slate-500">운전 중 음성 보고 — 전체화면</p>
          </div>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e9c176" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 group-hover:opacity-100 transition-opacity">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </Link>

      {/* 사건 개요 */}
      {caseData.description && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">사건 개요</p>
          <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{caseData.description}</p>
        </div>
      )}

      {/* 의뢰인 연락처 */}
      {client && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">의뢰인</p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-blue-400">
                  {(client.full_name ?? '?')[0]}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">{client.full_name ?? '(이름 없음)'}</p>
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    {client.phone}
                  </a>
                )}
              </div>
            </div>
            {client.phone && (
              <a
                href={`tel:${client.phone}`}
                className="flex items-center gap-1.5 text-xs bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.79-1.79a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                전화
              </a>
            )}
          </div>
        </div>
      )}

      {/* 상태 변경 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">상태 변경</p>
        <CaseStatusForm caseId={id} currentStatus={caseData.status} />
      </div>

      {/* 현장 보고 작성 */}
      <div id="report-form" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">현장 보고 작성</p>
        <ReportForm caseId={id} staffId={user.id} />
      </div>

      {/* 업무 시작 / 동선 추적 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">업무 세션</p>
        <WorkSessionControl caseId={id} staffId={user.id} caseTitle={caseData.title || '(제목 없음)'} />
      </div>

      {/* 보고 내역 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">보고 내역</p>
          <span className="text-xs bg-slate-800 text-slate-400 rounded-full px-2 py-0.5">{reports?.length ?? 0}</span>
        </div>
        {!reports || reports.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">보고 내역이 없습니다.</p>
        ) : (
          <div className="p-3 space-y-2.5">
            {reports.map((report) => (
              <ReportItem key={report.id} report={report as CaseReport} caseId={id} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

