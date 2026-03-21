import { createDatabaseClient } from '@/lib/supabase/client'
import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { purgeExpiredReports, purgeExpiredCases } from '@/app/admin/cases/actions'
import { RestoreButton } from './restore-button'
import { CaseRestoreButton } from './case-restore-button'
import { formatDateTime } from '@/lib/date'

const TRASH_DAYS = 3

const TYPE_LABEL: Record<string, string> = {
  text: '텍스트', location: '위치', photo: '사진', voice: '음성', route: '동선',
}

const STATUS_LABELS: Record<string, string> = {
  pending: '대기', active: '진행', completed: '완료', cancelled: '취소',
}

function daysLeft(deletedAt: string): number {
  const expiry = new Date(deletedAt).getTime() + TRASH_DAYS * 24 * 60 * 60 * 1000
  return Math.max(0, Math.ceil((expiry - Date.now()) / (24 * 60 * 60 * 1000)))
}

export default async function TrashPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/admin')

  // 만료된 항목 자동 정리
  await Promise.all([purgeExpiredReports(), purgeExpiredCases()])

  const supabase = createDatabaseClient()

  const [{ data: trashed }, { data: trashedCases }] = await Promise.all([
    supabase
      .from('case_reports')
      .select('*, cases(id, title), profiles!staff_id(full_name)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
    supabase
      .from('cases')
      .select('id, title, status, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
  ])

  const totalCount = (trashed?.length ?? 0) + (trashedCases?.length ?? 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-50">휴지통</h1>
          <p className="text-sm text-slate-400 mt-0.5">삭제된 항목은 {TRASH_DAYS}일 후 자동 영구 삭제됩니다.</p>
        </div>
        <span className="text-sm bg-slate-800 border border-slate-700 text-slate-400 rounded-full px-3 py-1">
          {totalCount}건
        </span>
      </div>

      {totalCount === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700 mx-auto mb-3">
            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
          <p className="text-slate-500 text-sm">휴지통이 비어 있습니다.</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── 삭제된 사건 ── */}
          {trashedCases && trashedCases.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-300">삭제된 사건</h2>
                <span className="text-xs bg-slate-800 text-slate-500 rounded-full px-2 py-0.5">{trashedCases.length}</span>
              </div>
              {trashedCases.map((c) => {
                const remaining = daysLeft(c.deleted_at)
                const urgent = remaining <= 1
                return (
                  <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className={`flex items-center justify-between px-4 py-2 border-b ${
                      urgent ? 'bg-red-950/40 border-red-500/30' : 'bg-slate-800/60 border-slate-700/50'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">사건</span>
                        <span className="text-slate-700">·</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          c.status === 'active' ? 'bg-blue-500/10 text-blue-400' :
                          c.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                          c.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                          'bg-slate-700 text-slate-400'
                        }`}>
                          {STATUS_LABELS[c.status] ?? c.status}
                        </span>
                      </div>
                      <span className={`text-xs font-semibold ${urgent ? 'text-red-400' : 'text-amber-400'}`}>
                        {remaining === 0 ? '오늘 영구 삭제' : `${remaining}일 후 영구 삭제`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{c.title || '(제목 없음)'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          삭제일: <span className="text-slate-400">
                            {formatDateTime(c.deleted_at, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                      </div>
                      <CaseRestoreButton caseId={c.id} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── 삭제된 보고카드 ── */}
          {trashed && trashed.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-300">삭제된 보고카드</h2>
                <span className="text-xs bg-slate-800 text-slate-500 rounded-full px-2 py-0.5">{trashed.length}</span>
              </div>
              {trashed.map((report) => {
                const remaining = daysLeft(report.deleted_at)
                const urgent = remaining <= 1
                const caseInfo = report.cases as { id: string; title: string } | null

                return (
                  <div key={report.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className={`flex items-center justify-between px-4 py-2 border-b ${
                      urgent ? 'bg-red-950/40 border-red-500/30' : 'bg-slate-800/60 border-slate-700/50'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                          {TYPE_LABEL[report.report_type] ?? report.report_type}
                        </span>
                        {caseInfo && (
                          <>
                            <span className="text-slate-700">·</span>
                            <span className="text-xs text-slate-400 truncate max-w-[200px]">{caseInfo.title}</span>
                          </>
                        )}
                      </div>
                      <span className={`text-xs font-semibold ${urgent ? 'text-red-400' : 'text-amber-400'}`}>
                        {remaining === 0 ? '오늘 영구 삭제' : `${remaining}일 후 영구 삭제`}
                      </span>
                    </div>

                    <div className="px-4 py-3 space-y-2">
                      {report.content && (
                        <p className="text-sm text-slate-300 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                          {report.content}
                        </p>
                      )}
                      {report.address && (
                        <p className="text-xs text-blue-400">{report.address}</p>
                      )}
                      {report.media_url && (report.report_type === 'photo' || report.report_type === 'route') && (
                        <img
                          src={report.media_url}
                          alt="현장 사진"
                          className="w-full max-h-40 object-cover rounded-lg border border-slate-700/40"
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-800">
                      <div className="text-xs text-slate-500 space-y-0.5">
                        <p>
                          삭제일:{' '}
                          <span className="text-slate-400">
                            {formatDateTime(report.deleted_at, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                        {report.profiles?.full_name && (
                          <p>보고자: <span className="text-slate-400">{report.profiles.full_name}</span></p>
                        )}
                      </div>
                      <RestoreButton reportId={report.id} caseId={caseInfo?.id ?? ''} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
