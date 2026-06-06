'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Teacher = { id: string; name: string; email: string }

export default function LoginPage() {
  const router = useRouter()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selected, setSelected] = useState<Teacher | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingTeachers, setLoadingTeachers] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('teachers').select('id, name, email').order('name')
      if (data) setTeachers(data)
      setLoadingTeachers(false)
    }
    load()
  }, [])

  const handleLogin = async () => {
    if (!selected) return
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: selected.email,
      password,
    })
    if (authError) {
      setError('비밀번호가 올바르지 않습니다.')
    } else {
      router.replace('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">코</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">코스터디 학생관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            {selected ? '비밀번호를 입력해주세요' : '선생님을 선택해주세요'}
          </p>
        </div>

        {!selected ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {loadingTeachers ? (
              <div className="col-span-2 sm:col-span-3 text-center py-8 text-gray-400">불러오는 중...</div>
            ) : teachers.map(t => (
              <button
                key={t.id}
                onClick={() => { setSelected(t); setPassword(''); setError('') }}
                className="card flex flex-col items-center gap-3 py-6 hover:shadow-md hover:border-primary-200 transition-all cursor-pointer"
              >
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-bold text-lg">{t.name[0]}</span>
                </div>
                <span className="font-medium text-gray-900 text-sm">{t.name} 선생님</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="card">
            <button
              onClick={() => { setSelected(null); setPassword(''); setError('') }}
              className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
            >
              ← 돌아가기
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-bold text-lg">{selected.name[0]}</span>
              </div>
              <div>
                <p className="font-bold text-gray-900">{selected.name} 선생님</p>
                <p className="text-sm text-gray-400">비밀번호를 입력해주세요</p>
              </div>
            </div>
            <input
              className="input mb-3"
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoFocus
            />
            {error && <p className="text-sm text-danger mb-3">{error}</p>}
            <button className="btn-primary w-full" onClick={handleLogin} disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
