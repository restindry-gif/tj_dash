import React from 'react'
import { createDatabaseClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/session'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ReportForm } from './report-form'
import { WorkSessionControl } from './work-session-control'
import { CopyLinkButton } from '@/components/copy-link-button'
import { CaseStatusForm } from '@/app/admin/cases/[id]/status-form'

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
  original_requested: boolean | null
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

const REPORT_TYPE_CONFIG: Record<string, { label: string; accent: string; badge: string; iconBg: string; icon: React.ReactNode }> = {
  text: {
    label: '텍스트',
    accent: 'border-slate-500',
    badge: 'bg-slate-700/60 text-slate-300',
    iconBg: 'bg-slate-700/60',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>,
  },
  location: {
    label: '위치',
    accent: 'border-blue-500',
    badge: 'bg-blue-500/10 text-blue-400',
    iconBg: 'bg-blue-500/10',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
  },
  photo: {
    label: '사진',
    accent: 'border-violet-500',
    badge: 'bg-violet-500/10 text-violet-400',
    iconBg: 'bg-violet-500/10',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/></svg>,
  },
  voice: {
    label: '음성',
    accent: 'border-red-500',
    badge: 'bg-red-500/10 text-red-400',
    iconBg: 'bg-red-500/10',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>,
  },
  route: {
    label: '동선',
    accent: 'border-orange-500',
    badge: 'bg-orange-500/10 text-orange-400',
    iconBg: 'bg-orange-500/10',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>,
  },
}

function ReportItem({ report, caseId }: { report: CaseReport; caseId: string }) {
  const cfg = REPORT_TYPE_CONFIG[report.report_type] ?? REPORT_TYPE_CONFIG.text

  return (
    <div className={`bg-slate-800/50 border border-slate-700/50 border-l-4 ${cfg.accent} rounded-xl overflow-hidden`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/40">
        <div className="flex items-center gap-2">
          <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
            {cfg.icon}
          </span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
            {cfg.label}
          </span>
          {report.is_live && (
            <span className="flex items-center gap-1 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-2 py-0.5 font-semibold">
              <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />LIVE
            </span>
          )}
          {report.original_requested && (
            <span className="flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5 font-semibold">
              원본 요청됨
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CopyLinkButton path={`/reports/${report.id}`} />
          <time className="text-[11px] text-slate-500 tabular-nums">
            {new Date(report.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </time>
        </div>
      </div>
      {/* 바디 */}
      <div className="px-4 py-3 space-y-2.5">
        {report.content && (
          <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{report.content}</p>
        )}
        {report.address && (
          <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/15 rounded-lg px-3 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 mt-0.5 shrink-0">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-blue-300 text-xs leading-relaxed">{report.address}</p>
              {report.lat && report.lng && (
                <a href={`https://maps.google.com/?q=${report.lat},${report.lng}`} target="_blank" rel="noopener noreferrer"
                  className="text-blue-500 text-xs hover:text-blue-400 underline mt-0.5 inline-block">지도에서 보기 →</a>
              )}
            </div>
          </div>
        )}
        {report.media_url && (
          <img src={report.media_url} alt="현장 사진" className="w-full rounded-lg max-h-56 object-cover border border-slate-700/40" />
        )}
      </div>
    </div>
  )
}
