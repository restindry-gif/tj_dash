import React from 'react'
import { createDatabaseClient } from '@/lib/supabase/client'
import { RouteMapDynamic } from '@/components/route-map-wrapper'
import { CopyLinkButton } from '@/components/copy-link-button'
import { formatDateTime } from '@/lib/date'

// ─── Type accent config ──────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, {
  label: string
  accent: string      // left border
  badge: string       // badge bg + text
  iconBg: string      // icon background
  icon: React.ReactElement
}> = {
  text: {
    label: '텍스트',
    accent: 'border-slate-500',
    badge: 'bg-slate-700/60 text-slate-300',
    iconBg: 'bg-slate-700/60',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
      </svg>
    ),
  },
  location: {
    label: '위치',
    accent: 'border-blue-500',
    badge: 'bg-blue-500/10 text-blue-400',
    iconBg: 'bg-blue-500/10',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
  },
  photo: {
    label: '사진',
    accent: 'border-violet-500',
    badge: 'bg-violet-500/10 text-violet-400',
    iconBg: 'bg-violet-500/10',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>
      </svg>
    ),
  },
  voice: {
    label: '음성',
    accent: 'border-red-500',
    badge: 'bg-red-500/10 text-red-400',
    iconBg: 'bg-red-500/10',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>
      </svg>
    ),
  },
  route: {
    label: '동선',
    accent: 'border-orange-500',
    badge: 'bg-orange-500/10 text-orange-400',
    iconBg: 'bg-orange-500/10',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400">
        <circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>
      </svg>
    ),
  },
}

interface Report {
  id: string
  report_type: string
  content: string | null
  address: string | null
  lat: number | null
  lng: number | null
  media_url: string | null
  is_live: boolean
  created_at: string
  session_id: string | null
  total_points: number | null
  distance_km: number | null
  profiles: { full_name: string } | null
}

interface LocationTrack { lat: number; lng: number }

async function getRoutePoints(sessionId: string): Promise<[number, number][]> {
  const supabase = createDatabaseClient()
  const { data } = await supabase
    .from('location_tracks')
    .select('lat, lng')
    .eq('session_id', sessionId)
    .order('recorded_at', { ascending: true })
  return (data as LocationTrack[] | null)?.map((p) => [p.lat, p.lng] as [number, number]) ?? []
}

export async function ReportsPanel({ caseId }: { caseId: string }) {
  const supabase = createDatabaseClient()

  const { data: reports } = await supabase
    .from('case_reports')
    .select('*, profiles(full_name)')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })

  const routePointsMap: Record<string, [number, number][]> = {}
  if (reports) {
    const routeReports = reports.filter((r) => r.report_type === 'route' && r.session_id)
    const results = await Promise.all(routeReports.map((r) => getRoutePoints(r.session_id as string)))
    routeReports.forEach((r, i) => { routePointsMap[r.session_id as string] = results[i] })
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">현장 보고 내역</p>
        <span className="text-xs bg-slate-800 text-slate-400 rounded-full px-2.5 py-1">{reports?.length ?? 0}건</span>
      </div>

      {!reports || reports.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-10">현장 보고가 없습니다.</p>
      ) : (
        <div className="p-4 space-y-3">
          {(reports as Report[]).map((report) => {
            const cfg = TYPE_CONFIG[report.report_type] ?? TYPE_CONFIG.text
            const routePts = report.session_id ? routePointsMap[report.session_id] : undefined
            const memo = report.report_type === 'route' && report.content
              ? report.content.split('\n').slice(1).join('\n').trim()
              : null

            return (
              <div
                key={report.id}
                className={`bg-slate-800/50 border border-slate-700/50 border-l-4 ${cfg.accent} rounded-xl overflow-hidden`}
              >
                {/* 카드 헤더 */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40">
                  <div className="flex items-center gap-2">
                    {/* 타입 아이콘 */}
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                      {cfg.icon}
                    </span>
                    {/* 타입 배지 */}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    {/* LIVE */}
                    {report.is_live && (
                      <span className="flex items-center gap-1 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-2 py-0.5 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        LIVE
                      </span>
                    )}
                    {/* 보고자 */}
                    {report.profiles?.full_name && (
                      <span className="text-xs text-slate-400">{report.profiles.full_name}</span>
                    )}
                  </div>
                  {/* 시간 + 링크복사 */}
                  <div className="flex items-center gap-2 shrink-0">
                    <CopyLinkButton path={`/reports/${report.id}`} />
                    <time className="text-xs text-slate-500 tabular-nums">
                      {formatDateTime(report.created_at, {
                        month: 'numeric', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </time>
                  </div>
                </div>

                {/* 카드 바디 */}
                <div className="px-4 py-3 space-y-3">

                  {/* 동선 통계 */}
                  {report.report_type === 'route' && (report.total_points || report.distance_km) && (
                    <div className="grid grid-cols-2 gap-2">
                      {report.total_points != null && (
                        <div className="bg-slate-900/60 rounded-lg p-3 text-center border border-slate-700/30">
                          <p className="text-base font-bold text-slate-50 tabular-nums">{report.total_points}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">기록된 위치</p>
                        </div>
                      )}
                      {report.distance_km != null && (
                        <div className="bg-slate-900/60 rounded-lg p-3 text-center border border-slate-700/30">
                          <p className="text-base font-bold text-slate-50 tabular-nums">{Number(report.distance_km).toFixed(2)} km</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">이동거리</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 동선 지도 */}
                  {report.report_type === 'route' && (
                    routePts && routePts.length > 0 ? (
                      <div className="rounded-lg overflow-hidden border border-slate-700/40">
                        <RouteMapDynamic points={routePts} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg px-3 py-2.5 border border-slate-700/30">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 shrink-0">
                          <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
                        </svg>
                        <p className="text-xs text-slate-500">GPS 포인트 없음 — 세션이 짧거나 신호 수신 전 종료됨</p>
                      </div>
                    )
                  )}

                  {/* 메모 (동선) */}
                  {memo && (
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-700/30">{memo}</p>
                  )}

                  {/* 텍스트 내용 */}
                  {report.content && report.report_type !== 'route' && (
                    <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{report.content}</p>
                  )}

                  {/* 위치 정보 */}
                  {report.address && (
                    <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/15 rounded-lg px-3 py-2.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 mt-0.5 shrink-0">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-blue-300 text-xs leading-relaxed">{report.address}</p>
                        {report.lat && report.lng && (
                          <a
                            href={`https://maps.google.com/?q=${report.lat},${report.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 text-xs hover:text-blue-400 underline mt-1 inline-block"
                          >
                            지도에서 보기 →
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 사진 (photo 타입 또는 route에 첨부된 사진) */}
                  {report.media_url && (report.report_type === 'photo' || report.report_type === 'route') && (
                    <img
                      src={report.media_url}
                      alt="현장 사진"
                      className="w-full rounded-lg max-h-72 object-cover border border-slate-700/40"
                    />
                  )}

                  {/* 음성 */}
                  {report.media_url && report.report_type === 'voice' && (
                    <div className="bg-slate-900/60 rounded-lg px-3 py-3 border border-slate-700/30 space-y-1.5">
                      <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">음성 파일</p>
                      <audio controls src={report.media_url} className="w-full h-10" />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
