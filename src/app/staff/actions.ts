'use server'

import { createDatabaseClient } from '@/lib/supabase/client'

interface SubmitReportParams {
  caseId: string
  staffId: string
  reportType: string
  content?: string
  lat?: number
  lng?: number
  address?: string
  mediaUrl?: string
  isLive?: boolean
}

export async function submitReport(params: SubmitReportParams) {
  const { caseId, staffId, reportType, content, lat, lng, address, mediaUrl, isLive } = params

  const supabase = createDatabaseClient()

  const { error } = await supabase.from('case_reports').insert({
    case_id: caseId,
    staff_id: staffId,
    report_type: reportType,
    content: content || null,
    lat: lat ?? null,
    lng: lng ?? null,
    address: address || null,
    media_url: mediaUrl || null,
    is_live: isLive ?? false,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

// ─── 동선 추적 ───────────────────────────────────────────────

/** 동선 추적 보고 시작: case_reports에 route 행 생성 */
export async function startRouteReport(caseId: string, staffId: string, sessionId: string) {
  const supabase = createDatabaseClient()

  const { data, error } = await supabase
    .from('case_reports')
    .insert({
      case_id: caseId,
      staff_id: staffId,
      report_type: 'route',
      session_id: sessionId,
      content: '동선 추적 중...',
      is_live: true,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { success: true, reportId: data.id }
}

/** GPS 포인트 배치 저장 */
export async function saveTrackPoints(
  points: { caseId: string; staffId: string; sessionId: string; lat: number; lng: number; accuracy?: number; recordedAt: string }[]
) {
  const supabase = createDatabaseClient()

  const rows = points.map((p) => ({
    case_id: p.caseId,
    staff_id: p.staffId,
    session_id: p.sessionId,
    lat: p.lat,
    lng: p.lng,
    accuracy: p.accuracy ?? null,
    recorded_at: p.recordedAt,
  }))

  const { error } = await supabase.from('location_tracks').insert(rows)
  if (error) return { error: error.message }
  return { success: true }
}

/** 동선 추적 취소: 보고 행 삭제 */
export async function cancelRouteReport(reportId: string) {
  const supabase = createDatabaseClient()
  await supabase.from('case_reports').delete().eq('id', reportId)
  return { success: true }
}

/** 동선 추적 종료: 보고 요약 업데이트 */
export async function endRouteReport(
  reportId: string,
  totalPoints: number,
  distanceKm: number,
  summary: string,
  mediaUrl?: string
) {
  const supabase = createDatabaseClient()

  const { error } = await supabase
    .from('case_reports')
    .update({
      content: summary,
      total_points: totalPoints,
      distance_km: distanceKm,
      is_live: false,
      ...(mediaUrl ? { media_url: mediaUrl } : {}),
    })
    .eq('id', reportId)

  if (error) return { error: error.message }
  return { success: true }
}
