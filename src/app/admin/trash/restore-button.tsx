'use client'

import { useState, useTransition } from 'react'
import { restoreReport, permanentDeleteReport } from '@/app/admin/cases/actions'

export function RestoreButton({ reportId, caseId }: { reportId: string; caseId: string }) {
  const [isPending, startTransition] = useTransition()
  const [restored, setRestored] = useState(false)
  const [confirmPurge, setConfirmPurge] = useState(false)
  const [purged, setPurged] = useState(false)

  if (restored) {
    return <span className="text-xs text-emerald-400 font-medium">복구됨 ✓</span>
  }
  if (purged) {
    return <span className="text-xs text-slate-500">영구 삭제됨</span>
  }

  const handleRestore = () => {
    startTransition(async () => {
      const result = await restoreReport(reportId, caseId)
      if (!result.error) setRestored(true)
    })
  }

  const handlePurge = () => {
    startTransition(async () => {
      const result = await permanentDeleteReport(reportId)
      if (!result.error) setPurged(true)
    })
  }

  if (confirmPurge) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-400">정말 영구 삭제?</span>
        <button
          onClick={handlePurge}
          disabled={isPending}
          className="text-xs bg-red-600 hover:bg-red-500 text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        >
          {isPending ? '삭제 중...' : '확인'}
        </button>
        <button
          onClick={() => setConfirmPurge(false)}
          disabled={isPending}
          className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
        >
          취소
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleRestore}
        disabled={isPending}
        className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
        복구
      </button>
      <button
        onClick={() => setConfirmPurge(true)}
        disabled={isPending}
        className="flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-red-900/60 text-slate-400 hover:text-red-400 border border-slate-600/50 hover:border-red-500/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
        영구 삭제
      </button>
    </div>
  )
}
