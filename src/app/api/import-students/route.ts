import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { students } = await req.json()
    if (!students || students.length === 0) {
      return NextResponse.json({ error: '학생 데이터가 없습니다.' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('students')
      .insert(students)
      .select()
    if (error) throw error
    return NextResponse.json({ success: true, count: data.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}