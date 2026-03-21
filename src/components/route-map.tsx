'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons broken by webpack
const startIcon = L.divIcon({
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#22c55e;border:2px solid #fff;box-shadow:0 0 0 3px rgba(34,197,94,0.3)"></div>`,
  className: '',
  iconAnchor: [7, 7],
})
const endIcon = L.divIcon({
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#f97316;border:2px solid #fff;box-shadow:0 0 0 3px rgba(249,115,22,0.3)"></div>`,
  className: '',
  iconAnchor: [7, 7],
})

interface PointMeta {
  time: string
  address: string
}

interface RouteMapProps {
  points: [number, number][]
  startMeta?: PointMeta
  endMeta?: PointMeta
  className?: string
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [20, 20] })
    } else if (points.length === 1) {
      map.setView(points[0], 15)
    }
  }, [map, points])
  return null
}

function MapInteractionController({ interactive }: { interactive: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (interactive) {
      map.dragging.enable()
      map.touchZoom.enable()
      map.doubleClickZoom.enable()
      map.scrollWheelZoom.enable()
      map.keyboard.enable()
    } else {
      map.dragging.disable()
      map.touchZoom.disable()
      map.doubleClickZoom.disable()
      map.scrollWheelZoom.disable()
      map.keyboard.disable()
    }
  }, [map, interactive])
  return null
}

export function RouteMap({ points, startMeta, endMeta, className = '' }: RouteMapProps) {
  const [interactive, setInteractive] = useState(false)

  if (points.length === 0) return null

  const center = points[Math.floor(points.length / 2)]

  return (
    <div style={{ isolation: 'isolate' }} className={`rounded-xl overflow-hidden border border-slate-700 ${className}`}>
      {/* 지도 영역 */}
      <div className="relative">
        <MapContainer
          center={center}
          zoom={14}
          style={{ height: '280px', width: '100%', background: '#1e293b' }}
          zoomControl={false}
          attributionControl={false}
          dragging={false}
          touchZoom={false}
          doubleClickZoom={false}
          scrollWheelZoom={false}
          keyboard={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; CartoDB'
          />
          <FitBounds points={points} />
          <MapInteractionController interactive={interactive} />

          {/* 이동 경로 */}
          <Polyline
            positions={points}
            pathOptions={{ color: '#f97316', weight: 3, opacity: 0.85 }}
          />

          {/* 출발점 */}
          <Marker position={points[0]} icon={startIcon}>
            <Popup>출발{startMeta ? `\n${startMeta.address}` : ''}</Popup>
          </Marker>

          {/* 도착점 (출발과 다를 때만) */}
          {points.length > 1 && (
            <Marker position={points[points.length - 1]} icon={endIcon}>
              <Popup>도착{endMeta ? `\n${endMeta.address}` : ''}</Popup>
            </Marker>
          )}
        </MapContainer>

        {/* 잠금 오버레이 — 탭하면 인터랙티브 모드 진입 */}
        {!interactive && (
          <button
            type="button"
            onClick={() => setInteractive(true)}
            className="absolute inset-0 z-[400] flex items-end justify-center pb-4 cursor-pointer"
            aria-label="지도 조작 활성화"
          >
            <span className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-sm text-slate-300 text-xs font-medium px-3 py-1.5 rounded-full border border-slate-600/60 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              지도 이동 · 확대
            </span>
          </button>
        )}

        {/* 인터랙티브 모드 — 완료 버튼 */}
        {interactive && (
          <button
            type="button"
            onClick={() => setInteractive(false)}
            className="absolute top-2 right-2 z-[400] flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-sm text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-500 shadow-lg cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
            조작 종료
          </button>
        )}
      </div>

      {/* 범례 */}
      <div className="bg-slate-800 px-4 py-3 flex flex-col gap-2 text-xs border-t border-slate-700/50">

        {/* 출발 */}
        <div className="flex items-start gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 font-medium">출발</span>
              {startMeta && (
                <span className="text-slate-400">{startMeta.address}</span>
              )}
            </div>
            {startMeta && (
              <p className="text-slate-500 tabular-nums mt-0.5">{startMeta.time}</p>
            )}
          </div>
        </div>

        {/* 도착 */}
        {points.length > 1 && (
          <div className="flex items-start gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-300 font-medium">도착</span>
                {endMeta && (
                  <span className="text-slate-400">{endMeta.address}</span>
                )}
              </div>
              {endMeta && (
                <p className="text-slate-500 tabular-nums mt-0.5">{endMeta.time}</p>
              )}
            </div>
          </div>
        )}

        {points.length === 1 && (
          <div className="flex items-center gap-2">
            <span className="w-8 h-0.5 bg-orange-400 shrink-0 rounded" />
            <span className="text-slate-500">경로</span>
          </div>
        )}

        <p className="text-[10px] text-slate-600 pt-0.5 leading-relaxed">
          GPS는 오차가 있을 수 있습니다. 출발·도착·동선은 대략적인 정보로 참고해 주세요.
        </p>
      </div>
    </div>
  )
}
