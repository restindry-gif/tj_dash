'use server'

/**
 * 통화 녹음 분석 Server Actions
 * 1. OpenAI Whisper API: 음성 → 텍스트
 * 2. Google Natural Language API: 감정 분석
 */

interface AnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative'
  score: number // -1.0 ~ 1.0
  magnitude: number
  sentences: Array<{
    text: string
    sentiment: number
  }>
}

interface TranscriptionResult {
  transcript: string
  duration?: number
}

export interface CallSummary {
  caseOverview: string
  clientInfo: {
    name: string
    contact: string
    mainIssue: string
  }
  observations: Array<{ content: string; detail: string }> // 파악한 내용 + 근거
  statements: Array<{ content: string; detail: string }> // 주요 진술 + 근거/맥락
  questions: Array<{ question: string; answer: string }> // 질문 + 대화에서 발견한 답변
  concerns: Array<{ content: string; reason: string }> // 우려사항 + 이유
  keywords: string[]
  actionItems: Array<{ action: string; priority?: 'high' | 'medium' | 'low' }> // 액션 + 우선순위
}

/**
 * OpenAI Whisper API로 음성 파일을 텍스트로 변환
 * @param file 음성 파일 (M4A, MP3, WAV 등)
 * @returns 변환된 텍스트
 */
export async function transcribeAudioFile(file: File): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OpenAI API 키가 설정되지 않았습니다')
  }

  // 파일 크기 확인 (25MB 제한)
  if (file.size > 25 * 1024 * 1024) {
    throw new Error('파일 크기가 25MB를 초과합니다')
  }

  // FormData 생성
  const formData = new FormData()
  formData.append('file', file)
  formData.append('model', 'whisper-1')
  formData.append('language', 'ko') // 한국어

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('OpenAI API 에러:', error)
      throw new Error(`Whisper API 오류: ${response.status}`)
    }

    const data = await response.json()

    return {
      transcript: data.text,
      duration: data.duration
    }
  } catch (error) {
    console.error('음성 변환 실패:', error)
    throw error
  }
}

export async function analyzeCallTranscript(transcript: string): Promise<AnalysisResult> {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY

  if (!apiKey) {
    throw new Error('Google Cloud API 키가 설정되지 않았습니다')
  }

  const requestBody = {
    document: {
      type: 'PLAIN_TEXT',
      language: 'ko',
      content: transcript
    },
    encodingType: 'UTF8'
  }

  try {
    const response = await fetch('https://language.googleapis.com/v1/documents:analyzeSentiment?key=' + apiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Google API 에러:', error)
      throw new Error(`Google API 오류: ${response.status}`)
    }

    const data = await response.json()

    // 감정 분석
    const score = data.documentSentiment.score
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral'
    if (score < -0.25) sentiment = 'negative'
    else if (score > 0.25) sentiment = 'positive'

    // 문장별 분석
    const sentences = (data.sentences || []).map((sent: any) => ({
      text: sent.text.content,
      sentiment: sent.sentiment.score
    }))

    return {
      sentiment,
      score,
      magnitude: data.documentSentiment.magnitude,
      sentences
    }
  } catch (error) {
    console.error('음성 분석 실패:', error)
    throw error
  }
}

export interface UsageInfo {
  inputTokens: number
  outputTokens: number
}

export async function formatTranscriptAsDialog(transcript: string): Promise<{ formatted: string; usage: UsageInfo }> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OpenAI API 키가 설정되지 않았습니다')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 통화 녹음 텍스트를 대화 형식으로 정리하는 전문가입니다.
주어진 텍스트는 두 사람의 통화를 음성 인식으로 변환한 것입니다.
탐정/상담사(A)와 의뢰인/고객(B)의 발언을 구분하여 다음 형식으로 재구성하세요:

A: [탐정/상담사 발언]
B: [의뢰인/고객 발언]
A: [발언]
...

