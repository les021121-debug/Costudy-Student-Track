import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { name, password, is_admin } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // UUID 기반으로 고유 이메일 자동생성
    const uniqueId = Date.now()
    const email = `teacher${uniqueId}@costudymath.com`

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabase.from('teachers').insert({
      id: data.user.id,
      name,
      email,
      is_admin: is_admin || false,
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
