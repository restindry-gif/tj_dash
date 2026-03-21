'use client'

import { useEffect } from 'react'
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

export function RouteMap({ points, startMeta, endMeta, className = '' }: RouteMapProps) {
  if (points.length === 0) return null

  const center = points[Math.floor(points.length / 2)]

  return (
    <div className={`rounded-xl overflow-hidden border border-slate-700 ${className}`}>
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: '280px', width: '100%', background: '#1e293b' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CartoDB'
        />
        <FitBounds points={points} />

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

      {/* 범례 */}
      <div className="bg-slate-800 px-4 py-2.5 flex flex-col gap-1.5 text-xs border-t border-slate-700/50">

        <div className="flex items-center gap-2 min-w-0">
          <span className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
          <span className="text-slate-300 font-medium shrink-0">출발</span>
          {startMeta && (
            <>
              <span className="text-slate-600 shrink-0">·</span>
              <span className="text-slate-400 truncate">{startMeta.address}</span>
              <span className="text-slate-600 shrink-0">·</span>
              <span className="text-slate-500 tabular-nums shrink-0">{startMeta.time}</span>
            </>
          )}
        </div>
        {points.length > 1 && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0" />
            <span className="text-slate-300 font-medium shrink-0">도착</span>
            {endMeta && (
              <>
                <span className="text-slate-600 shrink-0">·</span>
                <span className="text-slate-400 truncate">{endMeta.address}</span>
                <span className="text-slate-600 shrink-0">·</span>
                <span className="text-slate-500 tabular-nums shrink-0">{endMeta.time}</span>
              </>
            )}
          </div>
        )}
        {points.length === 1 && (
          <div className="flex items-center gap-2">
            <span className="w-8 h-0.5 bg-orange-400 shrink-0 rounded" />
            <span className="text-slate-500">경로</span>
          </div>
        )}
        <p className="text-[10px] text-slate-600 pt-0.5">
          GPS는 오차가 있을 수 있습니다. 출발·도착·동선은 대략적인 정보로 참고해 주세요.
        </p>
      </div>
    </div>
  )
}
