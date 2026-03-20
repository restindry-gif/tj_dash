'use client'

import { useState, useTransition } from 'react'
import { requestOriginalPhoto } from '../actions'

export function OriginalRequestButton({
  reportId,
  caseId,
  requested,
}: {
  reportId: string
  caseId: string
  requested: boolean
}) {
  const [done, setDone] = useState(requested)
  const [isPending, startTransition] = useTransition()

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
        원본 요청됨 — 담당자 확인 중
      </span>
    )
  }

  return (
    <button
      onClick={() => {
        startTransition(async () => {
          const result = await requestOriginalPhoto(reportId, caseId)
          if (!result?.error) setDone(true)
        })
      }}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
      </svg>
      {isPending ? '요청 중...' : '원본 요청'}
    </button>
  )
}
