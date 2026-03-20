'use client'

import { useRef, useState, useEffect } from 'react'
import { createDatabaseClient } from '@/lib/supabase/client'
import { submitReport } from '@/app/staff/actions'
import type { SpeechRecognitionEvent, SpeechRecognitionInstance } from '@/lib/speech-types'
import '@/lib/speech-types'

interface ReportFormProps {
  caseId: string
  staffId: string
}

const MAX_BYTES = 500 * 1024
const MAX_DIMENSION = 1920

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        const tryQuality = (quality: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error('이미지 변환 실패'))
              if (blob.size <= MAX_BYTES || quality <= 0.3) resolve(blob)
              else tryQuality(Math.max(quality - 0.1, 0.3))
            },
            'image/jpeg',
            quality
          )
        }
        tryQuality(0.85)
      }
      img.onerror = () => reject(new Error('이미지 로드 실패'))
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

export function ReportForm({ caseId, staffId }: ReportFormProps) {
  const [content, setContent] = useState('')
  const [gps, setGps] = useState<{ lat: number; lng: number; address: string } | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [photo, setPhoto] = useState<{ preview: string; blob: Blob; size: number } | null>(null)
  const [photoCompressing, setPhotoCompressing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // STT
  const [sttSupported, setSttSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

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
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript
      }
      if (finalText) {
        setContent((prev) => {
          const trimmed = prev.trimEnd()
          return trimmed ? trimmed + ' ' + finalText : finalText
        })
      }
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => { setListening(false); setError('음성 인식 오류가 발생했습니다.') }
    recognition.start()
    setListening(true)
    textareaRef.current?.focus()
  }

  const getGps = () => {
    if (gps) { setGps(null); return }
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

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setPhotoCompressing(true)
    setError('')
    try {
      const blob = await compressImage(file)
      setPhoto({ preview: URL.createObjectURL(blob), blob, size: blob.size })
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 처리 실패')
    } finally {
      setPhotoCompressing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    recognitionRef.current?.stop()
    setListening(false)
    if (!content.trim() && !gps && !photo) {
      setError('내용, 위치 또는 사진을 입력해주세요.')
      return
    }
    setSubmitting(true)
    setError('')

    try {
      let mediaUrl: string | undefined
      if (photo) {
        const supabase = createDatabaseClient()
        const path = `${caseId}/${staffId}/${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('case-reports')
          .upload(path, photo.blob, { contentType: 'image/jpeg', upsert: false })
        if (uploadError) throw new Error(uploadError.message)
        const { data: { publicUrl } } = supabase.storage.from('case-reports').getPublicUrl(path)
        mediaUrl = publicUrl
      }

      const reportType = mediaUrl ? 'photo' : (gps && !content.trim() ? 'location' : 'text')
      const result = await submitReport({
        caseId,
        staffId,
        reportType,
        content: content.trim() || undefined,
        lat: gps?.lat,
        lng: gps?.lng,
        address: gps?.address,
        mediaUrl,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setContent('')
        setGps(null)
        setPhoto(null)
        setTimeout(() => { setSuccess(false); window.location.reload() }, 1200)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '보고 전송 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* 텍스트 입력 + 마이크 버튼 */}
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

      {/* 첨부 버튼 행 */}
      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
      <div className="grid grid-cols-2 gap-2">
        {/* 사진 첨부 */}
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={photoCompressing}
          className={`flex items-center justify-center gap-2 min-h-[44px] rounded-xl text-sm font-medium transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 ${
            photo
              ? 'bg-violet-500/15 border border-violet-500/30 text-violet-400'
              : 'bg-slate-800/80 border border-slate-700/50 text-slate-400 hover:border-violet-500/40 hover:text-violet-400'
          }`}
        >
          {photoCompressing ? (
            <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/>
              <circle cx="12" cy="13" r="3"/>
            </svg>
          )}
          {photoCompressing ? '압축 중' : photo ? '사진 첨부됨' : '사진 첨부'}
        </button>

        {/* 위치 첨부 */}
        <button
          type="button"
          onClick={getGps}
          disabled={gpsLoading}
          className={`flex items-center justify-center gap-2 min-h-[44px] rounded-xl text-sm font-medium transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 ${
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
      </div>

      {/* 첨부 미리보기 */}
      {(photo || gps) && (
        <div className="space-y-2">
          {photo && (
            <div className="relative rounded-xl overflow-hidden border border-violet-500/20">
              <img src={photo.preview} alt="첨부 사진" className="w-full max-h-48 object-cover" />
              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                {(photo.size / 1024).toFixed(0)}KB
              </div>
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-black/60 hover:bg-red-500/80 text-white rounded-full transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          )}
          {gps && (
            <div className="flex items-start gap-3 bg-blue-500/10 rounded-xl p-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 mt-0.5 shrink-0">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <p className="text-slate-400 text-xs leading-relaxed flex-1 line-clamp-2">{gps.address}</p>
              <button type="button" onClick={() => setGps(null)} className="text-slate-600 hover:text-red-400 transition-colors cursor-pointer px-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 전송 버튼 */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full min-h-[52px] bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer active:scale-[0.98]"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            전송 중...
          </span>
        ) : '보고 전송'}
      </button>

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
