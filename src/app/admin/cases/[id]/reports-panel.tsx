import { createDatabaseClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/session'
import { ReportCard } from './report-card'
import type { Report } from '@/lib/types/report'

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

  const routePointsMap: Record<string, [number, number][]> = {}
  if (reports) {
    const routeReports = reports.filter((r) => r.report_type === 'route' && r.session_id)
    const results = await Promise.all(routeReports.map((r) => getRoutePoints(r.session_id as string)))
    routeReports.forEach((r, i) => { routePointsMap[r.session_id as string] = results[i] })
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
            const routePts = report.session_id ? routePointsMap[report.session_id] : undefined
            return <ReportCard key={report.id} report={report} caseId={caseId} routePts={routePts} isAdmin={isAdmin} />
          })}
        </div>
      )}
    </div>
  )
}
