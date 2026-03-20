import { createDatabaseClient } from '@/lib/supabase/client'

const REPORT_TYPE_LABELS: Record<string, string> = {
  text: '텍스트',
  location: '위치',
  photo: '사진',
  voice: '음성',
}

const REPORT_TYPE_ICONS: Record<string, string> = {
  text: '✏️',
  location: '📍',
  photo: '📷',
  voice: '🎤',
}

export async function ReportsPanel({ caseId }: { caseId: string }) {
  const supabase = createDatabaseClient()

  const { data: reports } = await supabase
    .from('case_reports')
    .select('*, profiles(full_name)')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })

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
          {reports.map((report) => (
            <div key={report.id} className="px-6 py-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{REPORT_TYPE_ICONS[report.report_type] || '📋'}</span>
                  <span className="text-xs font-medium text-slate-300">
                    {REPORT_TYPE_LABELS[report.report_type] || '보고'}
                  </span>
                  {(report as Record<string, unknown> & { profiles?: { full_name: string } | null }).profiles?.full_name && (
                    <span className="text-xs text-slate-500">
                      — {(report as Record<string, unknown> & { profiles?: { full_name: string } | null }).profiles?.full_name}
                    </span>
                  )}
                  {report.is_live && (
                    <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-2 py-0.5">LIVE</span>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(report.created_at).toLocaleString('ko-KR')}
                </span>
              </div>

              {report.content && (
                <p className="text-slate-300 text-sm whitespace-pre-wrap">{report.content}</p>
              )}

              {report.address && (
                <p className="text-slate-400 text-xs flex items-center gap-1">
                  <span>📍</span> {report.address}
                  {report.lat && report.lng && (
                    <a
                      href={`https://maps.google.com/?q=${report.lat},${report.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-500 hover:text-blue-400 underline"
                    >
                      지도 보기
                    </a>
                  )}
                </p>
              )}

              {report.media_url && (
                <img
                  src={report.media_url}
                  alt="현장 사진"
                  className="mt-2 rounded-lg max-h-64 object-cover border border-slate-700"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
