'use client'

import { useTransition, useState } from 'react'
import { CopyLinkButton } from '@/components/copy-link-button'
import { RouteMapDynamic } from '@/components/route-map-wrapper'
import { formatDateTime } from '@/lib/date'
import { toggleReportShare, deleteReport } from '../actions'
import type { Report } from '@/lib/types/report'

const TYPE_CONFIG: Record<string, {
  label: string
  accent: string
  badge: string
  iconBg: string
  icon: React.ReactElement
}> = {
  text: {
    label: '텍스트',
    accent: 'border-slate-400',
    badge: 'bg-slate-700/80 text-slate-300',
    iconBg: 'bg-slate-700/80',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>,
  },
  location: {
    label: '위치',
    accent: 'border-blue-400',
    badge: 'bg-blue-500/15 text-blue-300',
    iconBg: 'bg-blue-500/15',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
  },
  photo: {
    label: '사진',
    accent: 'border-violet-400',
    badge: 'bg-violet-500/15 text-violet-300',
    iconBg: 'bg-violet-500/15',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/></svg>,
  },
  voice: {
    label: '음성',
    accent: 'border-red-400',
    badge: 'bg-red-500/15 text-red-300',
    iconBg: 'bg-red-500/15',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>,
  },
  route: {
    label: '동선',
    accent: 'border-orange-400',
    badge: 'bg-orange-500/15 text-orange-300',
    iconBg: 'bg-orange-500/15',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>,
  },
}

interface PointMeta { time: string; address: string }

