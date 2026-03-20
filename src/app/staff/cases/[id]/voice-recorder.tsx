'use client'

import { useRef, useState, useEffect } from 'react'
import { submitReport } from '@/app/staff/actions'
import type { SpeechRecognitionEvent, SpeechRecognitionInstance } from '@/lib/speech-types'
import '@/lib/speech-types'

interface VoiceRecorderProps {
  caseId: string
  staffId: string
  onComplete?: () => void
}


export function VoiceRecorder({ caseId, staffId, onComplete }: VoiceRecorderProps) {
  const [supported, setSupported] = useState(false)
  const [status, setStatus] = useState<'idle' | 'listening' | 'done' | 'submitting'>('idle')
  const [interim, setInterim] = useState('')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const finalRef = useRef('')

  useEffect(() => {
    setSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition))
  }, [])

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    setError('')
    setInterim('')
    setTranscript('')
    finalRef.current = ''

    const recognition: SpeechRecognitionInstance = new SR()
    recognitionRef.current = recognition
    recognition.lang = 'ko-KR'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          finalRef.current += text + ' '
        } else {
          interimText += text
        }
      }
      setTranscript(finalRef.current)
      setInterim(interimText)
    }

    recognition.onend = () => {
      if (status === 'listening') setStatus('idle')
      setInterim('')
    }

    recognition.onerror = () => {
      setError('음성 인식 오류가 발생했습니다.')
      setStatus('idle')
    }

    recognition.start()
    setStatus('listening')
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setStatus('idle')
    setInterim('')
  }

  const handleSubmit = async () => {
    const text = finalRef.current.trim()
    if (!text) {
      setError('내용이 없습니다. 다시 말씀해 주세요.')
      return
    }
    setStatus('submitting')
    setError('')
    const result = await submitReport({ caseId, staffId, reportType: 'voice', content: text })
    if (result?.error) {
      setError(result.error)
      setStatus('idle')
    } else {
      setStatus('done')
      setTimeout(() => { onComplete?.(); window.location.reload() }, 1200)
    }
  }

  if (!supported) {
    return (
      <p className="text-slate-500 text-sm py-2">
        이 브라우저는 음성 인식을 지원하지 않습니다. (Chrome/Edge 권장)
      </p>
    )
  }

  if (status === 'done') {
    return (
      <div className="flex items-center gap-2 text-green-400 text-sm py-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        음성 보고가 전송되었습니다.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 마이크 버튼 */}
      <button
        type="button"
        onClick={status === 'listening' ? stopListening : startListening}
        disabled={status === 'submitting'}
        className={`w-full flex items-center justify-center gap-3 min-h-[64px] rounded-xl text-sm font-semibold transition-all cursor-pointer active:scale-[0.98] ${
          status === 'listening'
            ? 'bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/20'
            : 'bg-slate-800/80 border border-slate-700/50 text-slate-300 hover:border-amber-500/50 hover:text-amber-400'
        }`}
      >
        {status === 'listening' ? (
          <>
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500" />
            </span>
            인식 중 — 탭하여 종료
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" x2="12" y1="19" y2="22"/>
            </svg>
            탭하여 말하기
          </>
        )}
      </button>

      {/* 실시간 텍스트 */}
      {(transcript || interim || status === 'listening') && (
        <div className="bg-slate-800/50 rounded-xl p-4 min-h-[80px] space-y-1">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">인식된 내용</p>
          <p className="text-slate-200 text-sm leading-relaxed">
            {transcript}
            {interim && <span className="text-slate-500">{interim}</span>}
            {status === 'listening' && !transcript && !interim && (
              <span className="text-slate-600 animate-pulse">말씀하세요...</span>
            )}
          </p>
        </div>
      )}

      {/* 전송 버튼 */}
      {transcript && status !== 'listening' && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setTranscript(''); setInterim(''); finalRef.current = '' }}
            className="min-h-[48px] bg-slate-700/80 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-colors cursor-pointer"
          >
            다시 말하기
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={status === 'submitting'}
            className="min-h-[48px] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
          >
            {status === 'submitting' ? '전송 중...' : '보고 전송'}
          </button>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  )
}
