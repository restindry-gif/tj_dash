import { createDatabaseClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/session'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ReportForm } from './report-form'

const STATUS_LABELS: Record<string, string> = {
  pending: '대기 중',
  active: '진행 중',
  completed: '완료됨',
  cancelled: '취소됨',
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20',
  active: 'bg-blue-400/10 text-blue-400 border border-blue-400/20',
  completed: 'bg-green-400/10 text-green-400 border border-green-400/20',
  cancelled: 'bg-red-400/10 text-red-400 border border-red-400/20',
}

export default async function StaffCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')

  const supabase = createDatabaseClient()

  const [{ data: caseData }, { data: reports }] = await Promise.all([
    supabase.from('cases').select('*').eq('id', id).single(),
    supabase
      .from('case_reports')
      .select('*')
      .eq('case_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!caseData) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400">사건을 찾을 수 없습니다.</p>
        <Link href="/staff" className="text-blue-400 hover:text-blue-300 text-sm mt-4 inline-block">← 목록으로</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/staff" className="text-slate-400 hover:text-slate-300 text-sm transition-colors">← 목록으로</Link>
      </div>

      {/* 사건 정보 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-bold text-slate-50 leading-tight">{caseData.title || '(제목 없음)'}</h1>
          <span className={`text-xs rounded-full px-3 py-1 font-medium shrink-0 ${STATUS_STYLES[caseData.status] || 'bg-slate-700 text-slate-300 border border-slate-600'}`}>
            {STATUS_LABELS[caseData.status] || caseData.status}
          </span>
        </div>
        {caseData.description && (
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">사건 개요</p>
            <p className="text-slate-300 text-sm whitespace-pre-wrap">{caseData.description}</p>
          </div>
        )}
        <p className="text-slate-500 text-xs">등록일: {new Date(caseData.created_at).toLocaleDateString('ko-KR')}</p>
      </div>

      {/* 현장 보고 작성 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">현장 보고 작성</p>
        <ReportForm caseId={id} staffId={user.id} />
      </div>

      {/* 보고 내역 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">보고 내역</p>
          <span className="text-xs text-slate-500">{reports?.length ?? 0}건</span>
        </div>
        {!reports || reports.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">보고 내역이 없습니다.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {reports.map((report) => (
              <ReportItem key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface CaseReport {
  id: string
  report_type: string
  content: string | null
  address: string | null
  lat: number | null
  lng: number | null
  media_url: string | null
  is_live: boolean
  created_at: string
}

function ReportItem({ report }: { report: CaseReport }) {
  const ICONS: Record<string, string> = {
    text: '✏️',
    location: '📍',
    photo: '📷',
    voice: '🎤',
  }

  return (
    <div className="px-6 py-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{ICONS[report.report_type] || '📋'}</span>
          <span className="text-xs font-medium text-slate-400">
            {report.report_type === 'text' ? '텍스트 보고'
              : report.report_type === 'location' ? '위치 보고'
              : report.report_type === 'photo' ? '사진 보고'
              : report.report_type === 'voice' ? '음성 보고'
              : '보고'}
          </span>
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
            <span className="text-slate-600 ml-1">({Number(report.lat).toFixed(5)}, {Number(report.lng).toFixed(5)})</span>
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
  )
}
