import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { userId, password } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase.auth.admin.updateUserById(userId, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
