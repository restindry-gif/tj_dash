'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createDatabaseClient } from '@/lib/supabase/client'
import { submitReport, startRouteReport, saveTrackPoints, endRouteReport } from '@/app/staff/actions'
import type { SpeechRecognitionEvent, SpeechRecognitionInstance } from '@/lib/speech-types'
import '@/lib/speech-types'

// ─── Image compression ───────────────────────────────────────
const MAX_BYTES = 500 * 1024
const MAX_DIMENSION = 1920

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        canvas.width = width
        canvas.height = height
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
      img.onerror = () => reject(new Error('이미지 로드 실패'))
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

// ─── Route tracking helpers ───────────────────────────────────
interface TrackPoint { lat: number; lng: number; accuracy?: number; recordedAt: string }

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function calcDistance(pts: TrackPoint[]) {
  let km = 0
  for (let i = 1; i < pts.length; i++) km += haversine(pts[i-1].lat, pts[i-1].lng, pts[i].lat, pts[i].lng)
  return km
}

// ─── Component ────────────────────────────────────────────────
interface Props { caseId: string; staffId: string; caseTitle: string }

export function DriveModeClient({ caseId, staffId, caseTitle }: Props) {
  const [now, setNow] = useState('')
  const [sttSupported, setSttSupported] = useState(false)

  // Voice
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'confirming'>('idle')
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')

  // Route
  const [routeActive, setRouteActive] = useState(false)
  const [routePoints, setRoutePoints] = useState(0)
  const [routeSaving, setRouteSaving] = useState(false)

  // GPS attachment
  const [gps, setGps] = useState<{ lat: number; lng: number; address: string } | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)

  // Photo attachment
  const [photo, setPhoto] = useState<{ preview: string; blob: Blob; size: number } | null>(null)
  const [photoCompressing, setPhotoCompressing] = useState(false)

  // Submit / toast
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  // Refs
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const finalRef = useRef('')
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Route refs
  const routeSessionRef = useRef('')
  const routeReportIdRef = useRef('')
  const watchIdRef = useRef<number | null>(null)
  const pendingRef = useRef<TrackPoint[]>([])
  const allPointsRef = useRef<TrackPoint[]>([])
  const routeStartRef = useRef(0)

  useEffect(() => {
    setSttSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition))
    const tick = () => setNow(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // ── Voice ──────────────────────────────────────────
  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    finalRef.current = ''
    setTranscript('')
    setInterim('')

    const r: SpeechRecognitionInstance = new SR()
    recognitionRef.current = r
    r.lang = 'ko-KR'
    r.continuous = true
    r.interimResults = true

    r.onresult = (e: SpeechRecognitionEvent) => {
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalRef.current += e.results[i][0].transcript + ' '
        else interimText += e.results[i][0].transcript
      }
      setTranscript(finalRef.current)
      setInterim(interimText)
    }
    r.onend = () => setInterim('')
    r.onerror = () => { setVoiceState('idle'); setInterim('') }
    r.start()
    setVoiceState('listening')
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setInterim('')
    const text = finalRef.current.trim()
    if (text) {
      setTranscript(text)
      setVoiceState('confirming')
    } else {
      setVoiceState('idle')
    }
  }

  const cancelVoice = () => {
    recognitionRef.current?.stop()
    setVoiceState('idle')
    setTranscript('')
    setInterim('')
    finalRef.current = ''
  }

  // ── GPS ────────────────────────────────────────────
  const handleGps = () => {
    if (gps) { setGps(null); return }
    if (!navigator.geolocation) return
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        let address = `위도 ${lat.toFixed(5)}, 경도 ${lng.toFixed(5)}`
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ko`)
          if (res.ok) { const d = await res.json(); address = d.display_name || address }
        } catch { /* fallback */ }
        setGps({ lat, lng, address })
        setGpsLoading(false)
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // ── Photo ──────────────────────────────────────────
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setPhotoCompressing(true)
    try {
      const blob = await compressImage(file)
      setPhoto({ preview: URL.createObjectURL(blob), blob, size: blob.size })
    } catch { /* ignore */ }
    setPhotoCompressing(false)
  }

  // ── Route tracking ─────────────────────────────────
  const flushPoints = useCallback(async () => {
    if (pendingRef.current.length === 0) return
    const batch = [...pendingRef.current]
    pendingRef.current = []
    await saveTrackPoints(batch.map(p => ({
      caseId, staffId, sessionId: routeSessionRef.current,
      lat: p.lat, lng: p.lng, accuracy: p.accuracy, recordedAt: p.recordedAt,
    })))
  }, [caseId, staffId])

  const startRoute = async () => {
    if (!navigator.geolocation) return
    const sessionId = crypto.randomUUID()
    routeSessionRef.current = sessionId
    routeStartRef.current = Date.now()
    allPointsRef.current = []
    pendingRef.current = []
    setRoutePoints(0)

    const result = await startRouteReport(caseId, staffId, sessionId)
    if (result.error) return
    routeReportIdRef.current = result.reportId!

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point: TrackPoint = {
          lat: pos.coords.latitude, lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy, recordedAt: new Date().toISOString(),
        }
        pendingRef.current.push(point)
        allPointsRef.current.push(point)
        setRoutePoints(n => n + 1)
        if (pendingRef.current.length >= 10) flushPoints()
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    )
    setRouteActive(true)
  }

  const stopRoute = async () => {
    setRouteSaving(true)
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    await flushPoints()
    const pts = allPointsRef.current
    const km = calcDistance(pts)
    const mins = Math.round((Date.now() - routeStartRef.current) / 60000)
    const summary = `동선 추적 완료 — ${pts.length}개 위치, ${km.toFixed(2)}km, 약 ${mins}분`
    await endRouteReport(routeReportIdRef.current, pts.length, km, summary)
    setRouteActive(false)
    setRoutePoints(0)
    setRouteSaving(false)
    showToast('동선 저장 완료')
  }

  // ── Submit ─────────────────────────────────────────
  const handleSubmit = async () => {
    if (!transcript.trim() && !photo && !gps) return
    setSubmitting(true)
    try {
      let mediaUrl: string | undefined
      if (photo) {
        const supabase = createDatabaseClient()
        const path = `${caseId}/${staffId}/${Date.now()}.jpg`
        const { error } = await supabase.storage.from('case-reports').upload(path, photo.blob, { contentType: 'image/jpeg' })
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('case-reports').getPublicUrl(path)
          mediaUrl = publicUrl
        }
      }
      const reportType = mediaUrl ? 'photo' : (gps && !transcript.trim() ? 'location' : 'text')
      await submitReport({ caseId, staffId, reportType, content: transcript.trim() || undefined, lat: gps?.lat, lng: gps?.lng, address: gps?.address, mediaUrl })
      setVoiceState('idle')
      setTranscript('')
      setGps(null)
      setPhoto(null)
      finalRef.current = ''
      showToast('보고 전송됨')
    } catch { /* ignore */ }
    setSubmitting(false)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  // ── Render ─────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-[#020617] flex flex-col select-none overflow-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 pt-safe shrink-0" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)', paddingBottom: '12px' }}>
        <Link
          href={`/staff/cases/${caseId}`}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 active:bg-slate-700 transition-colors cursor-pointer shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">드라이브 모드</p>
          <p className="text-slate-200 text-sm font-medium truncate">{caseTitle}</p>
        </div>
        <p className="text-slate-400 text-sm font-mono tabular-nums shrink-0">{now}</p>
      </div>

      {/* 중앙 버튼 + 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-4 overflow-hidden" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>

        {/* 동선 추적 상태 바 */}
        {routeActive && (
          <div className="w-full flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-2xl px-4 py-2.5">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shrink-0" />
            <span className="text-orange-400 text-sm font-medium">동선 추적 중</span>
            <span className="text-slate-500 text-xs ml-auto">{routePoints}개 위치 기록됨</span>
          </div>
        )}

        {/* 음성 상태 표시 */}
        {voiceState === 'listening' && (
          <div className="w-full text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="text-red-400 text-xs font-medium uppercase tracking-wider">인식 중</span>
            </div>
            <p className="text-slate-200 text-lg leading-relaxed font-light">
              {transcript}
              {interim && <span className="text-slate-500">{interim}</span>}
              {!transcript && !interim && <span className="text-slate-500 animate-pulse">말씀하세요...</span>}
            </p>
          </div>
        )}

        {voiceState === 'confirming' && (
          <div className="w-full space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider text-center">인식된 내용 확인</p>
            <div className="bg-slate-800/70 border border-slate-700/50 rounded-2xl p-4 max-h-36 overflow-y-auto">
              <p className="text-slate-100 text-base leading-relaxed">{transcript}</p>
            </div>
            {photo && (
              <div className="relative rounded-xl overflow-hidden border border-violet-500/20">
                <img src={photo.preview} alt="첨부 사진" className="w-full max-h-24 object-cover" />
                <button type="button" onClick={() => setPhoto(null)} className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-black/60 rounded-full text-white cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
            )}
            {gps && (
              <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 shrink-0">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <p className="text-blue-300 text-xs flex-1 truncate">{gps.address}</p>
                <button type="button" onClick={() => setGps(null)} className="text-slate-600 hover:text-red-400 cursor-pointer shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
            )}
          </div>
        )}

        {toast && (
          <div className="flex items-center gap-2 text-green-400 text-base font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
            {toast}
          </div>
        )}

        {/* 🎙️ 메인 녹음 버튼 (최상단, 가장 크게) */}
        {voiceState !== 'confirming' ? (
          <button
            type="button"
            onClick={voiceState === 'idle' ? startListening : stopListening}
            disabled={!sttSupported}
            className={`w-full rounded-3xl flex flex-col items-center justify-center gap-3 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-40 h-[130px] ${
              voiceState === 'listening'
                ? 'bg-red-500/20 border-2 border-red-500/50'
                : 'bg-slate-800 border-2 border-slate-700 active:bg-slate-700'
            }`}
          >
            {voiceState === 'listening' ? (
              <>
                <span className="relative flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500" />
                </span>
                <span className="text-red-300 text-base font-semibold">탭하여 완료</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" x2="12" y1="19" y2="22"/>
                </svg>
                <span className="text-slate-300 text-base font-semibold">탭하여 말하기</span>
              </>
            )}
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3 w-full h-[130px]">
            <button
              type="button"
              onClick={cancelVoice}
              className="rounded-3xl bg-slate-800 border-2 border-slate-700 text-slate-300 text-base font-semibold cursor-pointer active:scale-[0.97] active:bg-slate-700 transition-all"
            >
              다시 말하기
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-3xl bg-blue-600 border-2 border-blue-500 text-white text-base font-semibold cursor-pointer active:scale-[0.97] active:bg-blue-700 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  전송 중
                </span>
              ) : '보고 전송'}
            </button>
          </div>
        )}

        {/* 3개 기능 버튼 */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {/* 사진 */}
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={photoCompressing}
            className={`flex flex-col items-center justify-center gap-1.5 h-[68px] rounded-2xl text-xs font-medium transition-all cursor-pointer active:scale-[0.96] disabled:opacity-50 ${
              photo
                ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
                : 'bg-slate-800/80 border border-slate-700/50 text-slate-400 active:bg-slate-700'
            }`}
          >
            {photoCompressing ? (
              <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/>
                <circle cx="12" cy="13" r="3"/>
              </svg>
            )}
            <span>{photo ? '사진 첨부됨' : '사진'}</span>
          </button>

          {/* 위치 */}
          <button
            type="button"
            onClick={handleGps}
            disabled={gpsLoading}
            className={`flex flex-col items-center justify-center gap-1.5 h-[68px] rounded-2xl text-xs font-medium transition-all cursor-pointer active:scale-[0.96] disabled:opacity-50 ${
              gps
                ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                : 'bg-slate-800/80 border border-slate-700/50 text-slate-400 active:bg-slate-700'
            }`}
          >
            {gpsLoading ? (
              <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            )}
            <span>{gpsLoading ? '감지 중' : gps ? '위치 첨부됨' : '위치'}</span>
          </button>

          {/* 동선 추적 */}
          <button
            type="button"
            onClick={routeActive ? stopRoute : startRoute}
            disabled={routeSaving}
            className={`flex flex-col items-center justify-center gap-1.5 h-[68px] rounded-2xl text-xs font-medium transition-all cursor-pointer active:scale-[0.96] disabled:opacity-50 ${
              routeActive
                ? 'bg-orange-500/20 border border-orange-500/40 text-orange-300'
                : 'bg-slate-800/80 border border-slate-700/50 text-slate-400 active:bg-slate-700'
            }`}
          >
            {routeSaving ? (
              <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : routeActive ? (
              <span className="w-5 h-5 flex items-center justify-center">
                <span className="w-4 h-4 rounded-sm bg-orange-400" />
              </span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/>
                <circle cx="18" cy="5" r="3"/>
              </svg>
            )}
            <span>{routeSaving ? '저장 중' : routeActive ? '추적 중지' : '동선추적'}</span>
          </button>
        </div>

      </div>

      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
    </div>
  )
}
