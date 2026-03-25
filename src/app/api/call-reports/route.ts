import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// GET - 저장된 보고서 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('call_reports')
      .select('name, saved_at')
      .order('saved_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      reports: data?.map((r) => r.name) || []
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST - 보고서 저장
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, transcript, result, savedAt } = body

    if (!name || !transcript || !result) {
      return NextResponse.json({ error: '필수 필드 누락' }, { status: 400 })
    }

    const { error } = await supabase.from('call_reports').insert([
      {
        name,
        transcript,
        result,
        saved_at: savedAt
      }
    ])

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
