'use client'

import dynamic from 'next/dynamic'

// SSR 불가 — Leaflet은 브라우저 전용
export const RouteMapDynamic = dynamic(
  () => import('./route-map').then((m) => m.RouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
        <p className="text-slate-500 text-sm">지도 로딩 중...</p>
      </div>
    ),
  }
)
