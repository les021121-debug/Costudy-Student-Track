'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Teacher = { id: string; name: string; email: string }

export default function LoginPage() {
  const router = useRouter()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('teachers').select('id, name, email').order('name')
      if (data) setTeachers(data)
    }
    load()
  }, [])

  const handleLogin = async () => {
    if (!selectedId || !password) {
      setError('선생님을 선택하고 비밀번호를 입력해주세요.')
      return
    }
    setLoading(true)
    setError('')
    const teacher = teachers.find(t => t.id === selectedId)
    if (!teacher) { setError('선생님 정보를 찾을 수 없습니다.'); setLoading(false); return }

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: teacher.email,
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
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">코</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">코스터디 학생관리</h1>
          <p className="text-sm text-gray-500 mt-1">선생님 전용 관리 시스템</p>
        </div>

        <div className="card space-y-4">
          <div>
            <label className="label">선생님 선택</label>
            <select
              className="input"
              value={selectedId}
              onChange={e => { setSelectedId(e.target.value); setError('') }}
            >
              <option value="">선생님을 선택하세요</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name} 선생님</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">비밀번호 (4자리)</label>
            <input
              className="input"
              type="password"
              placeholder="••••"
              maxLength={4}
              value={password}
              onChange={e => setPassword(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            className="btn-primary w-full"
            onClick={handleLogin}
            disabled={loading || !selectedId || password.length !== 4}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </div>
      </div>
    </div>
  )
}
