'use client'

import { useState, useRef, useCallback } from 'react'
import { startRouteReport, saveTrackPoints, endRouteReport } from '@/app/staff/actions'

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

/** Haversine distance (km) between two coords */
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

const BATCH_SIZE = 10 // auto-save every 10 points

export function RouteTracker({ caseId, staffId, onComplete }: RouteTrackerProps) {
  const [status, setStatus] = useState<'idle' | 'tracking' | 'saving' | 'done'>('idle')
  const [pointCount, setPointCount] = useState(0)
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)

  const sessionIdRef = useRef<string>('')
  const reportIdRef = useRef<string>('')
  const watchIdRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingRef = useRef<TrackPoint[]>([])  // unsaved buffer
  const allPointsRef = useRef<TrackPoint[]>([]) // all points for distance calc

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

    // Generate session ID
    const sessionId = crypto.randomUUID()
    sessionIdRef.current = sessionId

    // Create route report row
    const result = await startRouteReport(caseId, staffId, sessionId)
    if (result.error) {
      setError(result.error)
      setStatus('idle')
      return
    }
    reportIdRef.current = result.reportId!

    // Elapsed timer
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)

    // Start GPS watch
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point: TrackPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          recordedAt: new Date().toISOString(),
        }
        pendingRef.current.push(point)
        allPointsRef.current.push(point)
        setPointCount((n) => n + 1)

        // Auto-flush every BATCH_SIZE points
        if (pendingRef.current.length >= BATCH_SIZE) {
          flushPoints()
        }
      },
      (err) => setError(`GPS 오류: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    )
  }

  const stopTracking = async () => {
    setStatus('saving')

    // Stop GPS and timer
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    if (timerRef.current) clearInterval(timerRef.current)

    // Flush remaining points
    await flushPoints()

    const points = allPointsRef.current
    const km = totalDistance(points)
    const mins = Math.round(elapsed / 60)
    const summary = `동선 추적 완료 — ${points.length}개 위치, ${km.toFixed(2)}km, 약 ${mins}분`

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

          <button
            type="button"
            onClick={stopTracking}
            className="w-full min-h-[52px] bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white text-base font-semibold rounded-xl transition-colors cursor-pointer active:scale-[0.98]"
          >
            추적 종료 및 보고
          </button>
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
