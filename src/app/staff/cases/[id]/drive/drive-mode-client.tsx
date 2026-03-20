'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { submitReport } from '@/app/staff/actions'
import type { SpeechRecognitionEvent, SpeechRecognitionInstance } from '@/lib/speech-types'
import '@/lib/speech-types'

interface DriveModeClientProps {
  caseId: string
  staffId: string
  caseTitle: string
}


interface LogEntry {
  id: string
  time: string
  text: string
  lat?: number
  lng?: number
}

export function DriveModeClient({ caseId, staffId, caseTitle }: DriveModeClientProps) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [supported, setSupported] = useState(false)
  const [now, setNow] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const finalRef = useRef('')

  useEffect(() => {
    setSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition))
    // 현재 시간 업데이트
    const tick = () => setNow(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  const getLocation = (): Promise<{ lat: number; lng: number } | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null)
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 3000 }
      )
    })

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    finalRef.current = ''
    setInterim('')

    const recognition: SpeechRecognitionInstance = new SR()
    recognitionRef.current = recognition
    recognition.lang = 'ko-KR'
    recognition.continuous = false // 한 문장씩 자동 종료
    recognition.interimResults = true

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          finalRef.current += text
        } else {
          interimText += text
        }
      }
      setInterim(interimText)
    }

    recognition.onend = async () => {
      setListening(false)
      setInterim('')
      const text = finalRef.current.trim()
      if (!text) return

      // GPS + 저장
      const loc = await getLocation()
      const entry: LogEntry = {
        id: crypto.randomUUID(),
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        text,
        lat: loc?.lat,
        lng: loc?.lng,
      }
      setLogs((prev) => [entry, ...prev])
      setSaving(entry.id)

      // 서버에 저장
      await submitReport({
        caseId,
        staffId,
        reportType: 'voice',
        content: text,
        lat: loc?.lat,
        lng: loc?.lng,
      })
      setSaving(null)
    }

    recognition.onerror = () => {
      setListening(false)
      setInterim('')
    }

    recognition.start()
    setListening(true)
  }

  return (
    <div className="fixed inset-0 bg-[#020617] flex flex-col select-none" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between px-5 pt-safe pt-4 pb-3 shrink-0">
        <Link
          href={`/staff/cases/${caseId}`}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/80 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </Link>
        <div className="text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">드라이브 모드</p>
          <p className="text-slate-300 text-sm truncate max-w-[180px]">{caseTitle}</p>
        </div>
        <div className="text-right">
          <p className="text-slate-50 text-sm font-mono tabular-nums">{now}</p>
        </div>
      </div>

      {/* 메인 영역: 마이크 버튼 */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        {/* 실시간 텍스트 */}
        <div className="w-full min-h-[60px] text-center">
          {listening && (
            <p className="text-slate-300 text-lg leading-relaxed animate-pulse">
              {interim || '말씀하세요...'}
            </p>
          )}
          {!listening && logs.length === 0 && (
            <p className="text-slate-600 text-base">버튼을 눌러 음성 보고를 시작하세요</p>
          )}
        </div>

        {/* 거대한 마이크 버튼 */}
        {supported ? (
          <button
            onPointerDown={startListening}
            disabled={listening}
            className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer select-none touch-none ${
              listening
                ? 'bg-red-500/20 border-2 border-red-500/60 scale-110'
                : 'bg-slate-800/60 border-2 border-slate-600/50 active:scale-95 active:bg-slate-700/60'
            }`}
          >
            {/* 펄스 링 */}
            {listening && (
              <>
                <span className="absolute inset-0 rounded-full border-2 border-red-500/30 animate-ping" />
                <span className="absolute -inset-4 rounded-full border border-red-500/15 animate-ping" style={{ animationDelay: '0.3s' }} />
              </>
            )}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="72"
              height="72"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={listening ? 'text-red-400' : 'text-slate-300'}
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" x2="12" y1="19" y2="22"/>
            </svg>
          </button>
        ) : (
          <div className="text-slate-500 text-center text-sm">
            이 브라우저는 음성 인식을 지원하지 않습니다.<br/>Chrome 또는 Edge를 사용해 주세요.
          </div>
        )}

        <p className="text-slate-600 text-xs">
          {listening ? '인식 완료 후 자동 저장됩니다' : '탭하여 보고'}
        </p>
      </div>

      {/* 하단 로그 피드 */}
      {logs.length > 0 && (
        <div className="shrink-0 max-h-[35vh] overflow-y-auto px-4 pb-safe pb-6 space-y-2">
          <p className="text-xs text-slate-600 uppercase tracking-widest mb-3 px-1">오늘의 보고 — {logs.length}건</p>
          {logs.map((log) => (
            <div
              key={log.id}
              className={`flex gap-3 rounded-xl p-3 transition-colors ${
                saving === log.id ? 'bg-amber-500/10' : 'bg-slate-800/50'
              }`}
            >
              <span className="text-xs text-slate-500 font-mono tabular-nums shrink-0 mt-0.5">{log.time}</span>
              <div className="flex-1 min-w-0">
                <p className="text-slate-300 text-sm leading-relaxed">{log.text}</p>
                {log.lat && (
                  <p className="text-slate-600 text-xs mt-0.5">
                    📍 {log.lat.toFixed(4)}, {log.lng?.toFixed(4)}
                  </p>
                )}
              </div>
              {saving === log.id ? (
                <svg className="animate-spin w-4 h-4 text-amber-400 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 shrink-0">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
