'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  const [name, setName] = useState('')
  const [messageStyle, setMessageStyle] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingStyle, setSavingStyle] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')

  const load = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data } = await supabase.from('teachers').select('name, message_style').eq('id', user.id).single()
    if (data) {
      setName(data.name)
      setMessageStyle(data.message_style || '')
    }
  }

  useEffect(() => { load() }, [])

  const savePassword = async () => {
    if (password.length !== 6) { setError('비밀번호는 6자리 숫자예요'); return }
    setSaving(true)
    setError('')
    setSuccess('')
    const res = await fetch('/api/admin/update-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password }),
    })
    if (res.ok) {
      setSuccess('비밀번호가 변경됐어요!')
      setPassword('')
    } else {
      setError('비밀번호 변경 중 오류가 발생했어요')
    }
    setSaving(false)
  }

  const saveStyle = async () => {
    setSavingStyle(true)
    setError('')
    setSuccess('')
    const supabase = createClient()
    await supabase.from('teachers').update({ message_style: messageStyle }).eq('id', userId)
    setSuccess('문자 스타일이 저장됐어요!')
    setSavingStyle(false)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings size={22} className="text-primary-500" /> 내 설정
        </h1>
      </div>

      {success && <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-xl text-sm font-medium">{success}</div>}
      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">{error}</div>}

      {/* 비밀번호 변경 */}
      <div className="card mb-5">
        <h2 className="font-bold text-gray-900 mb-4">🔐 비밀번호 변경</h2>
        <div className="space-y-3">
          <div>
            <label className="label">새 비밀번호 (6자리 숫자)</label>
            <input
              className="input"
              type="password"
              placeholder="숫자 6자리"
              maxLength={6}
              value={password}
              onChange={e => setPassword(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>
        <button
          onClick={savePassword}
          disabled={saving || password.length !== 6}
          className="btn-primary mt-4 w-full disabled:opacity-40"
        >
          {saving ? '변경 중...' : '비밀번호 변경'}
        </button>
      </div>

      {/* 문자 스타일 */}
      <div className="card">
        <h2 className="font-bold text-gray-900 mb-1">💬 내 문자 스타일</h2>
        <p className="text-sm text-gray-400 mb-4">샘플 문자를 입력하면 AI가 선생님의 말투와 스타일을 분석해서 월말 문자를 생성해요</p>
        <div>
          <label className="label">샘플 문자</label>
          <textarea
            className="input"
            rows={6}
            placeholder={`예시:\n안녕하세요 어머님 :) 저번 달 수업 내용 전달드려요~\n이번 달 OO이가 정말 열심히 했어요! 특히 미적분 부분에서 많이 성장한 것 같아서 뿌듯했답니다 ☺️\n다음 달도 잘 부탁드려요!`}
            value={messageStyle}
            onChange={e => setMessageStyle(e.target.value)}
          />
        </div>
        <button
          onClick={saveStyle}
          disabled={savingStyle || !messageStyle}
          className="btn-primary mt-4 w-full disabled:opacity-40"
        >
          {savingStyle ? '저장 중...' : '스타일 저장'}
        </button>
      </div>
    </div>
  )
}