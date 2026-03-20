'use client'

import { useCallback, useState } from 'react'

export type TrackPoint = {
  lat: number
  lng: number
  accuracy: number | null
  recorded_at: string
}

function haversineM(a: TrackPoint, b: TrackPoint): number {
  const R = 6371000
  const φ1 = (a.lat * Math.PI) / 180
  const φ2 = (b.lat * Math.PI) / 180
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
}

function fmtElapsed(a: string, b: string) {
  const s = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 1000)
  if (s < 60) return `${s}초`
  if (s < 3600) return `${Math.floor(s / 60)}분 ${s % 60}초`
  return `${Math.floor(s / 3600)}시간 ${Math.floor((s % 3600) / 60)}분`
}

interface Props {
  points: TrackPoint[]
  caseTitle: string
  staffName: string
  totalKm: number
  reportDate: string
}

export function RouteDownloadButton({ points, caseTitle, staffName, totalKm, reportDate }: Props) {
  const [loading, setLoading] = useState(false)

  const handleDownload = useCallback(() => {
    setLoading(true)

    const DPR = 2
    const W = 900
    const PADDING = 40
    const TABLE_TOP = 180
    const ROW_H = 30
    const COLS = [50, 230, 400, 540, 660, 800] // x positions
    const COL_HEADERS = ['#', '기록 시각', '위도', '경도', '경과시간', '구간거리']

    const totalH = TABLE_TOP + ROW_H + points.length * ROW_H + 80

    const canvas = document.createElement('canvas')
    canvas.width = W * DPR
    canvas.height = totalH * DPR
    const ctx = canvas.getContext('2d')!
    ctx.scale(DPR, DPR)

    // background
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, W, totalH)

    // header band
    ctx.fillStyle = '#1e3a5f'
    ctx.fillRect(0, 0, W, 150)

    // title
    ctx.fillStyle = '#93c5fd'
    ctx.font = 'bold 13px sans-serif'
    ctx.fillText('동선 추적 보고서', PADDING, 38)

    ctx.fillStyle = '#f1f5f9'
    ctx.font = 'bold 22px sans-serif'
    ctx.fillText(caseTitle, PADDING, 68)

    ctx.fillStyle = '#94a3b8'
    ctx.font = '12px sans-serif'
    ctx.fillText(`담당: ${staffName}`, PADDING, 94)
    ctx.fillText(
      `보고일시: ${new Date(reportDate).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      PADDING, 112
    )
    ctx.fillText(
      `총 이동거리: ${totalKm.toFixed(2)} km   |   기록 포인트: ${points.length}개`,
      PADDING, 130
    )

    // table header
    ctx.fillStyle = '#1e40af'
    ctx.fillRect(0, TABLE_TOP, W, ROW_H)

    ctx.fillStyle = '#bfdbfe'
    ctx.font = 'bold 11px sans-serif'
    COL_HEADERS.forEach((h, i) => {
      ctx.fillText(h, COLS[i] + 8, TABLE_TOP + 20)
    })

    // rows
    points.forEach((pt, i) => {
      const y = TABLE_TOP + ROW_H + i * ROW_H
      ctx.fillStyle = i % 2 === 0 ? '#1e293b' : '#172032'
      ctx.fillRect(0, y, W, ROW_H)

      const dist = i === 0 ? 0 : haversineM(points[i - 1], pt)
      const elapsed = i === 0 ? '—' : fmtElapsed(points[i - 1].recorded_at, pt.recorded_at)

      const cells = [
        String(i + 1),
        fmtTime(pt.recorded_at),
        pt.lat.toFixed(6),
        pt.lng.toFixed(6),
        elapsed,
        i === 0 ? '—' : dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(2)}km`,
      ]

      ctx.fillStyle = '#e2e8f0'
      ctx.font = '11px monospace'
      cells.forEach((cell, ci) => {
        ctx.fillText(cell, COLS[ci] + 8, y + 20)
      })
    })

    // footer line
    const footerY = TABLE_TOP + ROW_H + points.length * ROW_H + 20
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PADDING, footerY)
    ctx.lineTo(W - PADDING, footerY)
    ctx.stroke()

    ctx.fillStyle = '#475569'
    ctx.font = '11px sans-serif'
    ctx.fillText('본 보고서는 GPS 위치 추적 데이터를 기반으로 생성되었습니다.', PADDING, footerY + 20)

    // download
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    const dateStr = new Date(reportDate).toISOString().slice(0, 10)
    a.download = `동선보고_${dateStr}.png`
    a.click()

    setLoading(false)
  }, [points, caseTitle, staffName, totalKm, reportDate])

  if (points.length === 0) return null

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
      </svg>
      {loading ? '생성 중...' : '포인트 기록 다운로드'}
    </button>
  )
}
