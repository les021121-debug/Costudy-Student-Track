'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, Pencil, Trash2, Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'
import StudentImportModal from '@/components/forms/StudentImportModal'

type Teacher = { id: string; name: string; email: string; is_admin: boolean }

export default function AdminPage() {
  const router = useRouter()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Teacher | null>(null)
  const [form, setForm] = useState({ name: '', password: '', is_admin: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showImport, setShowImport] = useState(false)

  const load = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/auth/login'); return }
    const { data: me } = await supabase.from('teachers').select('is_admin').eq('id', user.id).single()
    if (!me?.is_admin) { router.replace('/dashboard'); return }
    const { data } = await supabase.from('teachers').select('*').order('name')
    if (data) setTeachers(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    setError('')

    if (editTarget) {
      const supabase = createClient()
      await supabase.from('teachers').update({
        name: form.name,
        is_admin: form.is_admin,
      }).eq('id', editTarget.id)

      if (form.password) {
        const res = await fetch('/api/admin/update-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: editTarget.id, password: form.password }),
        })
        if (!res.ok) { setError('비밀번호 변경 중 오류가 발생했습니다.'); setSaving(false); return }
      }
    } else {
      const res = await fetch('/api/admin/create-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, password: form.password, is_admin: form.is_admin }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || '선생님 추가 중 오류가 발생했습니다.')
        setSaving(false)
        return
      }
    }

    setSaving(false)
    setShowForm(false)
    setEditTarget(null)
    setForm({ name: '', password: '', is_admin: false })
    load()
  }

  const del = async (teacher: Teacher) => {
    if (!confirm(`${teacher.name} 선생님 계정을 삭제할까요?\n해당 선생님의 모든 데이터가 삭제됩니다.`)) return
    const supabase = createClient()
    await supabase.from('teachers').delete().eq('id', teacher.id)
    load()
  }

  const openEdit = (t: Teacher) => {
    setEditTarget(t)
    setForm({ name: t.name, password: '', is_admin: t.is_admin })
    setError('')
    setShowForm(true)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield size={22} className="text-primary-500" /> 관리자 페이지
          </h1>
          <p className="text-sm text-gray-500 mt-1">선생님 계정을 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={() => setShowImport(true)}
          >
            📂 학생 일괄 등록
          </button>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => { setEditTarget(null); setForm({ name: '', password: '', is_admin: false }); setError(''); setShowForm(true) }}
          >
            <Plus size={16} /> 선생님 추가
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <h2 className="font-bold text-lg mb-4">{editTarget ? '선생님 수정' : '새 선생님 추가'}</h2>
            <div className="space-y-3">
              <div>
                <label className="label">이름 *</label>
                <input className="input" placeholder="홍길동" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">{editTarget ? '새 비밀번호 (변경할 경우만 입력)' : '비밀번호 6자리 *'}</label>
                <input
                  className="input"
                  type="password"
                  placeholder={editTarget ? '변경하지 않으면 비워두세요' : '숫자 6자리'}
                  maxLength={6}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value.replace(/\D/g, '') }))}
                />
                {!editTarget && <p className="text-xs text-gray-400 mt-1">선생님에게 알려줄 6자리 숫자 비밀번호예요</p>}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_admin" checked={form.is_admin} onChange={e => setForm(f => ({ ...f, is_admin: e.target.checked }))} />
                <label htmlFor="is_admin" className="text-sm text-gray-700">관리자 권한 부여</label>
              </div>
            </div>
            {error && <p className="text-sm text-danger mt-3">{error}</p>}
            <div className="flex gap-2 mt-5">
              <button className="btn-secondary flex-1" onClick={() => setShowForm(false)}>취소</button>
              <button
                className="btn-primary flex-1"
                onClick={save}
                disabled={saving || !form.name || (!editTarget && form.password.length !== 6)}
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <StudentImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => load()}
        />
      )}

      <div className="grid gap-3">
        {teachers.map(t => (
          <div key={t.id} className="card flex items-center gap-4">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-600 flex-shrink-0">
              {t.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">{t.name} 선생님</span>
                {t.is_admin && <span className="badge bg-primary-50 text-primary-600">관리자</span>}
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => openEdit(t)} className="p-2 text-gray-400 hover:text-primary-500 transition-colors">
                <Pencil size={15} />
              </button>
              <button onClick={() => del(t)} className="p-2 text-gray-400 hover:text-danger transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}