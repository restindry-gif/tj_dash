'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { startRouteReport, saveTrackPoints, endRouteReport } from '@/app/staff/actions'
import type { SpeechRecognitionEvent, SpeechRecognitionInstance } from '@/lib/speech-types'
import '@/lib/speech-types'

interface TrackPoint {
  lat: number
  lng: number
  accuracy?: number
  recordedAt: string
}

interface RouteTrackerProps {
  caseId: string
  staffId: string
  onComplete?: () => void
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function totalDistance(points: TrackPoint[]) {
  let km = 0
  for (let i = 1; i < points.length; i++) {
    km += haversine(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng)
  }
  return km
}

const BATCH_SIZE = 10
const TRACK_INTERVAL_MS = 10_000   // 초기 3초 이후 10초에 1회 기록
const INITIAL_FAST_SECS = 3        // 시작 직후 빠른 수신 구간

export function RouteTracker({ caseId, staffId, onComplete }: RouteTrackerProps) {
  const [status, setStatus] = useState<'idle' | 'tracking' | 'confirming' | 'saving' | 'done'>('idle')
  const [pointCount, setPointCount] = useState(0)
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [note, setNote] = useState('')
  const [listening, setListening] = useState(false)
  const [sttSupported, setSttSupported] = useState(false)
  const [wakeLockActive, setWakeLockActive] = useState(false)

  const sessionIdRef = useRef<string>('')
  const reportIdRef = useRef<string>('')
  const watchIdRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingRef = useRef<TrackPoint[]>([])
  const allPointsRef = useRef<TrackPoint[]>([])
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const elapsedRef = useRef(0)
  const lastRecordedRef = useRef(0)           // 마지막 기록 시각 (ms)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const trackingStartRef = useRef(0)          // 추적 시작 시각 (ms)

  useEffect(() => {
    setSttSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition))
  }, [])

  // keep elapsedRef in sync for stopTracking closure
  useEffect(() => { elapsedRef.current = elapsed }, [elapsed])

  const toggleStt = () => {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const recognition: SpeechRecognitionInstance = new SR()
    recognitionRef.current = recognition
    recognition.lang = 'ko-KR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let finalText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript
      }
      if (finalText) {
        setNote((prev) => {
          const trimmed = prev.trimEnd()
          return trimmed ? trimmed + ' ' + finalText : finalText
        })
      }
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognition.start()
    setListening(true)
    textareaRef.current?.focus()
  }

  const flushPoints = useCallback(async () => {
    if (pendingRef.current.length === 0) return
    const batch = [...pendingRef.current]
    pendingRef.current = []
    await saveTrackPoints(
      batch.map((p) => ({
        caseId,
        staffId,
        sessionId: sessionIdRef.current,
        lat: p.lat,
        lng: p.lng,
        accuracy: p.accuracy,
        recordedAt: p.recordedAt,
      }))
    )
  }, [caseId, staffId])

  const acquireWakeLock = async () => {
    if (!('wakeLock' in navigator)) return
    try {
      wakeLockRef.current = await (navigator as Navigator & { wakeLock: { request: (type: string) => Promise<WakeLockSentinel> } }).wakeLock.request('screen')
      setWakeLockActive(true)
      wakeLockRef.current.addEventListener('release', () => setWakeLockActive(false))
    } catch {
      // 지원 안 하는 환경이면 무시
    }
  }

  const releaseWakeLock = () => {
    wakeLockRef.current?.release()
    wakeLockRef.current = null
    setWakeLockActive(false)
  }

  const recordPoint = (pos: GeolocationPosition) => {
    const point: TrackPoint = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      recordedAt: new Date().toISOString(),
    }
    pendingRef.current.push(point)
    allPointsRef.current.push(point)
    setPointCount((n) => n + 1)
    if (pendingRef.current.length >= BATCH_SIZE) flushPoints()
  }

  const startTracking = async () => {
    if (!navigator.geolocation) {
      setError('이 브라우저는 GPS를 지원하지 않습니다.')
      return
    }
    setError('')
    setStatus('tracking')
    setPointCount(0)
    setElapsed(0)
    allPointsRef.current = []
    pendingRef.current = []
    lastRecordedRef.current = 0
    trackingStartRef.current = Date.now()

    const sessionId = crypto.randomUUID()
    sessionIdRef.current = sessionId

    const result = await startRouteReport(caseId, staffId, sessionId)
    if (result.error) {
      setError(result.error)
      setStatus('idle')
      return
    }
    reportIdRef.current = result.reportId!

    // 화면 켜짐 잠금 (모바일 백그라운드 방지)
    await acquireWakeLock()

    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)

    // 초기 3초: 1초 간격으로 빠른 수신 (GPS 정확도 안정화)
    for (let i = 0; i < INITIAL_FAST_SECS; i++) {
      setTimeout(() => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            lastRecordedRef.current = Date.now()
            recordPoint(pos)
          },
          () => {},
          { enableHighAccuracy: true, timeout: 10000 }
        )
      }, i * 1000)
    }

    // 이후: watchPosition으로 GPS를 warm하게 유지하되 10초에 1회만 기록
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now()
        const elapsed = now - trackingStartRef.current
        // 초기 3초 구간은 이미 위에서 처리
        if (elapsed < INITIAL_FAST_SECS * 1000) return
        // 10초 미만이면 건너뜀
        if (now - lastRecordedRef.current < TRACK_INTERVAL_MS) return
        lastRecordedRef.current = now
        recordPoint(pos)
      },
      (err) => setError(`GPS 오류: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 9000, timeout: 15000 }
    )
  }

  const stopTracking = () => {
    recognitionRef.current?.stop()
    setListening(false)
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    releaseWakeLock()
    setStatus('confirming')
  }

  const cancelTracking = () => {
    setStatus('idle')
    setPointCount(0)
    setElapsed(0)
    setNote('')
    allPointsRef.current = []
    pendingRef.current = []
  }

  const submitTracking = async () => {
    setStatus('saving')
    await flushPoints()

    const points = allPointsRef.current
    const km = totalDistance(points)
    const mins = Math.round(elapsedRef.current / 60)
    const baseSummary = `동선 추적 완료 — ${points.length}개 위치, ${km.toFixed(2)}km, 약 ${mins}분`
    const summary = note.trim() ? `${baseSummary}\n${note.trim()}` : baseSummary

    await endRouteReport(reportIdRef.current, points.length, km, summary)

    setStatus('done')
    setTimeout(() => {
      onComplete?.()
      window.location.reload()
    }, 1500)
  }

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (status === 'done') {
    return (
      <div className="flex items-center gap-2 text-green-400 text-sm py-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
        동선 저장 완료
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {status === 'idle' && (
        <button
          type="button"
          onClick={startTracking}
          className="w-full flex items-center justify-center gap-3 min-h-[52px] bg-slate-800 border border-slate-700 hover:border-orange-500 rounded-xl text-sm font-medium text-slate-300 hover:text-orange-400 transition-colors cursor-pointer active:scale-[0.98]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
          동선 추적 시작
        </button>
      )}

      {status === 'tracking' && (
        <div className="space-y-3">
          {/* 상태 표시 */}
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                <span className="text-orange-400 text-sm font-semibold">추적 중</span>
              </div>
              <span className="text-slate-400 text-sm font-mono">{formatElapsed(elapsed)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-slate-50">{pointCount}</p>
                <p className="text-xs text-slate-500 mt-0.5">기록된 위치</p>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-slate-50">
                  {totalDistance(allPointsRef.current).toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">이동거리 (km)</p>
              </div>
            </div>
          </div>

          {/* 백그라운드 경고 */}
          <div className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs ${
            wakeLockActive
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
              {wakeLockActive
                ? <><path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10z"/><path d="m9 12 2 2 4-4"/></>
                : <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>
              }
            </svg>
            <span>
              {wakeLockActive
                ? '화면 켜짐 잠금 활성 — GPS 추적 안정'
                : '추적 중 브라우저를 백그라운드로 이동하면 GPS 수신이 중단될 수 있습니다. 화면을 켜둔 채로 유지하세요.'}
            </span>
          </div>

          {/* 포인트 부족 안내 */}
          {pointCount <= 3 && (
            <p className="text-xs text-slate-500 text-center">
              3개 이하의 동선 포인트는 보고 시 지도 정보가 포함되지 않습니다
            </p>
          )}

          {/* 메모 입력 */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={listening ? '말씀하세요...' : '동선 메모 입력 (선택)'}
              rows={3}
              className={`w-full bg-slate-800/80 rounded-xl px-4 py-3 pr-14 text-slate-200 text-base placeholder-slate-500 focus:outline-none focus:ring-2 resize-none leading-relaxed transition-all ${
                listening
                  ? 'ring-2 ring-red-500/50 border border-red-500/30'
                  : 'border border-slate-700/50 focus:ring-orange-500/50 focus:border-orange-500/30'
              }`}
              style={{ fontSize: '16px' }}
            />
            {sttSupported && (
              <button
                type="button"
                onClick={toggleStt}
                className={`absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
                  listening
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-slate-700/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
                aria-label={listening ? '음성 인식 중지' : '음성으로 입력'}
              >
                {listening ? (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" x2="12" y1="19" y2="22"/>
                  </svg>
                )}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={stopTracking}
            className="w-full min-h-[52px] bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white text-base font-semibold rounded-xl transition-colors cursor-pointer active:scale-[0.98]"
          >
            추적 종료
          </button>
        </div>
      )}

      {status === 'confirming' && (
        <div className="space-y-3">
          {/* 요약 */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider">동선 추적 결과</p>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="text-center">
                <p className="text-xl font-bold text-slate-50">{pointCount}</p>
                <p className="text-xs text-slate-500 mt-0.5">기록된 위치</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-slate-50">{totalDistance(allPointsRef.current).toFixed(2)}</p>
                <p className="text-xs text-slate-500 mt-0.5">이동거리 (km)</p>
              </div>
            </div>
            {note.trim() && (
              <p className="text-slate-300 text-sm bg-slate-700/50 rounded-lg px-3 py-2 whitespace-pre-wrap">{note}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={cancelTracking}
              className="min-h-[52px] bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl transition-colors cursor-pointer active:scale-[0.98]"
            >
              취소
            </button>
            <button
              type="button"
              onClick={submitTracking}
              className="min-h-[52px] bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer active:scale-[0.98]"
            >
              보고하기
            </button>
          </div>
        </div>
      )}

      {status === 'saving' && (
        <div className="flex items-center justify-center gap-3 py-6 text-slate-400 text-sm">
          <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          동선 저장 중...
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  )
}