구분 기준:
- 질문하거나 서비스/비용 안내를 하는 쪽이 A(탐정)
- 의뢰하거나 상황을 설명하는 쪽이 B(의뢰인)
- 문맥상 자연스럽게 이어지도록 발언 단위를 나눠주세요
- 원본 내용을 그대로 유지하되, 화자만 구분하세요
- A: B: 형식 외의 다른 텍스트는 출력하지 마세요`
        },
        {
          role: 'user',
          content: transcript
        }
      ],
      temperature: 0.3,
      max_tokens: 16000
    })
  })

  if (!response.ok) {
    throw new Error(`대화 형식 변환 실패: ${response.status}`)
  }

  const data = await response.json()
  return {
    formatted: data.choices?.[0]?.message?.content || transcript,
    usage: {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0
    }
  }
}

// 청크별 부분 분석 결과 타입
export interface PartialCallSummary {
  clientInfo?: { name: string; contact: string; mainIssue: string }
  observations: Array<{ content: string; detail: string }>
  statements: Array<{ content: string; detail: string }>
  questions: Array<{ question: string; answer: string }>
  concerns: Array<{ content: string; reason: string }>
  keywords: string[]
  actionItems: Array<{ action: string; priority?: 'high' | 'medium' | 'low' }>
}

/**
 * 청크별 부분 분석 (긴 통화 처리용)
 */
export async function generateChunkSummary(
  chunk: string,
  chunkIndex: number,
  totalChunks: number
): Promise<{ partial: PartialCallSummary; usage: UsageInfo }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OpenAI API 키가 설정되지 않았습니다')

  const systemPrompt = `당신은 탐정 사무소의 통화 내용 분석 전문가입니다.
이 텍스트는 전체 통화를 ${totalChunks}개로 나눈 것 중 ${chunkIndex + 1}번째 부분입니다.
이 부분에서 중요한 정보를 빠짐없이 추출하여 JSON으로 응답하세요.

화자 구분:
- A: 탐정/상담사 (질문, 서비스/비용 안내)
- B: 의뢰인/고객 (의뢰 내용, 상황 설명)
- A:/B: 표기가 없으면 문맥으로 판단

다음 JSON 구조로 응답하세요:
{
  "clientInfo": { "name": "이름(없으면 미확인)", "contact": "연락처(없으면 미확인)", "mainIssue": "주요 문제" },
  "observations": [{ "content": "파악한 내용", "detail": "근거/맥락" }],
  "statements": [{ "content": "주요 진술", "detail": "맥락/배경" }],
  "questions": [{ "question": "질문 내용", "answer": "대화에서 발견된 답변" }],
  "concerns": [{ "content": "우려/요청사항", "reason": "이유/배경" }],
  "keywords": ["키워드1", "키워드2"],
  "actionItems": [{ "action": "액션 항목", "priority": "high|medium|low" }]
}
JSON만 응답하세요. 한국어로 작성하세요.`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `통화 내용 (${chunkIndex + 1}/${totalChunks}):\n${chunk}` }
      ],
      temperature: 0.5,
      max_tokens: 4096,
      response_format: { type: 'json_object' }
    })
  })

  if (!response.ok) throw new Error(`청크 분석 실패: ${response.status}`)
  const data = await response.json()
  const partial = JSON.parse(data.choices?.[0]?.message?.content || '{}') as PartialCallSummary

  return {
    partial,
    usage: {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0
    }
  }
}

/**
 * 여러 청크 분석 결과를 하나로 통합
 */
export async function mergeCallSummaries(
  partials: PartialCallSummary[],
  contextSummary: string
): Promise<{ summary: CallSummary; usage: UsageInfo }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OpenAI API 키가 설정되지 않았습니다')

  const systemPrompt = `당신은 탐정 사무소의 문서화 전문가입니다.
여러 청크에서 분석된 결과들을 하나의 최종 보고서로 통합하세요.

통합 원칙:
- 중복된 항목은 하나로 합치되 가장 상세한 버전 유지
- clientInfo는 가장 구체적인 정보 선택
- 전체 통화 흐름을 고려하여 caseOverview 작성
- keywords는 중복 제거 후 중요도 순 정렬
- actionItems는 priority 기준 정렬