export function ReportCard({
  report,
  caseId,
  routePts,
  routeStartMeta,
  routeEndMeta,
  isAdmin = false,
}: {
  report: Report
  caseId: string
  routePts?: [number, number][]
  routeStartMeta?: PointMeta
  routeEndMeta?: PointMeta
  isAdmin?: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [isShared, setIsShared] = useState(report.is_shared_with_customer)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletePending, setDeletePending] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const handleToggleShare = () => {
    const newState = !isShared
    setIsShared(newState)
    startTransition(async () => {
      const result = await toggleReportShare(report.id, caseId, newState)
      if (result?.error) setIsShared(!newState)
    })
  }

  const handleDelete = async () => {
    setDeletePending(true)
    const result = await deleteReport(report.id, caseId)
    if (result.error) {
      setDeletePending(false)
      setConfirmDelete(false)
    } else {
      setDeleted(true)
    }
  }

  if (deleted) return null

  const cfg = TYPE_CONFIG[report.report_type] ?? TYPE_CONFIG.text
  const memo = report.report_type === 'route' && report.content
    ? report.content.split('\n').slice(1).join('\n').trim()
    : null
  const hasBadges = report.is_live || report.original_requested || report.client_checked

  return (
    <div className={`rounded-xl overflow-hidden border-l-4 ${cfg.accent} transition-all duration-200 ${
      isShared
        ? 'bg-slate-800 border border-slate-600/70 shadow-md shadow-black/20'
        : 'bg-slate-900/60 border border-slate-700/30'
    }`}>
      {/* 헤더 */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${
        isShared ? 'border-slate-600/50' : 'border-slate-700/30'
      }`}>
        {/* 좌: 타입 + 공유상태 + 직원명 */}
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
            {cfg.icon}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.badge}`}>
            {cfg.label}
          </span>
          {/* 공유 상태 인라인 뱃지 */}
          {isShared ? (
            <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5 font-semibold whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              고객 공유 중
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] bg-slate-700/50 text-slate-500 border border-slate-600/30 rounded-full px-2 py-0.5 font-semibold whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="11" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              비공개
            </span>
          )}
          {report.profiles?.full_name && (
            <span className="text-xs text-slate-400 truncate">{report.profiles.full_name}</span>
          )}
        </div>
        {/* 우: 공유 토글 + 링크 + 시간 */}
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button
            onClick={handleToggleShare}
            disabled={isPending}
            title={isShared ? '공유 중단' : '고객과 공유'}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
              isPending ? 'opacity-50' : ''
            } ${
              isShared
                ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500'
                : 'bg-slate-700/80 text-slate-300 border-slate-600/60 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            {isShared ? '공유 중' : '공유'}
          </button>
          <CopyLinkButton path={`/reports/${report.id}`} />
          <time className="text-xs text-slate-500 tabular-nums">
            {formatDateTime(report.created_at, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </time>
          {/* 관리자 삭제 버튼 */}
          {isAdmin && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              title="보고카드 삭제"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 삭제 확인 바 */}
      {confirmDelete && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-red-950/40 border-b border-red-500/30">
          <p className="text-xs text-red-300">
            휴지통으로 이동합니다. <span className="text-red-400 font-semibold">3일 후 영구 삭제</span>됩니다.
          </p>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deletePending}
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1 rounded-lg transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              onClick={handleDelete}
              disabled={deletePending}
              className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {deletePending ? '삭제 중...' : '삭제 확인'}
            </button>
          </div>
        </div>
      )}

      {/* 상태 뱃지 행 (LIVE / 원본요청 / 의뢰인확인) */}
      {hasBadges && (
        <div className={`flex items-center gap-1.5 px-4 py-1.5 border-b flex-wrap ${
          isShared ? 'border-slate-600/40 bg-slate-800/50' : 'border-slate-700/20 bg-slate-900/30'
        }`}>
          {report.is_live && (
            <span className="flex items-center gap-1 text-[10px] bg-red-500/15 text-red-400 border border-red-500/25 rounded-full px-2 py-0.5 font-semibold whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />LIVE
            </span>
          )}
          {report.original_requested && (
            <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/25 rounded-full px-2 py-0.5 font-semibold whitespace-nowrap">
              원본 요청됨
            </span>
          )}
          {report.client_checked && (
            <span className="flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-full px-2 py-0.5 font-semibold whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
              의뢰인 확인
            </span>
          )}
        </div>
      )}

      {/* 바디 — 미공유 시 opacity 낮춤 */}
      <div className={`px-4 py-3 space-y-3 ${!isShared ? 'opacity-55' : ''}`}>
        {report.report_type === 'route' && (report.total_points || report.distance_km) && (
          <div className="grid grid-cols-2 gap-2">
            {report.total_points != null && (
              <div className="bg-slate-900/80 rounded-lg p-3 text-center border border-slate-700/40">
                <p className="text-base font-bold text-slate-50 tabular-nums">{report.total_points}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">기록된 위치</p>
              </div>
            )}
            {report.distance_km != null && (
              <div className="bg-slate-900/80 rounded-lg p-3 text-center border border-slate-700/40">
                <p className="text-base font-bold text-slate-50 tabular-nums">{Number(report.distance_km).toFixed(2)} km</p>
                <p className="text-[11px] text-slate-500 mt-0.5">이동거리</p>
              </div>
            )}
          </div>
        )}

        {report.report_type === 'route' && (
          routePts && routePts.length > 0 ? (
            <div className="rounded-lg overflow-hidden border border-slate-700/40">
              <RouteMapDynamic points={routePts} startMeta={routeStartMeta} endMeta={routeEndMeta} />
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-900/60 rounded-lg px-3 py-2.5 border border-slate-700/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 shrink-0">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
              </svg>
              <p className="text-xs text-slate-500">GPS 포인트 없음</p>
            </div>
          )
        )}

        {memo && (
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap bg-slate-900/60 rounded-lg px-3 py-2.5 border border-slate-700/30">{memo}</p>
        )}

        {report.content && report.report_type !== 'route' && (
          <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{report.content}</p>
        )}

        {report.address && (
          <div className="flex items-start gap-2.5 bg-blue-500/5 border border-blue-500/15 rounded-lg px-3 py-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 mt-0.5 shrink-0">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-blue-300 text-xs leading-relaxed">{report.address}</p>
              {report.lat && report.lng && (
                <a href={`https://maps.google.com/?q=${report.lat},${report.lng}`} target="_blank" rel="noopener noreferrer"
                  className="text-blue-500 text-xs hover:text-blue-400 underline mt-1 inline-block">
                  지도에서 보기 →
                </a>
              )}
            </div>
          </div>
        )}

        {report.media_url && (report.report_type === 'photo' || report.report_type === 'route') && (
          <img src={report.media_url} alt="현장 사진" className="w-full rounded-lg max-h-72 object-cover border border-slate-700/40" />
        )}

        {report.media_url && report.report_type === 'voice' && (
          <div className="bg-slate-900/70 rounded-lg px-3 py-3 border border-slate-700/30 space-y-1.5">
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">음성 파일</p>
            <audio controls src={report.media_url} className="w-full h-10" />
          </div>
        )}

        {report.client_comment && (
          <div className="flex items-start gap-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 mt-0.5 shrink-0">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wide mb-1">의뢰인 코멘트</p>
              <p className="text-sm text-emerald-300 leading-relaxed whitespace-pre-wrap">{report.client_comment}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
