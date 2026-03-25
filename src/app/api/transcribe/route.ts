import { NextRequest, NextResponse } from 'next/server'

/**
 * OpenAI Whisper API를 통해 음성 파일을 텍스트로 변환
 * POST /api/transcribe
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API 키가 설정되지 않았습니다' }, { status: 500 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })
    }

    // 파일 크기 확인 (25MB)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: '파일 크기가 25MB를 초과합니다' }, { status: 400 })
    }

    // OpenAI Whisper API로 전송
    const openaiFormData = new FormData()
    openaiFormData.append('file', file)
    openaiFormData.append('model', 'whisper-1')
    openaiFormData.append('language', 'ko') // 한국어

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: openaiFormData
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('OpenAI API 에러:', error)
      return NextResponse.json(
        { error: `Whisper API 오류: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      transcript: data.text,
      duration: data.duration
    })
  } catch (error) {
    console.error('음성 변환 실패:', error)
    return NextResponse.json({ error: '음성 변환 중 오류가 발생했습니다' }, { status: 500 })
  }
}
