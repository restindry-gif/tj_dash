import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// GET - 특정 보고서 로드
export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const name = decodeURIComponent(params.name)

    const { data, error } = await supabase
      .from('call_reports')
      .select('transcript, result')
      .eq('name', name)
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: '보고서를 찾을 수 없습니다' }, { status: 404 })

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE - 보고서 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const name = decodeURIComponent(params.name)

    const { error } = await supabase.from('call_reports').delete().eq('name', name)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
