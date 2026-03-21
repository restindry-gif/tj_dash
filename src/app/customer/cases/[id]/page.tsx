import React from 'react'
import { getCurrentUser } from '@/lib/auth/session'
import { createDatabaseClient } from '@/lib/supabase/client'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { RouteMapDynamic } from '@/components/route-map-wrapper'
import { RouteDownloadButton, type TrackPoint } from '@/components/route-download-button'
import { OriginalRequestButton } from './original-request-button'
import { ReportFeedback } from './report-feedback'
import { formatDate, formatDateTime } from '@/lib/date'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:   { label: '대기 중',     color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  active:    { label: '조사 진행 중', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  completed: { label: '완료',        color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  cancelled: { label: '취소',        color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

const TYPE_CONFIG: Record<string, {
  label: string; accent: string; badge: string; iconBg: string; icon: React.ReactElement
}> = {
  text: {
    label: '텍스트', accent: 'border-slate-500', badge: 'bg-slate-700/60 text-slate-300', iconBg: 'bg-slate-700/60',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>,
  },
  location: {
    label: '위치', accent: 'border-blue-500', badge: 'bg-blue-500/10 text-blue-400', iconBg: 'bg-blue-500/10',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
  },
  photo: {
    label: '사진', accent: 'border-violet-500', badge: 'bg-violet-500/10 text-violet-400', iconBg: 'bg-violet-500/10',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/></svg>,
  },
  voice: {
    label: '음성', accent: 'border-red-500', badge: 'bg-red-500/10 text-red-400', iconBg: 'bg-red-500/10',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>,
  },
  route: {
    label: '동선', accent: 'border-orange-500', badge: 'bg-orange-500/10 text-orange-400', iconBg: 'bg-orange-500/10',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>,
  },
}

async function getRouteTrackPoints(sessionId: string): Promise<TrackPoint[]> {
  const supabase = createDatabaseClient()
  const { data } = await supabase
    .from('location_tracks')
    .select('lat, lng, accuracy, recorded_at')
    .eq('session_id', sessionId)
    .order('recorded_at', { ascending: true })
  return (data as TrackPoint[] | null) ?? []
}

export default async function CustomerCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')

  const supabase = createDatabaseClient()

  // 본인 사건인지 확인 (client_id 일치 필수)
  const { data: caseData } = await supabase
    .from('cases')
    .select('id, title, status, created_at, fee_amount, advance_payment, description')
    .eq('id', id)
    .eq('client_id', user.id)
    .single()

  if (!caseData) notFound()

  const { data: reports } = await supabase
    .from('case_reports')
    .select('*, profiles(full_name)')
    .eq('case_id', id)
    .eq('is_live', false)
    .eq('is_shared_with_customer', true)
    .order('created_at', { ascending: false })

  // 동선 보고의 GPS 포인트 일괄 로딩
  const routePointsMap: Record<string, TrackPoint[]> = {}
  if (reports) {
    await Promise.all(
      reports
        .filter((r) => r.report_type === 'route' && r.session_id)
        .map(async (r) => {
          routePointsMap[r.id] = await getRouteTrackPoints(r.session_id!)
        })
    )
  }

  const st = STATUS_CONFIG[caseData.status] ?? { label: caseData.status, color: 'bg-slate-700/50 text-slate-400 border-slate-600/30' }
  const remaining = caseData.fee_amount != null && caseData.advance_payment != null
    ? caseData.fee_amount - caseData.advance_payment
    : null

  return (
    <div className="space-y-5">
      {/* 뒤로 가기 */}
      <Link href="/customer" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        의뢰 목록
      </Link>

      {/* 사건 정보 카드 */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-base font-semibold text-slate-100 leading-snug">{caseData.title}</h1>
          <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${st.color}`}>
            {st.label}
          </span>
        </div>

        {caseData.description && (
          <p className="text-sm text-slate-400 leading-relaxed">{caseData.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
            <p className="text-[11px] text-slate-500 mb-1">의뢰일</p>
            <p className="text-xs text-slate-300 font-medium">
              {formatDate(caseData.created_at, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {caseData.fee_amount != null && (
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
              <p className="text-[11px] text-slate-500 mb-1">착수금 / 잔금</p>
              <p className="text-xs text-slate-300 font-medium">
                {caseData.advance_payment?.toLocaleString('ko-KR') ?? 0}원
                {remaining != null && remaining > 0 && (
                  <span className="text-slate-500"> / {remaining.toLocaleString('ko-KR')}원</span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 현장 보고 */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-300">현장 보고</h2>

        {!reports?.length ? (
          <div className="text-center py-10 border border-slate-800 rounded-xl bg-slate-900/30">
            <p className="text-slate-500 text-sm">아직 보고 내용이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {reports.map((report) => {
              const cfg = TYPE_CONFIG[report.report_type] ?? TYPE_CONFIG.text
              const trackPoints = routePointsMap[report.id] ?? []
              const mapPoints: [number, number][] = trackPoints.map((p) => [p.lat, p.lng])
              const memo = report.report_type === 'route' && report.content
                ? report.content.split('\n').slice(1).join('\n').trim()
                : null

              return (
                <div
                  key={report.id}
                  className={`bg-slate-800 border border-slate-600/60 border-l-4 ${cfg.accent} rounded-xl overflow-hidden shadow-sm shadow-black/20`}
                >
                  {/* 헤더 */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                        {cfg.icon}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      {report.profiles?.full_name && (
                        <span className="text-xs text-slate-400 truncate">{report.profiles.full_name}</span>
                      )}
                    </div>
                    <time className="text-xs text-slate-500 tabular-nums shrink-0 ml-2">
                      {formatDateTime(report.created_at, {
                        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </time>
                  </div>

                  {/* 바디 */}
                  <div className="px-4 pt-3 pb-4 space-y-3">
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
                    {report.report_type === 'route' && mapPoints.length > 0 && (
                      <div className="rounded-lg overflow-hidden border border-slate-700/40">
                        <RouteMapDynamic points={mapPoints} />
                      </div>
                    )}

                    {/* 동선 다운로드 버튼 */}
                    {report.report_type === 'route' && (
                      <RouteDownloadButton
                        points={trackPoints}
                        caseTitle={caseData.title}
                        staffName={report.profiles?.full_name ?? '담당자'}
                        totalKm={Number(report.distance_km ?? 0)}
                        reportDate={report.created_at}
                      />
                    )}

                    {/* 메모 (동선) */}
                    {memo && (
                      <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-700/30">
                        {memo}
                      </p>
                    )}

                    {/* 텍스트 내용 */}
                    {report.content && report.report_type !== 'route' && (
                      <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                        {report.content}
                      </p>
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

                    {/* 사진 */}
                    {report.media_url && (report.report_type === 'photo' || report.report_type === 'route') && (
                      <div className="space-y-2">
                        <img
                          src={report.media_url}
                          alt="현장 사진"
                          className="w-full rounded-lg max-h-64 object-cover border border-slate-700/40"
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={report.media_url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                            </svg>
                            사진 다운로드
                          </a>
                          <OriginalRequestButton
                            reportId={report.id}
                            caseId={caseData.id}
                            requested={report.original_requested ?? false}
                          />
                        </div>
                      </div>
                    )}

                    {/* 음성 */}
                    {report.media_url && report.report_type === 'voice' && (
                      <div className="bg-slate-900/60 rounded-lg px-3 py-3 border border-slate-700/30 space-y-2">
                        <audio controls src={report.media_url} className="w-full h-10" />
                        <a
                          href={report.media_url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                          </svg>
                          음성 다운로드
                        </a>
                      </div>
                    )}

                    {/* 고객 피드백 (확인 체크 + 코멘트) */}
                    <ReportFeedback
                      reportId={report.id}
                      caseId={caseData.id}
                      initialChecked={report.client_checked ?? false}
                      initialComment={report.client_comment ?? null}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
