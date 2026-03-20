'use client'

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { startRouteReport, saveTrackPoints, endRouteReport, cancelRouteReport } from '@/app/staff/actions'

interface TrackPoint { lat: number; lng: number; accuracy?: number; recordedAt: string }

export interface TrackingSession {
  caseId: string
  staffId: string
  caseTitle: string
  sessionId: string
  reportId: string
  startTime: number
}

interface StoredSession extends TrackingSession {
  pointCount: number
  totalKm: number
}

export type TrackingStatus = 'idle' | 'tracking' | 'confirming'

interface RouteTrackingContextValue {
  status: TrackingStatus
  session: TrackingSession | null
  pointCount: number
  totalKm: number
  startTracking: (caseId: string, staffId: string, caseTitle: string) => Promise<void>
  requestStop: () => void
  submitTracking: (note?: string, mediaUrl?: string) => Promise<void>
  cancelTracking: () => Promise<void>
}

const RouteTrackingContext = createContext<RouteTrackingContextValue>({
  status: 'idle',
  session: null,
  pointCount: 0,
  totalKm: 0,
  startTracking: async () => {},
  requestStop: () => {},
  submitTracking: async (_note?: string, _mediaUrl?: string) => {},
  cancelTracking: async () => {},
})

const STORAGE_KEY = 'tj_route_session'
const BATCH_SIZE = 10

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function RouteTrackingProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<TrackingStatus>('idle')
  const [session, setSession] = useState<TrackingSession | null>(null)
  const [pointCount, setPointCount] = useState(0)
  const [totalKm, setTotalKm] = useState(0)

  const sessionRef = useRef<TrackingSession | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const pendingRef = useRef<TrackPoint[]>([])
  const lastPointRef = useRef<TrackPoint | null>(null)
  const totalKmRef = useRef(0)
  const pointCountRef = useRef(0)

  useEffect(() => { sessionRef.current = session }, [session])

  const flushPoints = useCallback(async () => {
    const sess = sessionRef.current
    if (!sess || pendingRef.current.length === 0) return
    const batch = [...pendingRef.current]
    pendingRef.current = []
    await saveTrackPoints(batch.map(p => ({
      caseId: sess.caseId, staffId: sess.staffId, sessionId: sess.sessionId,
      lat: p.lat, lng: p.lng, accuracy: p.accuracy, recordedAt: p.recordedAt,
    })))
  }, [])

  const addPoint = useCallback((pos: GeolocationPosition) => {
    const point: TrackPoint = {
      lat: pos.coords.latitude, lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy, recordedAt: new Date().toISOString(),
    }
    if (lastPointRef.current) {
      totalKmRef.current += haversine(lastPointRef.current.lat, lastPointRef.current.lng, point.lat, point.lng)
      setTotalKm(totalKmRef.current)
    }
    lastPointRef.current = point
    pendingRef.current.push(point)
    pointCountRef.current += 1
    setPointCount(pointCountRef.current)
    if (pendingRef.current.length >= BATCH_SIZE) flushPoints()
  }, [flushPoints])

  const beginWatch = useCallback(() => {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        navigator.geolocation.getCurrentPosition(addPoint, () => {}, { enableHighAccuracy: true, timeout: 10000 })
      }, i * 1000)
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      addPoint, () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    )
  }, [addPoint])

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  // Restore from localStorage on mount
  useEffect(() => {
    if (!navigator.geolocation) return
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    try {
      const stored: StoredSession = JSON.parse(saved)
      sessionRef.current = stored
      setSession(stored)
      pointCountRef.current = stored.pointCount ?? 0
      setPointCount(stored.pointCount ?? 0)
      totalKmRef.current = stored.totalKm ?? 0
      setTotalKm(stored.totalKm ?? 0)
      setStatus('tracking')
      beginWatch()
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [beginWatch])

  // Persist to localStorage when tracking
  useEffect(() => {
    if (!session || status !== 'tracking') return
    const stored: StoredSession = { ...session, pointCount, totalKm }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  }, [session, pointCount, totalKm, status])

  const startTracking = async (caseId: string, staffId: string, caseTitle: string) => {
    if (!navigator.geolocation) return
    stopWatch()
    const sessionId = crypto.randomUUID()
    const result = await startRouteReport(caseId, staffId, sessionId)
    if (result.error) return
    const sess: TrackingSession = { caseId, staffId, caseTitle, sessionId, reportId: result.reportId!, startTime: Date.now() }
    pendingRef.current = []
    lastPointRef.current = null
    totalKmRef.current = 0
    pointCountRef.current = 0
    setPointCount(0)
    setTotalKm(0)
    sessionRef.current = sess
    setSession(sess)
    setStatus('tracking')
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...sess, pointCount: 0, totalKm: 0 }))
    beginWatch()
  }

  const requestStop = useCallback(() => {
    stopWatch()
    setStatus('confirming')
  }, [stopWatch])

  const submitTracking = useCallback(async (note?: string, mediaUrl?: string) => {
    const sess = sessionRef.current
    if (!sess) return
    await flushPoints()
    const mins = Math.round((Date.now() - sess.startTime) / 60000)
    const base = `동선 추적 완료 — ${pointCountRef.current}개 위치, ${totalKmRef.current.toFixed(2)}km, 약 ${mins}분`
    const summary = note?.trim() ? `${base}\n${note.trim()}` : base
    await endRouteReport(sess.reportId, pointCountRef.current, totalKmRef.current, summary, mediaUrl)
    localStorage.removeItem(STORAGE_KEY)
    pendingRef.current = []
    lastPointRef.current = null
    sessionRef.current = null
    setSession(null)
    setPointCount(0)
    setTotalKm(0)
    pointCountRef.current = 0
    totalKmRef.current = 0
    setStatus('idle')
  }, [flushPoints])

  const cancelTracking = useCallback(async () => {
    const sess = sessionRef.current
    if (!sess) return
    stopWatch()
    await cancelRouteReport(sess.reportId)
    localStorage.removeItem(STORAGE_KEY)
    pendingRef.current = []
    lastPointRef.current = null
    sessionRef.current = null
    setSession(null)
    setPointCount(0)
    setTotalKm(0)
    pointCountRef.current = 0
    totalKmRef.current = 0
    setStatus('idle')
  }, [stopWatch])

  return (
    <RouteTrackingContext.Provider value={{ status, session, pointCount, totalKm, startTracking, requestStop, submitTracking, cancelTracking }}>
      {children}
    </RouteTrackingContext.Provider>
  )
}

export const useRouteTracking = () => useContext(RouteTrackingContext)
