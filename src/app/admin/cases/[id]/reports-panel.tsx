import React from 'react'
import { createDatabaseClient } from '@/lib/supabase/client'
import { RouteMapDynamic } from '@/components/route-map-wrapper'

const REPORT_TYPE_LABELS: Record<string, string> = {
  text: '텍스트',
  location: '위치',
  photo: '사진',
  voice: '음성',
  route: '동선',
}

const REPORT_TYPE_ICONS: Record<string, React.ReactElement> = {
  text: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
    </svg>
  ),
  location: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  route: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/>
      <circle cx="18" cy="5" r="3"/>
    </svg>
  ),
  photo: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/>
      <circle cx="12" cy="13" r="3"/>
    </svg>
  ),
  voice: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>
    </svg>
  ),
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

interface LocationTrack {
  lat: number
  lng: number
}

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

  // Fetch route points for all route-type reports in parallel
  const routePointsMap: Record<string, [number, number][]> = {}
  if (reports) {
    const routeReports = reports.filter((r) => r.report_type === 'route' && r.session_id)
    const results = await Promise.all(
      routeReports.map((r) => getRoutePoints(r.session_id as string))
    )
    routeReports.forEach((r, i) => {
      routePointsMap[r.session_id as string] = results[i]
    })
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">현장 보고 내역</p>
        <span className="text-xs text-slate-500">{reports?.length ?? 0}건</span>
      </div>

      {!reports || reports.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">현장 보고가 없습니다.</p>
      ) : (
        <div className="divide-y divide-slate-800">
          {(reports as Report[]).map((report) => (
            <div key={report.id} className="px-6 py-5 space-y-3">
              {/* 헤더 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`flex items-center justify-center w-6 h-6 rounded-md ${
                    report.report_type === 'route' ? 'bg-orange-500/10 text-orange-400' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {REPORT_TYPE_ICONS[report.report_type]}
                  </span>
                  <span className="text-xs font-medium text-slate-300">
                    {REPORT_TYPE_LABELS[report.report_type] || '보고'}
                  </span>
                  {report.profiles?.full_name && (
                    <span className="text-xs text-slate-500">— {report.profiles.full_name}</span>
                  )}
                  {report.is_live && (
                    <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-2 py-0.5">LIVE</span>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(report.created_at).toLocaleString('ko-KR')}
                </span>
              </div>

              {/* 동선 보고 */}
              {report.report_type === 'route' && (
                <div className="space-y-3">
                  {/* 요약 통계 */}
                  {(report.total_points || report.distance_km) && (
                    <div className="grid grid-cols-2 gap-3">
                      {report.total_points && (
                        <div className="bg-slate-800 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-slate-50">{report.total_points}</p>
                          <p className="text-xs text-slate-500">기록된 위치</p>
                        </div>
                      )}
                      {report.distance_km && (
                        <div className="bg-slate-800 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-slate-50">{Number(report.distance_km).toFixed(2)}</p>
                          <p className="text-xs text-slate-500">이동거리 (km)</p>
                        </div>
                      )}
                    </div>
                  )}
                  {/* 지도 */}
                  {report.session_id && routePointsMap[report.session_id]?.length > 0 ? (
                    <RouteMapDynamic points={routePointsMap[report.session_id]} />
                  ) : (
                    <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl px-4 py-3 text-slate-500 text-xs">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
                      </svg>
                      GPS 포인트 없음 — 세션이 너무 짧거나 GPS 신호를 받기 전에 종료되었습니다
                    </div>
                  )}
                </div>
              )}

              {/* 텍스트 내용 */}
              {report.content && report.report_type !== 'route' && (
                <p className="text-slate-300 text-sm whitespace-pre-wrap">{report.content}</p>
              )}
              {report.report_type === 'route' && report.content && (() => {
                const memo = report.content.split('\n').slice(1).join('\n').trim()
                return memo
                  ? <p className="text-slate-300 text-sm whitespace-pre-wrap bg-slate-800/50 rounded-lg px-3 py-2">{memo}</p>
                  : null
              })()}

              {report.address && (
                <p className="text-slate-400 text-xs flex items-center gap-1">
                  <span className="text-blue-400">📍</span> {report.address}
                  {report.lat && report.lng && (
                    <a href={`https://maps.google.com/?q=${report.lat},${report.lng}`} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-500 hover:text-blue-400 underline">
                      지도 보기
                    </a>
                  )}
                </p>
              )}

              {report.media_url && report.report_type === 'photo' && (
                <img src={report.media_url} alt="현장 사진" className="rounded-lg max-h-64 object-cover border border-slate-700" />
              )}
              {report.media_url && report.report_type === 'voice' && (
                <div className="bg-slate-800 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-slate-500">음성 파일</p>
                  <audio controls src={report.media_url} className="w-full h-10" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
