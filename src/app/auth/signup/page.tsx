'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    setError('')
    if (!form.name || !form.email || !form.password) {
      setError('모든 항목을 입력해주세요.')
      return
    }
    if (form.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data, error: signupError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })
    if (signupError) {
      setError('가입 중 오류가 발생했습니다: ' + signupError.message)
      setLoading(false)
      return
    }
    if (data.user) {
      await supabase.from('teachers').insert({ id: data.user.id, name: form.name })
    }
    setLoading(false)
    router.replace('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white">
      <div className="card w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">코</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">선생님 가입</h1>
          <p className="text-sm text-gray-500 mt-1">코스터디 선생님 전용</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">이름</label>
            <input className="input" placeholder="홍길동" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">이메일</label>
            <input className="input" type="email" placeholder="teacher@costudymath.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">비밀번호</label>
            <input className="input" type="password" placeholder="6자 이상" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleSignup()} />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button className="btn-primary w-full" onClick={handleSignup} disabled={loading}>
            {loading ? '가입 중...' : '가입하기'}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          이미 계정이 있으신가요?{' '}
          <Link href="/auth/login" className="text-primary-500 font-medium hover:underline">로그인</Link>
        </p>
      </div>
    </div>
  )
}
