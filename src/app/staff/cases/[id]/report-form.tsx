'use client'

import { useState, useRef } from 'react'
import { submitReport } from '@/app/staff/actions'

interface ReportFormProps {
  caseId: string
  staffId: string
}

export function ReportForm({ caseId, staffId }: ReportFormProps) {
  const [content, setContent] = useState('')
  const [gps, setGps] = useState<{ lat: number; lng: number; address: string } | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const getGps = () => {
    if (!navigator.geolocation) {
      setError('이 브라우저는 GPS를 지원하지 않습니다.')
      return
    }
    setGpsLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        // Reverse geocoding via Kakao
        let address = `위도 ${lat.toFixed(5)}, 경도 ${lng.toFixed(5)}`
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ko`
          )
          if (res.ok) {
            const data = await res.json()
            address = data.display_name || address
          }
        } catch {
          // use coordinates as fallback
        }
        setGps({ lat, lng, address })
        setGpsLoading(false)
      },
      (err) => {
        setError(`GPS 오류: ${err.message}`)
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() && !gps) {
      setError('내용 또는 위치를 입력해주세요.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const reportType = gps && !content.trim() ? 'location' : 'text'
      const result = await submitReport({
        caseId,
        staffId,
        reportType,
        content: content.trim(),
        lat: gps?.lat,
        lng: gps?.lng,
        address: gps?.address,
      })
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setContent('')
        setGps(null)
        setTimeout(() => {
          setSuccess(false)
          window.location.reload()
        }, 1500)
      }
    } catch {
      setError('보고 전송 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 텍스트 입력 */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="현장 보고 내용을 입력하세요..."
        rows={4}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
      />

      {/* GPS 위치 */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={getGps}
          disabled={gpsLoading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg text-sm text-slate-300 hover:text-blue-400 transition-colors disabled:opacity-50"
        >
          {gpsLoading ? (
            <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          )}
          {gpsLoading ? 'GPS 감지 중...' : '현재 위치 첨부'}
        </button>

        {gps && (
          <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
            <p className="text-blue-400 text-xs font-medium">📍 위치 첨부됨</p>
            <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{gps.address}</p>
            <button
              type="button"
              onClick={() => setGps(null)}
              className="text-slate-500 text-xs hover:text-red-400 mt-1 transition-colors"
            >
              제거
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {success && <p className="text-green-400 text-sm">✓ 보고가 전송되었습니다.</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        {submitting ? '전송 중...' : '보고 전송'}
      </button>
    </form>
  )
}
