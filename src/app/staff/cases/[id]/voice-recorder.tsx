'use client'

import { useRef, useState, useEffect } from 'react'
import { createDatabaseClient } from '@/lib/supabase/client'
import { submitReport } from '@/app/staff/actions'

interface VoiceRecorderProps {
  caseId: string
  staffId: string
  onComplete?: () => void
}

const MAX_BYTES = 500 * 1024 // 500KB

// Web Speech API 타입 선언
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: Event) => void) | null
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance
    webkitSpeechRecognition: new () => SpeechRecognitionInstance
  }
}

export function VoiceRecorder({ caseId, staffId, onComplete }: VoiceRecorderProps) {
  const [status, setStatus] = useState<'idle' | 'recording' | 'uploading' | 'done'>('idle')
  const [transcript, setTranscript] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioSize, setAudioSize] = useState(0)
  const [error, setError] = useState('')
  const [speechSupported, setSpeechSupported] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const finalTranscriptRef = useRef('')

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    setSpeechSupported(!!SR)
    return () => {
      recognitionRef.current?.stop()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startRecording = async () => {
    setError('')
    setTranscript('')
    setAudioUrl(null)
    setElapsed(0)
    finalTranscriptRef.current = ''
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // MediaRecorder 설정
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setAudioSize(blob.size)
      }

      recorder.start(1000) // collect data every 1s

      // Speech Recognition (병렬 실행)
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SR) {
        const recognition: SpeechRecognitionInstance = new SR()
        recognitionRef.current = recognition
        recognition.lang = 'ko-KR'
        recognition.continuous = true
        recognition.interimResults = true

        recognition.onresult = (e) => {
          let interim = ''
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const text = e.results[i][0].transcript
            if (e.results[i].isFinal) {
              finalTranscriptRef.current += text + ' '
            } else {
              interim += text
            }
          }
          setTranscript(finalTranscriptRef.current + interim)
        }

        recognition.onerror = () => {} // 무시 (마이크 권한 이미 받음)
        recognition.start()
      }

      // 경과 타이머
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
      setStatus('recording')
    } catch (err) {
      setError('마이크 권한이 필요합니다.')
      console.error(err)
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    recognitionRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
    setStatus('idle') // 잠시 idle로 → onstop 후 audioUrl이 set됨
  }

  const handleUpload = async () => {
    if (!audioUrl) return
    setStatus('uploading')
    setError('')

    try {
      // Blob 재생성
      const response = await fetch(audioUrl)
      let blob = await response.blob()

      // 500KB 초과 시 경고만 (오디오는 압축 어려움, 그냥 업로드)
      if (blob.size > MAX_BYTES) {
        console.warn(`Audio ${(blob.size / 1024).toFixed(0)}KB > 500KB`)
      }

      const supabase = createDatabaseClient()
      const ext = blob.type.includes('webm') ? 'webm' : 'ogg'
      const path = `${caseId}/${staffId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('case-reports')
        .upload(path, blob, { contentType: blob.type, upsert: false })

      if (uploadError) throw new Error(uploadError.message)

      const { data: { publicUrl } } = supabase.storage
        .from('case-reports')
        .getPublicUrl(path)

      const result = await submitReport({
        caseId,
        staffId,
        reportType: 'voice',
        content: finalTranscriptRef.current.trim() || '(텍스트 변환 불가)',
        mediaUrl: publicUrl,
      })

      if (result?.error) throw new Error(result.error)

      setStatus('done')
      setTimeout(() => {
        onComplete?.()
        window.location.reload()
      }, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 실패')
      setStatus('idle')
    }
  }

  const reset = () => {
    setAudioUrl(null)
    setTranscript('')
    setElapsed(0)
    setError('')
    finalTranscriptRef.current = ''
  }

  const formatElapsed = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  if (status === 'done') {
    return (
      <div className="flex items-center gap-2 text-green-400 text-sm py-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
        음성 보고가 전송되었습니다.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 녹음 전 */}
      {status === 'idle' && !audioUrl && (
        <button
          type="button"
          onClick={startRecording}
          className="w-full flex items-center justify-center gap-3 min-h-[52px] bg-slate-800 border border-slate-700 hover:border-red-500 rounded-xl text-sm font-medium text-slate-300 hover:text-red-400 transition-colors cursor-pointer active:scale-[0.98]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" x2="12" y1="19" y2="22"/>
          </svg>
          음성 녹음 시작
        </button>
      )}

      {/* 녹음 중 */}
      {status === 'recording' && (
        <div className="space-y-3">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 text-sm font-semibold">녹음 중</span>
              </div>
              <span className="text-slate-400 text-sm font-mono">{formatElapsed(elapsed)}</span>
            </div>

            {/* 실시간 텍스트 변환 */}
            {speechSupported && (
              <div className="bg-slate-800/60 rounded-lg p-3 min-h-[60px]">
                <p className="text-xs text-slate-500 mb-1">실시간 텍스트 변환</p>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {transcript || <span className="text-slate-600">말씀하세요...</span>}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={stopRecording}
            className="w-full min-h-[52px] bg-red-600 hover:bg-red-500 text-white text-base font-semibold rounded-xl transition-colors cursor-pointer active:scale-[0.98]"
          >
            녹음 종료
          </button>
        </div>
      )}

      {/* 녹음 완료 — 미리듣기 + 전송 */}
      {status === 'idle' && audioUrl && (
        <div className="space-y-3">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-sm font-medium">녹음 완료</span>
              <span className="text-slate-500 text-xs">{(audioSize / 1024).toFixed(0)}KB · {formatElapsed(elapsed)}</span>
            </div>

            {/* 오디오 플레이어 */}
            <audio controls src={audioUrl} className="w-full h-10" />

            {/* 텍스트 변환 결과 */}
            {transcript && (
              <div className="bg-slate-900 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">변환된 텍스트</p>
                <p className="text-slate-300 text-sm leading-relaxed">{transcript}</p>
              </div>
            )}
            {!speechSupported && (
              <p className="text-slate-500 text-xs">※ 이 브라우저는 음성 텍스트 변환을 지원하지 않습니다.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={reset}
              className="min-h-[48px] bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-xl transition-colors cursor-pointer"
            >
              다시 녹음
            </button>
            <button
              type="button"
              onClick={handleUpload}
              className="min-h-[48px] bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              전송
            </button>
          </div>
        </div>
      )}

      {/* 업로드 중 */}
      {status === 'uploading' && (
        <div className="flex items-center justify-center gap-3 py-6 text-slate-400 text-sm">
          <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          업로드 중...
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  )
}
