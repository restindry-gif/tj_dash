import { createDatabaseClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/session'
import { formatDateTime } from '@/lib/date'
import { ReportCard } from './report-card'
import type { Report } from '@/lib/types/report'

interface LocationTrack { lat: number; lng: number; recorded_at: string }

interface PointMeta { time: string; address: string }
interface RouteData {
  points: [number, number][]
  startMeta?: PointMeta
  endMeta?: PointMeta
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ko`,
      { headers: { 'User-Agent': 'TJ-Dash/1.0' }, next: { revalidate: 86400 } }
    )
    const data = await res.json()
    const addr = data.address ?? {}
    return (
      [addr.borough ?? addr.county, addr.suburb ?? addr.neighbourhood]
        .filter(Boolean)
        .join(' ') || '위치 정보 없음'
    )
  } catch {
    return '위치 정보 없음'
  }
}

async function getRouteData(sessionId: string): Promise<RouteData> {
  const supabase = createDatabaseClient()
  const { data } = await supabase
    .from('location_tracks')
    .select('lat, lng, recorded_at')
    .eq('session_id', sessionId)
    .order('recorded_at', { ascending: true })

  const tracks = (data as LocationTrack[] | null) ?? []
  const points: [number, number][] = tracks.map((p) => [p.lat, p.lng])

  if (points.length === 0) return { points }

  const first = tracks[0]
  const last = tracks[tracks.length - 1]
  const isMulti = tracks.length > 1

  const [startAddr, endAddr] = await Promise.all([
    reverseGeocode(first.lat, first.lng),
    isMulti ? reverseGeocode(last.lat, last.lng) : Promise.resolve(''),
  ])

  return {
    points,
    startMeta: {
      time: formatDateTime(first.recorded_at, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      address: startAddr,
    },
    endMeta: isMulti
      ? {
          time: formatDateTime(last.recorded_at, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          address: endAddr,
        }
      : undefined,
  }
}

export async function ReportsPanel({ caseId }: { caseId: string }) {
  const supabase = createDatabaseClient()
  const user = await getCurrentUser()
  const isAdmin = user?.role === 'admin'

  const { data: reports, error } = await supabase
    .from('case_reports')
    .select('*, profiles!staff_id(full_name)')
    .eq('case_id', caseId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <p className="text-red-400 text-sm">보고 내역 조회 오류: {error.message}</p>
        {error.message.includes('is_shared_with_customer') && (
          <p className="text-slate-500 text-xs mt-2">Supabase 마이그레이션을 실행해주세요: <code>ALTER TABLE case_reports ADD COLUMN is_shared_with_customer BOOLEAN NOT NULL DEFAULT false;</code></p>
        )}
      </div>
    )
  }

  const routeDataMap: Record<string, RouteData> = {}
  if (reports) {
    const routeReports = reports.filter((r) => r.report_type === 'route' && r.session_id)
    const results = await Promise.all(routeReports.map((r) => getRouteData(r.session_id as string)))
    routeReports.forEach((r, i) => { routeDataMap[r.session_id as string] = results[i] })
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">현장 보고 내역</p>
        <span className="text-xs bg-slate-800 text-slate-400 rounded-full px-2.5 py-1">{reports?.length ?? 0}건</span>
      </div>

      {!reports || reports.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-10">현장 보고가 없습니다.</p>
      ) : (
        <div className="p-4 space-y-3">
          {(reports as Report[]).map((report) => {
            const rd = report.session_id ? routeDataMap[report.session_id] : undefined
            return (
              <ReportCard
                key={report.id}
                report={report}
                caseId={caseId}
                routePts={rd?.points}
                routeStartMeta={rd?.startMeta}
                routeEndMeta={rd?.endMeta}
                isAdmin={isAdmin}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