다음 JSON 구조로 응답하세요:
{
  "caseOverview": "전체 통화 내용 2-3문장 요약",
  "clientInfo": { "name": "...", "contact": "...", "mainIssue": "..." },
  "observations": [{ "content": "...", "detail": "..." }],
  "statements": [{ "content": "...", "detail": "..." }],
  "questions": [{ "question": "...", "answer": "..." }],
  "concerns": [{ "content": "...", "reason": "..." }],
  "keywords": ["..."],
  "actionItems": [{ "action": "...", "priority": "high|medium|low" }]
}
JSON만 응답하세요. 한국어로 작성하세요.`

  const userContent = `통화 맥락:\n${contextSummary}\n\n각 청크 분석 결과:\n${JSON.stringify(partials, null, 2)}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.5,
      max_tokens: 8192,
      response_format: { type: 'json_object' }
    })
  })

  if (!response.ok) throw new Error(`통합 분석 실패: ${response.status}`)
  const data = await response.json()
  const summary = JSON.parse(data.choices?.[0]?.message?.content || '{}') as CallSummary

  return {
    summary,
    usage: {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0
    }
  }
}

export async function generateCallSummary(transcript: string): Promise<{ summary: CallSummary; usage: UsageInfo }> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OpenAI API 키가 설정되지 않았습니다')
  }

  const systemPrompt = `당신은 탐정 사무소의 업무 처리를 돕는 문서화 전문가입니다.
주어진 통화 대화록을 A(탐정/상담사)와 B(의뢰인)의 관점으로 구분하여 상세히 분석하고, JSON 형식으로 응답하세요.

분석 원칙:
- 각 항목마다 내용뿐만 아니라 근거/맥락/상세설명을 함께 포함하세요.
- 질문에는 대화에서 발견된 답변도 포함하세요.
- "근거없음"이나 "불명"으로 표기하지 말고, 대화에서 추론 가능한 내용을 작성하세요.

화자 파악 방법:
- "A: ...", "B: ..." 형식이 있으면 그대로 사용
- 형식이 없는 경우 문맥으로 판단: 서비스/비용/조사 안내 쪽이 탐정(A), 의뢰·상황 설명 쪽이 의뢰인(B)
- 화자 구분이 불명확해도 내용 분석에 집중하세요

다음 JSON 구조로 응답하세요:
{
  "caseOverview": "통화 내용 2-3문장 요약",
  "clientInfo": {
    "name": "의뢰인 이름 (없으면 '미확인')",
    "contact": "연락처 (없으면 '미확인')",
    "mainIssue": "주요 문제"
  },
  "observations": [
    { "content": "파악한 내용", "detail": "근거/맥락" },
    { "content": "파악한 내용 2", "detail": "근거/맥락 2" }
  ],
  "statements": [
    { "content": "주요 진술", "detail": "맥락/배경" },
    { "content": "진술 2", "detail": "맥락 2" }
  ],
  "questions": [
    { "question": "던진 질문", "answer": "대화에서 발견된 답변" },
    { "question": "질문 2", "answer": "답변 2" }
  ],
  "concerns": [
    { "content": "우려사항 또는 요청사항", "reason": "이유/배경" },
    { "content": "우려사항 2", "reason": "이유 2" }
  ],
  "keywords": ["키워드1", "키워드2", ...],
  "actionItems": [
    { "action": "액션 항목", "priority": "high|medium|low" },
    { "action": "액션 2", "priority": "high|medium|low" }
  ]
}

JSON만 응답하세요. 한국어로 작성하세요.`

  const userPrompt = `다음은 탐정 사무소의 상담 통화 기록입니다. A(탐정)와 B(의뢰인)의 입장을 구분하여 분석하고 JSON 형식의 통화 요약 보고서를 작성해주세요:

통화 내용:
${transcript}`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 8192,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('OpenAI API 에러 상세:', errorData)
      throw new Error(`OpenAI API 오류: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    const choice = data.choices?.[0]
    const responseText = choice?.message?.content || ''

    if (!responseText) {
      throw new Error('OpenAI API에서 응답을 받지 못했습니다')
    }

    if (choice?.finish_reason === 'length') {
      console.warn('⚠️ 응답이 max_tokens 한계로 잘렸습니다. 통화 내용을 줄이거나 항목을 축약하세요.')
    }

    // JSON 파싱
    const summary = JSON.parse(responseText) as CallSummary

    return {
      summary,
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0
      }
    }
  } catch (error) {
    console.error('통화 요약 생성 실패:', error)
    throw error
  }
}
