'use client'

import { useState, useEffect } from 'react'
import { useRouteTracking } from '@/providers/route-tracking-provider'

interface Props {
  caseId: string
  staffId: string
  caseTitle: string
}

function formatElapsed(startTime: number) {
  const s = Math.floor((Date.now() - startTime) / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function WorkSessionControl({ caseId, staffId, caseTitle }: Props) {
  const { status, session, pointCount, totalKm, startTracking, requestStop, submitTracking, cancelTracking } = useRouteTracking()
  const [elapsed, setElapsed] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isThisCase = session?.caseId === caseId
  const isOtherCase = !!session && session.caseId !== caseId

  // Elapsed timer
  useEffect(() => {
    if (!session || !isThisCase || status === 'idle') return
    const update = () => setElapsed(formatElapsed(session.startTime))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [session, isThisCase, status])

  const handleSubmit = async () => {
    setSubmitting(true)
    await submitTracking()
    setSubmitting(false)
    window.location.reload()
  }

  const handleCancel = async () => {
    await cancelTracking()
  }

  // 다른 사건 추적 중
  if (isOtherCase) {
    return (
      <div className="flex items-center gap-3 bg-orange-500/5 border border-orange-500/20 rounded-xl px-4 py-3">
        <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-orange-400 font-medium">다른 사건 업무 진행 중</p>
          <p className="text-xs text-slate-500 truncate">{session!.caseTitle}</p>
        </div>
      </div>
    )
  }

  // 대기 상태
  if (status === 'idle') {
    return (
      <button
        type="button"
        onClick={() => startTracking(caseId, staffId, caseTitle)}
        className="w-full flex items-center justify-center gap-2 min-h-[52px] bg-slate-800 border border-slate-700 hover:border-orange-500/50 hover:bg-orange-500/5 rounded-xl text-sm font-semibold text-slate-300 hover:text-orange-400 transition-all cursor-pointer active:scale-[0.98]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        업무 시작 (동선 추적)
      </button>
    )
  }

  // 추적 중
  if (status === 'tracking' && isThisCase) {
    return (
      <div className="space-y-3">
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-orange-400 text-sm font-semibold">업무 중 — 동선 추적</span>
            </div>
            <span className="text-slate-400 text-sm font-mono tabular-nums">{elapsed}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/60 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-slate-50">{pointCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">기록된 위치</p>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-slate-50">{totalKm.toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-0.5">이동거리 (km)</p>
            </div>
          </div>
          {pointCount <= 3 && (
            <p className="text-xs text-slate-500 text-center">
              3개 이하의 동선 포인트는 보고 시 지도 정보가 포함되지 않습니다
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={requestStop}
          className="w-full min-h-[48px] bg-slate-800 border border-slate-700 hover:border-red-500/40 hover:text-red-400 text-slate-300 text-sm font-semibold rounded-xl transition-all cursor-pointer active:scale-[0.98]"
        >
          업무 종료
        </button>
      </div>
    )
  }

  // 확인 단계
  if (status === 'confirming' && isThisCase) {
    return (
      <div className="space-y-3">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider">업무 종료 — 결과 확인</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-xl font-bold text-slate-50">{pointCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">기록된 위치</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-slate-50">{totalKm.toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-0.5">이동거리 (km)</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="min-h-[48px] bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl transition-colors cursor-pointer active:scale-[0.98]"
          >
            취소 (삭제)
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="min-h-[48px] bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? '저장 중...' : '보고하기'}
          </button>
        </div>
      </div>
    )
  }

  return null
}
