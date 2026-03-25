'use client'

import { useState, useRef, useEffect } from 'react'
import { generateCallSummary, formatTranscriptAsDialog, generateChunkSummary, mergeCallSummaries } from '../cases/call-analysis-actions'
import type { CallSummary, PartialCallSummary } from '../cases/call-analysis-actions'

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

export default function CallAnalysisTestPage() {
  const [transcript, setTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<CallSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showFullTranscript, setShowFullTranscript] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedResult, setEditedResult] = useState<CallSummary | null>(null)
  const recognitionRef = useRef<any>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [analyzeStep, setAnalyzeStep] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [saveName, setSaveName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [savedReportsList, setSavedReportsList] = useState<string[]>([])
  const [costInfo, setCostInfo] = useState<{ inputTokens: number; outputTokens: number; whisperSeconds: number } | null>(null)
  const [parsedMessages, setParsedMessages] = useState<Array<{ speaker: string; content: string }>>([])

  // 텍스트를 최대 15,000자 단위로 청크 분할 (줄바꿈 기준)
  const splitTranscript = (text: string, maxChars: number = 15000): string[] => {
    if (text.length <= maxChars) return [text]
    const chunks: string[] = []
    const lines = text.split('\n')
    let current = ''
    for (const line of lines) {
      if (current.length + line.length + 1 > maxChars && current.length > 0) {
        chunks.push(current.trim())
        current = line
      } else {
        current += (current ? '\n' : '') + line
      }
    }
    if (current.trim()) chunks.push(current.trim())
    return chunks
  }

  const rebuildTranscript = (messages: Array<{ speaker: string; content: string }>) => {
    return messages.map((m) => `${m.speaker}: ${m.content}`).join('\n')
  }

  const toggleSpeaker = (idx: number) => {
    const updated = parsedMessages.map((m, i) =>
      i === idx ? { ...m, speaker: m.speaker === 'A' ? 'B' : 'A' } : m
    )
    setParsedMessages(updated)
    setTranscript(rebuildTranscript(updated))
  }

  // Web Speech API 초기화
  useEffect(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition

    if (!SpeechRecognition) {
      setError('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome, Edge 등을 사용해주세요.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'ko-KR'

    recognition.onstart = () => {
      setIsRecording(true)
      setError(null)
      setRecordingTime(0)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      setTranscript((prev) => prev + finalTranscript)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMsg = '음성 인식 오류'
      if (event.error === 'no-speech') errorMsg = '음성이 감지되지 않았습니다'
      if (event.error === 'network') errorMsg = '네트워크 오류'
      setError(errorMsg)
    }

    recognition.onend = () => {
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }

    recognitionRef.current = recognition
  }, [])

  // 녹음 시간 카운트
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording])

  // 저장된 보고서 목록 로드
  useEffect(() => {
    setSavedReportsList(getSavedReports())
  }, [])

  // result 변경 시에도 목록 업데이트
  useEffect(() => {
    if (result) {
      setSavedReportsList(getSavedReports())
    }
  }, [result])

  const startRecording = () => {
    if (recognitionRef.current) {
      setTranscript('')
      setResult(null)
      recognitionRef.current.start()
    }
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  const handleAnalyze = async () => {
    if (!transcript.trim()) {
      setError('텍스트가 없습니다')
      return
    }

    setIsAnalyzing(true)
    setError(null)
    let totalInputTokens = 0
    let totalOutputTokens = 0

    try {
      // 1단계: 청크 분할
      const chunks = splitTranscript(transcript)
      const totalChunks = chunks.length

      // 2단계: 각 청크 대화 형식(A:/B:) 변환
      const formattedChunks: string[] = []
      for (let i = 0; i < totalChunks; i++) {
        setAnalyzeStep(totalChunks > 1
          ? `대화 형식 변환 중... (${i + 1}/${totalChunks})`
          : '대화 형식 변환 중...')
        const { formatted, usage } = await formatTranscriptAsDialog(chunks[i])
        formattedChunks.push(formatted)
        totalInputTokens += usage.inputTokens
        totalOutputTokens += usage.outputTokens
      }
      const fullFormatted = formattedChunks.join('\n')
      setTranscript(fullFormatted)

      // 3단계: 청크별 분석
      let finalSummary: CallSummary

      if (totalChunks === 1) {
        // 단일 청크: 기존 방식
        setAnalyzeStep('보고서 분석 중...')
        const { summary, usage } = await generateCallSummary(fullFormatted)
        finalSummary = summary
        totalInputTokens += usage.inputTokens
        totalOutputTokens += usage.outputTokens
      } else {
        // 복수 청크: 각각 분석 후 통합
        const partials: PartialCallSummary[] = []
        for (let i = 0; i < formattedChunks.length; i++) {
          setAnalyzeStep(`보고서 분석 중... (${i + 1}/${formattedChunks.length})`)
          const { partial, usage } = await generateChunkSummary(formattedChunks[i], i, formattedChunks.length)
          partials.push(partial)
          totalInputTokens += usage.inputTokens
          totalOutputTokens += usage.outputTokens
        }

        // 4단계: 통합
        setAnalyzeStep('보고서 통합 중...')
        const contextSummary = fullFormatted.slice(0, 3000)
        const { summary, usage } = await mergeCallSummaries(partials, contextSummary)
        finalSummary = summary
        totalInputTokens += usage.inputTokens
        totalOutputTokens += usage.outputTokens
      }

      setResult(finalSummary)
      setCostInfo((prev) => ({
        inputTokens: (prev?.inputTokens || 0) + totalInputTokens,
        outputTokens: (prev?.outputTokens || 0) + totalOutputTokens,
        whisperSeconds: prev?.whisperSeconds || 0
      }))
    } catch (err: any) {
      setError(err.message || '요약 생성 중 오류가 발생했습니다')
      setResult(null)
    } finally {
      setIsAnalyzing(false)
      setAnalyzeStep('')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 보고서 저장/로드 함수 (localStorage)
  const saveReport = (reportName: string = '') => {
    if (!result) return

    const name = reportName || `보고서_${new Date().toLocaleString('ko-KR').replace(/[/:]/g, '-')}`
    const reports = JSON.parse(localStorage.getItem('callAnalysisReports') || '{}')
    reports[name] = {
      transcript,
      result,
      savedAt: new Date().toISOString()
    }
    localStorage.setItem('callAnalysisReports', JSON.stringify(reports))
    alert(`"${name}"로 저장되었습니다`)
    setSavedReportsList(getSavedReports())
  }

  const loadReport = (reportName: string) => {
    const reports = JSON.parse(localStorage.getItem('callAnalysisReports') || '{}')
    if (reports[reportName]) {
      const { transcript: savedTranscript, result: savedResult } = reports[reportName]
      setTranscript(savedTranscript)
      setResult(savedResult)
      setIsEditMode(false)
      setEditedResult(null)
    }
  }

  const getSavedReports = (): string[] => {
    const reports = JSON.parse(localStorage.getItem('callAnalysisReports') || '{}')
    return Object.keys(reports)
  }

  const deleteReport = (reportName: string) => {
    const reports = JSON.parse(localStorage.getItem('callAnalysisReports') || '{}')
    delete reports[reportName]
    localStorage.setItem('callAnalysisReports', JSON.stringify(reports))
    setSavedReportsList(getSavedReports())
  }

  const handleTranscriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTranscript(e.target.value)

    // 자동 높이 조정
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  const parseMessages = (text: string) => {
    const messages: Array<{ speaker: string; content: string }> = []
    const lines = text.split('\n').filter((line) => line.trim())

    for (const line of lines) {
      // "A: 메시지" 또는 "B: 메시지" 형식 매칭
      const match = line.match(/^([AB]):\s*(.+)$/)
      if (match) {
        messages.push({
          speaker: match[1],
          content: match[2]
        })
      } else if (messages.length > 0) {
        // 멀티라인 메시지 처리
        messages[messages.length - 1].content += '\n' + line
      }
    }

    return messages
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 파일 형식 확인
    const validTypes = ['audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/x-m4a']
    if (!validTypes.includes(file.type)) {
      setError(`지원하지 않는 형식입니다. (${file.type})`)
      return
    }

    // 파일 크기 확인 (25MB)
    if (file.size > 25 * 1024 * 1024) {
      setError('파일 크기가 25MB를 초과합니다')
      return
    }

    setIsTranscribing(true)
    setError(null)
    setTranscript('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '음성 변환 실패')
      }

      const result = await response.json()
      setTranscript(result.transcript)
      setCostInfo({ inputTokens: 0, outputTokens: 0, whisperSeconds: result.duration || 0 })
    } catch (err: any) {
      setError(err.message || '음성 변환 중 오류가 발생했습니다')
    } finally {
      setIsTranscribing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 no-print">상담 분석 SYSTEM</h1>

        {/* 에러 표시 */}
        {error && (
          <div className="no-print bg-red-900 border border-red-700 text-red-100 p-4 rounded-lg mb-6">
            <p className="font-semibold">❌ {error}</p>
          </div>
        )}

        {/* 파일 업로드 영역 */}
        <div className="no-print bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">📁 음성 파일 업로드</h2>
          <p className="text-sm text-slate-300 mb-4">M4A, MP3, WAV 등 음성 파일을 업로드하세요 (최대 25MB)</p>

          <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-blue-500 transition cursor-pointer"
               onClick={() => fileInputRef.current?.click()}>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              disabled={isTranscribing}
              className="hidden"
            />
            <p className="text-slate-300 font-semibold">📤 여기에 파일을 드래그하거나 클릭</p>
            <p className="text-sm text-slate-400 mt-2">M4A, MP3, WAV, OGG 등</p>
          </div>

          {isTranscribing && (
            <div className="mt-4 text-center">
              <div className="inline-block">
                <div className="animate-spin">⏳</div>
              </div>
              <p className="text-blue-400 mt-2">음성을 텍스트로 변환 중...</p>
              <p className="text-sm text-slate-400">이 작업은 음성 길이에 따라 시간이 걸릴 수 있습니다</p>
            </div>
          )}
        </div>

        {/* 녹음 영역 */}
        <div className="no-print bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">🎤 음성 녹음 (마이크)</h2>

          {/* 녹음 버튼 */}
          <div className="flex gap-3 mb-6">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-4 rounded-lg transition text-lg flex items-center justify-center gap-2"
              >
                🔴 녹음 시작
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex-1 bg-red-700 hover:bg-red-800 text-white font-semibold py-4 rounded-lg transition text-lg flex items-center justify-center gap-2 animate-pulse"
              >
                ⏹️ 녹음 중지
              </button>
            )}
          </div>

          {/* 녹음 시간 */}
          {isRecording && (
            <div className="text-center mb-6">
              <p className="text-3xl font-mono text-red-400">{formatTime(recordingTime)}</p>
              <p className="text-sm text-slate-300 mt-2">🔴 녹음 중...</p>
            </div>
          )}

          {/* 텍스트 표시 및 수정 */}
          <div className="bg-slate-700 rounded p-4 mb-6">
            <p className="text-sm text-slate-300 mb-2">변환된 텍스트 (수정 가능)</p>
            <textarea
              ref={textareaRef}
              value={transcript}
              onChange={handleTranscriptChange}
              placeholder="(녹음 후 텍스트가 여기에 표시됩니다)"
              className="w-full bg-slate-600 text-white rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
              style={{ minHeight: '120px' }}
            />
          </div>

          {/* 분석 버튼 */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !transcript.trim() || isRecording}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
          >
            {isAnalyzing ? (analyzeStep || '분석 중...') : '🔍 분석 시작'}
          </button>

          {/* 초기화 버튼 */}
          {transcript && (
            <button
              onClick={() => setTranscript('')}
              className="w-full mt-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 rounded-lg transition"
            >
              🔄 초기화
            </button>
          )}
        </div>

        {/* 저장된 보고서 목록 - 항상 표시 */}
        {savedReportsList.length > 0 && (
          <div className="no-print bg-slate-800 rounded-lg p-6 border border-slate-700">
            <p className="text-sm text-slate-300 mb-3 font-semibold">📂 저장된 보고서</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {savedReportsList.map((reportName, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-700 rounded p-2">
                  <span className="text-white text-sm flex-1 truncate">{reportName}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => loadReport(reportName)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition"
                    >
                      로드
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`"${reportName}"을 삭제하시겠습니까?`)) {
                          deleteReport(reportName)
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 결과 표시 */}
        {result && (
          <div className="print-report bg-slate-800 rounded-lg p-6 space-y-6">
            {/* 인쇄 전용 헤더 */}
            <div className="print-only" style={{ borderBottom: '2px solid #374151', paddingBottom: '16pt', marginBottom: '16pt' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h1 style={{ fontSize: '16pt', fontWeight: 700, color: '#111827', marginBottom: '4pt' }}>통화 분석 보고서</h1>
                  <p style={{ fontSize: '9pt', color: '#6b7280' }}>Call Analysis Report</p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '9pt', color: '#6b7280' }}>
                  <p>작성일: {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p>작성 시각: {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 no-print">
              <h2 className="text-xl font-semibold text-white">📋 통화 요약 보고서</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition"
                >
                  🖨️ PDF 출력
                </button>
                <button
                  onClick={() => {
                    if (isEditMode) {
                      setEditedResult(null)
                      setIsEditMode(false)
                    } else {
                      setEditedResult({...result})
                      setIsEditMode(true)
                    }
                  }}
                  className={`px-3 py-1 text-white text-sm rounded transition ${
                    isEditMode
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-yellow-600 hover:bg-yellow-700'
                  }`}
                >
                  {isEditMode ? '✕ 취소' : '✎ 수정 모드'}
                </button>
                {isEditMode && (
                  <button
                    onClick={() => {
                      setResult(editedResult)
                      setIsEditMode(false)
                      setEditedResult(null)
                    }}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition"
                  >
                    ✓ 저장
                  </button>
                )}
                <button
                  onClick={() => setShowSaveDialog(!showSaveDialog)}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition"
                >
                  💾 보고서 저장
                </button>
                <button
                  onClick={() => {
                    if (!showFullTranscript) {
                      const parsed = parseMessages(transcript)
                      setParsedMessages(parsed)
                    }
                    setShowFullTranscript(!showFullTranscript)
                  }}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
                >
                  {showFullTranscript ? '▼ 숨기기' : '▶ 대화록'}
                </button>
              </div>
            </div>

            {/* 보고서 저장 다이얼로그 */}
            {showSaveDialog && (
              <div className="no-print bg-slate-700 rounded p-4 border border-purple-500">
                <p className="text-sm text-slate-300 mb-3 font-semibold">💾 보고서 저장</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="보고서 이름 입력 (기본: 자동 생성)"
                    className="flex-1 bg-slate-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={() => {
                      saveReport(saveName)
                      setSaveName('')
                      setShowSaveDialog(false)
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm transition"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setSaveName('')
                      setShowSaveDialog(false)
                    }}
                    className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded text-sm transition"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {/* 전체 대화록 (카톡 스타일) */}
            {showFullTranscript && (
              <div className="no-print bg-slate-700 rounded p-4 border border-blue-500">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-slate-300 font-semibold">📝 원본 대화 기록</p>
                  {parsedMessages.length > 0 && (
                    <p className="text-xs text-slate-400">말풍선 클릭 시 A↔B 전환</p>
                  )}
                </div>
                <div className="bg-slate-900 rounded-lg p-4 max-h-96 overflow-y-auto space-y-3">
                  {parsedMessages.length > 0 ? (
                    parsedMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.speaker === 'A' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          onClick={() => toggleSpeaker(idx)}
                          className={`max-w-xs px-4 py-2 rounded-2xl cursor-pointer hover:opacity-80 transition-opacity ${
                            msg.speaker === 'A'
                              ? 'bg-slate-700 text-gray-100'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          <p className={`text-xs mb-1 ${msg.speaker === 'A' ? 'text-slate-400' : 'text-blue-200'}`}>
                            {msg.speaker === 'A' ? '🕵️ 탐정 (A)' : '👤 의뢰인 (B)'}
                          </p>
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{transcript}</p>
                  )}
                </div>
              </div>
            )}

            {/* 사건 개요 */}
            <div className="print-section bg-slate-700 rounded p-4">
              <p className="print-section-title text-sm text-slate-300 mb-2 font-semibold">사건 개요</p>
              {isEditMode && editedResult ? (
                <textarea
                  value={editedResult.caseOverview}
                  onChange={(e) =>
                    setEditedResult({
                      ...editedResult,
                      caseOverview: e.target.value
                    })
                  }
                  className="w-full bg-slate-600 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                />
              ) : (
                <p className="text-white">{(editedResult || result)?.caseOverview}</p>
              )}
            </div>

            {/* 의뢰인 정보 */}
            <div className="print-section bg-slate-700 rounded p-4">
              <p className="print-section-title text-sm text-slate-300 mb-3 font-semibold">의뢰인 정보</p>
              {isEditMode && editedResult ? (
                <div className="space-y-2">
                  <div>
                    <p className="text-slate-400 text-sm">이름</p>
                    <input
                      type="text"
                      value={editedResult.clientInfo.name}
                      onChange={(e) =>
                        setEditedResult({
                          ...editedResult,
                          clientInfo: { ...editedResult.clientInfo, name: e.target.value }
                        })
                      }
                      className="w-full bg-slate-600 text-white rounded p-2 text-sm"
                    />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">연락처</p>
                    <input
                      type="text"
                      value={editedResult.clientInfo.contact}
                      onChange={(e) =>
                        setEditedResult({
                          ...editedResult,
                          clientInfo: { ...editedResult.clientInfo, contact: e.target.value }
                        })
                      }
                      className="w-full bg-slate-600 text-white rounded p-2 text-sm"
                    />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">주요 문제</p>
                    <input
                      type="text"
                      value={editedResult.clientInfo.mainIssue}
                      onChange={(e) =>
                        setEditedResult({
                          ...editedResult,
                          clientInfo: { ...editedResult.clientInfo, mainIssue: e.target.value }
                        })
                      }
                      className="w-full bg-slate-600 text-white rounded p-2 text-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <p className="text-slate-400 text-sm">이름</p>
                    <p className="text-white">{(editedResult || result).clientInfo.name}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">연락처</p>
                    <p className="text-white">{(editedResult || result).clientInfo.contact}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">주요 문제</p>
                    <p className="text-white">{(editedResult || result).clientInfo.mainIssue}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 파악 내용 */}
            <div className="print-section bg-slate-700 rounded p-4">
              <p className="print-section-title text-sm text-slate-300 mb-3 font-semibold">파악 내용</p>
              {isEditMode && editedResult ? (
                <div className="space-y-3">
                  {editedResult.observations.map((obs, idx) => (
                    <div key={idx} className="bg-slate-600 rounded p-3 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={typeof obs === 'string' ? obs : obs.content}
                          onChange={(e) => {
                            const newObs = [...editedResult.observations]
                            newObs[idx] = { content: e.target.value, detail: typeof obs === 'string' ? '' : obs.detail }
                            setEditedResult({ ...editedResult, observations: newObs })
                          }}
                          placeholder="내용"
                          className="flex-1 bg-slate-500 text-white rounded p-2 text-sm"
                        />
                        <button
                          onClick={() => {
                            const newObs = editedResult.observations.filter((_, i) => i !== idx)
                            setEditedResult({ ...editedResult, observations: newObs })
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-2 rounded text-sm whitespace-nowrap"
                        >
                          삭제
                        </button>
                      </div>
                      <textarea
                        value={typeof obs === 'string' ? '' : obs.detail}
                        onChange={(e) => {
                          const newObs = [...editedResult.observations]
                          newObs[idx] = {
                            content: typeof obs === 'string' ? '' : obs.content,
                            detail: e.target.value
                          }
                          setEditedResult({ ...editedResult, observations: newObs })
                        }}
                        placeholder="주석 (근거/맥락)"
                        className="w-full bg-slate-500 text-white rounded p-2 text-xs resize-none"
                        rows={2}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setEditedResult({
                        ...editedResult,
                        observations: [...editedResult.observations, { content: '', detail: '' }]
                      })
                    }
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm"
                  >
                    + 추가
                  </button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {(editedResult || result).observations.map((obs, idx) => (
                    <li key={idx} className="text-white text-sm">
                      <p className="flex gap-2 mb-1">
                        <span className="text-blue-400">•</span>
                        <span className="font-medium">{typeof obs === 'string' ? obs : obs.content}</span>
                      </p>
                      {typeof obs !== 'string' && obs.detail && (
                        <p className="text-slate-400 text-xs ml-6">{obs.detail}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 주요 진술 */}
            <div className="print-section bg-slate-700 rounded p-4">
              <p className="print-section-title text-sm text-slate-300 mb-3 font-semibold">주요 진술</p>
              {isEditMode && editedResult ? (
                <div className="space-y-3">
                  {editedResult.statements.map((stmt, idx) => (
                    <div key={idx} className="bg-slate-600 rounded p-3 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={typeof stmt === 'string' ? stmt : stmt.content}
                          onChange={(e) => {
                            const newStmt = [...editedResult.statements]
                            newStmt[idx] = { content: e.target.value, detail: typeof stmt === 'string' ? '' : stmt.detail }
                            setEditedResult({ ...editedResult, statements: newStmt })
                          }}
                          placeholder="내용"
                          className="flex-1 bg-slate-500 text-white rounded p-2 text-sm"
                        />
                        <button
                          onClick={() => {
                            const newStmt = editedResult.statements.filter((_, i) => i !== idx)
                            setEditedResult({ ...editedResult, statements: newStmt })
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-2 rounded text-sm whitespace-nowrap"
                        >
                          삭제
                        </button>
                      </div>
                      <textarea
                        value={typeof stmt === 'string' ? '' : stmt.detail}
                        onChange={(e) => {
                          const newStmt = [...editedResult.statements]
                          newStmt[idx] = {
                            content: typeof stmt === 'string' ? '' : stmt.content,
                            detail: e.target.value
                          }
                          setEditedResult({ ...editedResult, statements: newStmt })
                        }}
                        placeholder="주석 (맥락/배경)"
                        className="w-full bg-slate-500 text-white rounded p-2 text-xs resize-none"
                        rows={2}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setEditedResult({
                        ...editedResult,
                        statements: [...editedResult.statements, { content: '', detail: '' }]
                      })
                    }
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm"
                  >
                    + 추가
                  </button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {(editedResult || result).statements.map((stmt, idx) => (
                    <li key={idx} className="text-white text-sm">
                      <p className="flex gap-2 mb-1">
                        <span className="text-amber-400">•</span>
                        <span className="font-medium">{typeof stmt === 'string' ? stmt : stmt.content}</span>
                      </p>
                      {typeof stmt !== 'string' && stmt.detail && (
                        <p className="text-slate-400 text-xs ml-6">{stmt.detail}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 주요 질문 */}
            <div className="print-section bg-slate-700 rounded p-4">
              <p className="print-section-title text-sm text-slate-300 mb-3 font-semibold">주요 질문</p>
              {isEditMode && editedResult ? (
                <div className="space-y-3">
                  {editedResult.questions.map((q, idx) => (
                    <div key={idx} className="bg-slate-600 rounded p-3 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={typeof q === 'string' ? q : q.question}
                          onChange={(e) => {
                            const newQ = [...editedResult.questions]
                            newQ[idx] = { question: e.target.value, answer: typeof q === 'string' ? '' : q.answer }
                            setEditedResult({ ...editedResult, questions: newQ })
                          }}
                          placeholder="질문"
                          className="flex-1 bg-slate-500 text-white rounded p-2 text-sm"
                        />
                        <button
                          onClick={() => {
                            const newQ = editedResult.questions.filter((_, i) => i !== idx)
                            setEditedResult({ ...editedResult, questions: newQ })
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-2 rounded text-sm whitespace-nowrap"
                        >
                          삭제
                        </button>
                      </div>
                      <textarea
                        value={typeof q === 'string' ? '' : q.answer}
                        onChange={(e) => {
                          const newQ = [...editedResult.questions]
                          newQ[idx] = {
                            question: typeof q === 'string' ? '' : q.question,
                            answer: e.target.value
                          }
                          setEditedResult({ ...editedResult, questions: newQ })
                        }}
                        placeholder="답변"
                        className="w-full bg-slate-500 text-white rounded p-2 text-xs resize-none"
                        rows={2}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setEditedResult({
                        ...editedResult,
                        questions: [...editedResult.questions, { question: '', answer: '' }]
                      })
                    }
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm"
                  >
                    + 추가
                  </button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {(editedResult || result).questions.map((q, idx) => (
                    <li key={idx} className="text-white text-sm">
                      <p className="flex gap-2 mb-1">
                        <span className="text-green-400">Q:</span>
                        <span className="font-medium">{typeof q === 'string' ? q : q.question}</span>
                      </p>
                      {typeof q !== 'string' && q.answer && (
                        <p className="text-green-400 text-xs ml-6">A: {q.answer}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 우려/요청사항 */}
            <div className="print-section bg-slate-700 rounded p-4">
              <p className="print-section-title text-sm text-slate-300 mb-3 font-semibold">우려 / 요청사항</p>
              {isEditMode && editedResult ? (
                <div className="space-y-3">
                  {editedResult.concerns.map((concern, idx) => (
                    <div key={idx} className="bg-slate-600 rounded p-3 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={typeof concern === 'string' ? concern : concern.content}
                          onChange={(e) => {
                            const newConcern = [...editedResult.concerns]
                            newConcern[idx] = { content: e.target.value, reason: typeof concern === 'string' ? '' : concern.reason }
                            setEditedResult({ ...editedResult, concerns: newConcern })
                          }}
                          placeholder="사항"
                          className="flex-1 bg-slate-500 text-white rounded p-2 text-sm"
                        />
                        <button
                          onClick={() => {
                            const newConcern = editedResult.concerns.filter((_, i) => i !== idx)
                            setEditedResult({ ...editedResult, concerns: newConcern })
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-2 rounded text-sm whitespace-nowrap"
                        >
                          삭제
                        </button>
                      </div>
                      <textarea
                        value={typeof concern === 'string' ? '' : concern.reason}
                        onChange={(e) => {
                          const newConcern = [...editedResult.concerns]
                          newConcern[idx] = {
                            content: typeof concern === 'string' ? '' : concern.content,
                            reason: e.target.value
                          }
                          setEditedResult({ ...editedResult, concerns: newConcern })
                        }}
                        placeholder="이유/배경"
                        className="w-full bg-slate-500 text-white rounded p-2 text-xs resize-none"
                        rows={2}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setEditedResult({
                        ...editedResult,
                        concerns: [...editedResult.concerns, { content: '', reason: '' }]
                      })
                    }
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm"
                  >
                    + 추가
                  </button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {(editedResult || result).concerns.map((concern, idx) => (
                    <li key={idx} className="text-white text-sm">
                      <p className="flex gap-2 mb-1">
                        <span className="text-red-400">!</span>
                        <span className="font-medium">{typeof concern === 'string' ? concern : concern.content}</span>
                      </p>
                      {typeof concern !== 'string' && concern.reason && (
                        <p className="text-slate-400 text-xs ml-6">{concern.reason}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 키워드 */}
            <div className="print-section bg-slate-700 rounded p-4">
              <p className="print-section-title text-sm text-slate-300 mb-3 font-semibold">키워드</p>
              {isEditMode && editedResult ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editedResult.keywords.map((keyword, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-blue-600 rounded-full px-3 py-1">
                        <span className="text-white text-sm">{keyword}</span>
                        <button
                          onClick={() => {
                            const newKeywords = editedResult.keywords.filter((_, i) => i !== idx)
                            setEditedResult({ ...editedResult, keywords: newKeywords })
                          }}
                          className="text-white hover:text-red-300 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="새로운 키워드 입력 후 Enter"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        setEditedResult({
                          ...editedResult,
                          keywords: [...editedResult.keywords, e.currentTarget.value.trim()]
                        })
                        e.currentTarget.value = ''
                      }
                    }}
                    className="w-full bg-slate-600 text-white rounded p-2 text-sm"
                  />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(editedResult || result).keywords.map((keyword, idx) => (
                    <span key={idx} className="print-keyword bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 액션 아이템 */}
            <div className="print-section bg-slate-700 rounded p-4">
              <p className="print-section-title text-sm text-slate-300 mb-3 font-semibold">액션 아이템</p>
              {isEditMode && editedResult ? (
                <div className="space-y-3">
                  {editedResult.actionItems.map((item, idx) => (
                    <div key={idx} className="bg-slate-600 rounded p-3 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={typeof item === 'string' ? item : item.action}
                          onChange={(e) => {
                            const newItems = [...editedResult.actionItems]
                            newItems[idx] = {
                              action: e.target.value,
                              priority: typeof item === 'string' ? 'medium' : item.priority
                            }
                            setEditedResult({ ...editedResult, actionItems: newItems })
                          }}
                          placeholder="액션 항목"
                          className="flex-1 bg-slate-500 text-white rounded p-2 text-sm"
                        />
                        <select
                          value={typeof item === 'string' ? 'medium' : item.priority || 'medium'}
                          onChange={(e) => {
                            const newItems = [...editedResult.actionItems]
                            newItems[idx] = {
                              action: typeof item === 'string' ? '' : item.action,
                              priority: e.target.value as 'high' | 'medium' | 'low'
                            }
                            setEditedResult({ ...editedResult, actionItems: newItems })
                          }}
                          className="bg-slate-500 text-white rounded p-2 text-sm"
                        >
                          <option value="high">높음</option>
                          <option value="medium">중간</option>
                          <option value="low">낮음</option>
                        </select>
                        <button
                          onClick={() => {
                            const newItems = editedResult.actionItems.filter((_, i) => i !== idx)
                            setEditedResult({ ...editedResult, actionItems: newItems })
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-2 rounded text-sm whitespace-nowrap"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setEditedResult({
                        ...editedResult,
                        actionItems: [...editedResult.actionItems, { action: '', priority: 'medium' }]
                      })
                    }
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm"
                  >
                    + 추가
                  </button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {(editedResult || result).actionItems.map((item, idx) => {
                    const priority = typeof item !== 'string' ? item.priority : undefined
                    const priorityColor = priority === 'high' ? 'text-red-400' : priority === 'medium' ? 'text-yellow-400' : 'text-green-400'
                    const printPriorityClass = priority === 'high' ? 'print-priority-high' : priority === 'medium' ? 'print-priority-medium' : 'print-priority-low'
                    const priorityLabel = priority === 'high' ? '높음' : priority === 'medium' ? '중간' : '낮음'
                    return (
                      <li key={idx} className="text-white flex gap-2">
                        <span className={priorityColor}>→</span>
                        <div className="flex-1">
                          <span>{typeof item === 'string' ? item : item.action}</span>
                          {priority && (
                            <span className={`ml-2 text-xs px-2 py-1 rounded ${priorityColor} ${printPriorityClass} bg-slate-600`}>
                              {priorityLabel}
                            </span>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* 비용 표시 */}
            {costInfo && (() => { // no-print applied below
              const WHISPER_PER_SEC = 0.006 / 60
              const GPT_INPUT_PER_TOKEN = 0.15 / 1_000_000
              const GPT_OUTPUT_PER_TOKEN = 0.60 / 1_000_000
              const KRW_RATE = 1450

              const whisperCost = costInfo.whisperSeconds * WHISPER_PER_SEC
              const gptCost = costInfo.inputTokens * GPT_INPUT_PER_TOKEN + costInfo.outputTokens * GPT_OUTPUT_PER_TOKEN
              const totalUSD = whisperCost + gptCost
              const totalKRW = totalUSD * KRW_RATE

              return (
                <div className="no-print bg-slate-700 rounded p-4 border border-slate-500 text-sm">
                  <p className="text-slate-300 font-semibold mb-2">💰 API 사용 비용</p>
                  <div className="space-y-1 text-slate-400">
                    {costInfo.whisperSeconds > 0 && (
                      <div className="flex justify-between">
                        <span>🎤 Whisper ({Math.round(costInfo.whisperSeconds / 60)}분 {Math.round(costInfo.whisperSeconds % 60)}초)</span>
                        <span>${whisperCost.toFixed(4)} (약 {Math.round(whisperCost * KRW_RATE)}원)</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>🤖 GPT-4o-mini (입력 {costInfo.inputTokens.toLocaleString()} / 출력 {costInfo.outputTokens.toLocaleString()} 토큰)</span>
                      <span>${gptCost.toFixed(4)} (약 {Math.round(gptCost * KRW_RATE)}원)</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-600 pt-1 mt-1 text-white font-medium">
                      <span>합계</span>
                      <span>${totalUSD.toFixed(4)} (약 {Math.round(totalKRW)}원)</span>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
