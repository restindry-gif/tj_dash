'use client'

import { useState } from 'react'
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
        let address = `위도 ${lat.toFixed(5)}, 경도 ${lng.toFixed(5)}`
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ko`
          )
          if (res.ok) {
            const data = await res.json()
            address = data.display_name || address
          }
        } catch { /* use coordinate fallback */ }
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
        }, 1200)
      }
    } catch {
      setError('보고 전송 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* 텍스트 입력 - 최소 16px 폰트 (모바일 줌 방지) */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="현장 보고 내용을 입력하세요..."
        rows={4}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 text-base placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none leading-relaxed"
        style={{ fontSize: '16px' }}
      />

      {/* GPS 위치 버튼 - 44px 최소 높이 */}
      <button
        type="button"
        onClick={getGps}
        disabled={gpsLoading}
        className="w-full flex items-center justify-center gap-3 min-h-[52px] bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-xl text-sm font-medium text-slate-300 hover:text-blue-400 transition-colors disabled:opacity-50 cursor-pointer active:scale-[0.98]"
      >
        {gpsLoading ? (
          <>
            <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            GPS 감지 중...
          </>
        ) : gps ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 shrink-0">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span className="text-blue-400">위치 첨부됨 — 다시 감지</span>
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            현재 위치 첨부
          </>
        )}
      </button>

      {/* GPS 미리보기 */}
      {gps && (
        <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 mt-0.5 shrink-0">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-blue-400 text-xs font-medium mb-0.5">위치 첨부됨</p>
            <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">{gps.address}</p>
          </div>
          <button
            type="button"
            onClick={() => setGps(null)}
            className="text-slate-500 hover:text-red-400 transition-colors text-xs shrink-0 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {success && (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
          보고가 전송되었습니다.
        </div>
      )}

      {/* 전송 버튼 - 크고 탭하기 쉽게 */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full min-h-[52px] bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white text-base font-semibold rounded-xl transition-colors cursor-pointer active:scale-[0.98]"
      >
        {submitting ? '전송 중...' : '보고 전송'}
      </button>
    </form>
  )
}
