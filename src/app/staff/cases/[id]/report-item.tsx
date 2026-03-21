'use client'

import { useState, useTransition } from 'react'
import { CopyLinkButton } from '@/components/copy-link-button'
import { formatDateTime } from '@/lib/date'
import { toggleReportShare } from '@/app/admin/cases/actions'

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

export function ReportItem({ report, caseId }: { report: CaseReport; caseId: string }) {
  const [isPending, startTransition] = useTransition()
  const [isShared, setIsShared] = useState(report.is_shared_with_customer)
  const cfg = REPORT_TYPE_CONFIG[report.report_type] ?? REPORT_TYPE_CONFIG.text

  const handleToggleShare = () => {
    const newState = !isShared
    setIsShared(newState)
    startTransition(async () => {
      const result = await toggleReportShare(report.id, caseId, newState)
      if (result?.error) setIsShared(!newState)
    })
  }

  const hasBadges = report.is_live || report.original_requested || report.client_checked

  return (
    <div className={`bg-slate-800/50 border border-slate-700/50 border-l-4 ${cfg.accent} rounded-xl overflow-hidden`}>
      {/* 헤더 1행: 타입 + 액션 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/40">
        {/* 타입 */}
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
            {cfg.icon}
          </span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>
        {/* 액션: 공유 토글 + 링크 + 시간 */}
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button
            onClick={handleToggleShare}
            disabled={isPending}
            title={isShared ? '공유 중단' : '고객과 공유'}
            className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
              isPending ? 'opacity-50' : ''
            } ${
              isShared
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-slate-700/60 text-slate-400 border-slate-600/40 hover:bg-slate-700'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            {isShared ? '공유 중' : '공유'}
          </button>
          <CopyLinkButton path={`/reports/${report.id}`} />
          <time className="text-[11px] text-slate-500 tabular-nums">
            {formatDateTime(report.created_at, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </time>
        </div>
      </div>
      {/* 헤더 2행: 상태 뱃지 (있을 때만) */}
      {hasBadges && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-slate-700/30 flex-wrap">
          {report.is_live && (
            <span className="flex items-center gap-1 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-2 py-0.5 font-semibold whitespace-nowrap">
              <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />LIVE
            </span>
          )}
          {report.original_requested && (
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5 font-semibold whitespace-nowrap">
              원본 요청됨
            </span>
          )}
          {report.client_checked && (
            <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5 font-semibold whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
              의뢰인 확인
            </span>
          )}
        </div>
      )}
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
        {report.client_comment && (
          <div className="flex items-start gap-2 bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-3 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 mt-0.5 shrink-0">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p className="text-xs text-emerald-300 leading-relaxed whitespace-pre-wrap">{report.client_comment}</p>
          </div>
        )}
      </div>
    </div>
  )
}
