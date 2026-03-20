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
