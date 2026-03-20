import { createDatabaseClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/session'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ReportForm } from './report-form'
import { RouteTracker } from './route-tracker'
import { PhotoCapture } from './photo-capture'
import { VoiceRecorder } from './voice-recorder'

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
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* 뒤로가기 + 제목 */}
      <div className="flex items-center gap-3">
        <Link
          href="/staff"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          aria-label="뒤로가기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-50 truncate font-manrope">{caseData.title || '(제목 없음)'}</h1>
        </div>
        <span className={`text-xs rounded-full px-3 py-1.5 font-medium shrink-0 ${STATUS_STYLES[caseData.status] || 'bg-slate-700 text-slate-300 border border-slate-600'}`}>
          {STATUS_LABELS[caseData.status] || caseData.status}
        </span>
      </div>

      {/* 드라이브 모드 진입 버튼 */}
      <Link
        href={`/staff/cases/${id}/drive`}
        className="flex items-center justify-between w-full px-4 py-3 rounded-2xl transition-all cursor-pointer active:scale-[0.98] group"
        style={{ background: 'linear-gradient(135deg, rgba(233,193,118,0.12) 0%, rgba(233,193,118,0.06) 100%)', border: '1px solid rgba(233,193,118,0.2)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(233,193,118,0.15)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e9c176" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
              <path d="M2 12h20"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold font-manrope" style={{ color: '#e9c176' }}>드라이브 모드</p>
            <p className="text-xs text-slate-500">운전 중 음성 보고 — 전체화면</p>
          </div>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e9c176" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 group-hover:opacity-100 transition-opacity">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </Link>

      {/* 사건 개요 */}
      {caseData.description && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">사건 개요</p>
          <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{caseData.description}</p>
        </div>
      )}

      {/* 현장 보고 작성 */}
      <div id="report-form" className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">현장 보고 작성</p>
        </div>

        {/* 탭 스타일 섹션 */}
        <div className="divide-y divide-slate-800">
          {/* 텍스트 / 위치 */}
          <details className="group" open>
            <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none select-none hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                </svg>
                <span className="text-sm font-medium text-slate-300">텍스트 / 위치 보고</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 transition-transform group-open:rotate-180">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </summary>
            <div className="px-4 pb-4 pt-2">
              <ReportForm caseId={id} staffId={user.id} />
            </div>
          </details>

          {/* 사진 */}
          <details className="group">
            <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none select-none hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/>
                  <circle cx="12" cy="13" r="3"/>
                </svg>
                <span className="text-sm font-medium text-slate-300">사진 전송</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 transition-transform group-open:rotate-180">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </summary>
            <div className="px-4 pb-4 pt-2">
              <PhotoCapture caseId={id} staffId={user.id} />
            </div>
          </details>

          {/* 음성 */}
          <details className="group">
            <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none select-none hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" x2="12" y1="19" y2="22"/>
                </svg>
                <span className="text-sm font-medium text-slate-300">음성 녹음</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 transition-transform group-open:rotate-180">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </summary>
            <div className="px-4 pb-4 pt-2">
              <VoiceRecorder caseId={id} staffId={user.id} />
            </div>
          </details>

          {/* 동선 추적 */}
          <details className="group">
            <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none select-none hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                  <circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/>
                  <circle cx="18" cy="5" r="3"/>
                </svg>
                <span className="text-sm font-medium text-slate-300">동선 추적</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 transition-transform group-open:rotate-180">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </summary>
            <div className="px-4 pb-4 pt-2">
              <RouteTracker caseId={id} staffId={user.id} />
            </div>
          </details>
        </div>
      </div>

      {/* 보고 내역 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">보고 내역</p>
          <span className="text-xs bg-slate-800 text-slate-400 rounded-full px-2 py-0.5">{reports?.length ?? 0}</span>
        </div>
        {!reports || reports.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">보고 내역이 없습니다.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {reports.map((report) => (
              <ReportItem key={report.id} report={report as CaseReport} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ReportItem({ report }: { report: CaseReport }) {
  const ICONS: Record<string, string> = {
    text: '✏️', location: '📍', photo: '📷', voice: '🎤',
  }
  const TYPE_LABELS: Record<string, string> = {
    text: '텍스트', location: '위치', photo: '사진', voice: '음성',
  }

  return (
    <div className="px-4 py-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{ICONS[report.report_type] || '📋'}</span>
          <span className="text-xs font-medium text-slate-400">{TYPE_LABELS[report.report_type] || '보고'}</span>
          {report.is_live && (
            <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 rounded-full px-2 py-0.5 font-medium">LIVE</span>
          )}
        </div>
        <span className="text-[11px] text-slate-500">
          {new Date(report.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      {report.content && (
        <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{report.content}</p>
      )}
      {report.address && (
        <div className="flex items-start gap-1.5 bg-slate-800/50 rounded-xl p-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 mt-0.5 shrink-0">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-slate-400 text-xs leading-relaxed">{report.address}</p>
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
      {report.media_url && (
        <img src={report.media_url} alt="현장 사진" className="w-full rounded-xl max-h-56 object-cover border border-slate-700" />
      )}
    </div>
  )
}
