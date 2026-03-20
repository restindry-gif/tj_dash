'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouteTracking } from '@/providers/route-tracking-provider'
import { createDatabaseClient } from '@/lib/supabase/client'

const MAX_BYTES = 500 * 1024
const MAX_DIM = 1920

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > MAX_DIM || height > MAX_DIM) {
          const r = Math.min(MAX_DIM / width, MAX_DIM / height)
          width = Math.round(width * r); height = Math.round(height * r)
        }
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        const tryQ = (q: number) => {
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('변환 실패'))
            if (blob.size <= MAX_BYTES || q <= 0.3) resolve(blob)
            else tryQ(Math.max(q - 0.1, 0.3))
          }, 'image/jpeg', q)
        }
        tryQ(0.85)
      }
      img.onerror = () => reject(new Error('로드 실패'))
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

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
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<{ preview: string; blob: Blob; caseId: string; staffId: string } | null>(null)
  const [photoCompressing, setPhotoCompressing] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

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

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setPhotoCompressing(true)
    try {
      const blob = await compressImage(file)
      setPhoto({ preview: URL.createObjectURL(blob), blob, caseId, staffId })
    } catch { /* ignore */ }
    setPhotoCompressing(false)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    let mediaUrl: string | undefined
    if (photo) {
      const supabase = createDatabaseClient()
      const path = `${photo.caseId}/${photo.staffId}/${Date.now()}.jpg`
      const { error } = await supabase.storage.from('case-reports').upload(path, photo.blob, { contentType: 'image/jpeg' })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('case-reports').getPublicUrl(path)
        mediaUrl = publicUrl
      }
    }
    await submitTracking(note, mediaUrl)
    setSubmitting(false)
    window.location.reload()
  }

  const handleCancel = async () => {
    await cancelTracking()
    setNote('')
    setPhoto(null)
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
        {/* 결과 요약 */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider">업무 종료 — 보고 작성</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center bg-slate-700/40 rounded-lg py-2.5">
              <p className="text-xl font-bold text-slate-50 tabular-nums">{pointCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">기록된 위치</p>
            </div>
            <div className="text-center bg-slate-700/40 rounded-lg py-2.5">
              <p className="text-xl font-bold text-slate-50 tabular-nums">{totalKm.toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-0.5">이동거리 (km)</p>
            </div>
          </div>
        </div>

        {/* 코멘트 입력 */}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="보고 내용 입력 (선택)"
          rows={3}
          className="w-full bg-slate-800 border border-slate-700 focus:border-orange-500/50 rounded-xl px-4 py-3 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none leading-relaxed transition-all"
          style={{ fontSize: '16px' }}
        />

        {/* 사진 첨부 */}
        {photo ? (
          <div className="relative rounded-xl overflow-hidden border border-slate-700">
            <img src={photo.preview} alt="첨부 사진" className="w-full max-h-48 object-cover" />
            <button
              type="button"
              onClick={() => setPhoto(null)}
              className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-black/60 rounded-full text-white cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={photoCompressing}
            className="w-full flex items-center justify-center gap-2 h-11 bg-slate-800 border border-slate-700 hover:border-violet-500/40 hover:text-violet-400 text-slate-400 text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            {photoCompressing ? (
              <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>
              </svg>
            )}
            사진 첨부 (선택)
          </button>
        )}
        <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />

        {/* 취소 / 보고 */}
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
            className="min-h-[48px] bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                저장 중
              </>
            ) : '보고하기'}
          </button>
        </div>
      </div>
    )
  }

  return null
}
