'use client'

import { useRef, useState, useEffect } from 'react'
import { submitReport } from '@/app/staff/actions'
import type { SpeechRecognitionEvent, SpeechRecognitionInstance } from '@/lib/speech-types'
import '@/lib/speech-types'

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

  // STT
  const [sttSupported, setSttSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setSttSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition))
  }, [])

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
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t
        else interimText += t
      }
      if (finalText) {
        setContent((prev) => {
          const trimmed = prev.trimEnd()
          return trimmed ? trimmed + ' ' + finalText : finalText
        })
      }
      // interim은 placeholder처럼 시각적으로만 표시 (별도 state 불필요 — textarea value가 업데이트됨)
    }

    recognition.onend = () => setListening(false)
    recognition.onerror = () => { setListening(false); setError('음성 인식 오류가 발생했습니다.') }

    recognition.start()
    setListening(true)
    textareaRef.current?.focus()
  }

  const getGps = () => {
    if (!navigator.geolocation) { setError('이 브라우저는 GPS를 지원하지 않습니다.'); return }
    setGpsLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        let address = `위도 ${lat.toFixed(5)}, 경도 ${lng.toFixed(5)}`
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ko`)
          if (res.ok) { const data = await res.json(); address = data.display_name || address }
        } catch { /* fallback */ }
        setGps({ lat, lng, address })
        setGpsLoading(false)
      },
      (err) => { setError(`GPS 오류: ${err.message}`); setGpsLoading(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    recognitionRef.current?.stop()
    setListening(false)
    if (!content.trim() && !gps) { setError('내용 또는 위치를 입력해주세요.'); return }
    setSubmitting(true)
    setError('')
    try {
      const reportType = gps && !content.trim() ? 'location' : 'text'
      const result = await submitReport({ caseId, staffId, reportType, content: content.trim(), lat: gps?.lat, lng: gps?.lng, address: gps?.address })
      if (result?.error) { setError(result.error) } else {
        setSuccess(true)
        setContent('')
        setGps(null)
        setTimeout(() => { setSuccess(false); window.location.reload() }, 1200)
      }
    } catch { setError('보고 전송 중 오류가 발생했습니다.') }
    finally { setSubmitting(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* 텍스트 입력 + 마이크 버튼 오버레이 */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={listening ? '말씀하세요... 인식된 내용이 여기에 입력됩니다' : '보고 내용을 입력하거나 마이크를 눌러 말하세요'}
          rows={4}
          className={`w-full bg-slate-800/80 rounded-xl px-4 py-3 pr-14 text-slate-200 text-base placeholder-slate-500 focus:outline-none focus:ring-2 resize-none leading-relaxed transition-all ${
            listening
              ? 'ring-2 ring-red-500/50 border border-red-500/30'
              : 'border border-slate-700/50 focus:ring-blue-500/50 focus:border-blue-500/30'
          }`}
          style={{ fontSize: '16px' }}
        />
        {/* 마이크 버튼 — textarea 우상단 */}
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
            title={listening ? '탭하여 중지' : '음성으로 입력'}
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

      {/* 위치 + 전송 버튼 행 */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={getGps}
          disabled={gpsLoading}
          className={`flex items-center justify-center gap-2 min-h-[48px] rounded-xl text-sm font-medium transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 ${
            gps
              ? 'bg-blue-500/15 border border-blue-500/30 text-blue-400'
              : 'bg-slate-800/80 border border-slate-700/50 text-slate-400 hover:border-blue-500/40 hover:text-blue-400'
          }`}
        >
          {gpsLoading ? (
            <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          )}
          {gpsLoading ? 'GPS 감지 중' : gps ? '위치 첨부됨' : '위치 첨부'}
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="min-h-[48px] bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer active:scale-[0.98]"
        >
          {submitting ? '전송 중...' : '보고 전송'}
        </button>
      </div>

      {/* GPS 미리보기 */}
      {gps && (
        <div className="flex items-start gap-3 bg-blue-500/10 rounded-xl p-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 mt-0.5 shrink-0">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <p className="text-slate-400 text-xs leading-relaxed flex-1 line-clamp-2">{gps.address}</p>
          <button type="button" onClick={() => setGps(null)} className="text-slate-600 hover:text-red-400 transition-colors text-xs cursor-pointer px-1">✕</button>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {success && (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          보고가 전송되었습니다.
        </div>
      )}
    </form>
  )
}
