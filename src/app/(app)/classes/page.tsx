'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, BookOpen, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'

type Class = {
  id: string
  name: string
  subject: string
  schedule: string
  textbook: string
  current_progress: string
  branch: string
  teacher_id: string
  _studentCount?: number
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Class | null>(null)
  const [form, setForm] = useState({ name: '', subject: '수학', schedule: '', textbook: '', current_progress: '', branch: '알파' })
  const [activeTab, setActiveTab] = useState<'알파' | '베타'>('알파')

  const load = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('classes').select('*').order('created_at')
    if (data) {
      const counts = await Promise.all(data.map(async c => {
        const { count } = await supabase.from('student_classes').select('*', { count: 'exact', head: true }).eq('class_id', c.id)
        return count ?? 0
      }))
      setClasses(data.map((c, i) => ({ ...c, _studentCount: counts[i] })))
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (editTarget) {
      await supabase.from('classes').update(form).eq('id', editTarget.id)
    } else {
      await supabase.from('classes').insert({ ...form, teacher_id: user.id })
    }
    setShowForm(false)
    setEditTarget(null)
    setForm({ name: '', subject: '수학', schedule: '', textbook: '', current_progress: '', branch: '알파' })
    load()
  }

  const del = async (id: string) => {
    if (!confirm('반을 삭제하면 모든 수업 기록도 삭제됩니다. 삭제할까요?')) return
    const supabase = createClient()
    await supabase.from('classes').delete().eq('id', id)
    load()
  }

  const openEdit = (c: Class) => {
    setEditTarget(c)
    setForm({ name: c.name, subject: c.subject, schedule: c.schedule || '', textbook: c.textbook || '', current_progress: c.current_progress || '', branch: c.branch || '알파' })
    setShowForm(true)
  }

  const filteredClasses = classes.filter(c => c.branch === activeTab)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">반 관리</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setEditTarget(null); setForm({ name: '', subject: '수학', schedule: '', textbook: '', current_progress: '', branch: activeTab }); setShowForm(true) }}>
          <Plus size={16} /> 반 추가
        </button>
      </div>

      {/* 알파/베타 탭 */}
      <div className="flex gap-2 mb-5">
        {(['알파', '베타'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-xl font-medium text-sm transition-colors ${
              activeTab === tab ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            코스터디 {tab}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="card w-full max-w-md">
            <h2 className="font-bold text-lg mb-4">{editTarget ? '반 수정' : '새 반 추가'}</h2>
            <div className="space-y-3">
              <div>
                <label className="label">학원 *</label>
                <div className="flex gap-2">
                  {(['알파', '베타'] as const).map(b => (
                    <button
                      key={b}
                      onClick={() => setForm(f => ({ ...f, branch: b }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                        form.branch === b ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      코스터디 {b}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">반 이름 *</label>
                <input className="input" placeholder="예: 중3 화목반" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">과목</label>
                <input className="input" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
              </div>
              <div>
                <label className="label">수업 일정</label>
                <input className="input" placeholder="예: 화, 목 오후 5시" value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))} />
              </div>
              <div>
                <label className="label">교재명</label>
                <input className="input" placeholder="예: 쎈 수학 중3-2" value={form.textbook} onChange={e => setForm(f => ({ ...f, textbook: e.target.value }))} />
              </div>
              <div>
                <label className="label">현재 진도</label>
                <input className="input" placeholder="예: 3단원 이차방정식 p.142" value={form.current_progress} onChange={e => setForm(f => ({ ...f, current_progress: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button className="btn-secondary flex-1" onClick={() => setShowForm(false)}>취소</button>
              <button className="btn-primary flex-1" onClick={save} disabled={!form.name}>저장</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">불러오는 중...</p>
      ) : filteredClasses.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p>코스터디 {activeTab}에 등록된 반이 없어요</p>
          <p className="text-sm mt-1">위의 버튼으로 반을 추가해보세요</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredClasses.map(c => (
            <div key={c.id} className="card flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen size={18} className="text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900">{c.name}</h3>
                  <span className="badge bg-primary-50 text-primary-600">{c.subject}</span>
                </div>
                <div className="text-sm text-gray-500 mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5">
                  {c.schedule && <span>{c.schedule}</span>}
                  {c.textbook && <span>📚 {c.textbook}</span>}
                  {c.current_progress && <span>📍 {c.current_progress}</span>}
                  <span>👥 {c._studentCount}명</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(c)} className="p-2 text-gray-400 hover:text-primary-500 transition-colors">
                  <Pencil size={15} />
                </button>
                <button onClick={() => del(c.id)} className="p-2 text-gray-400 hover:text-danger transition-colors">
                  <Trash2 size={15} />
                </button>
                <Link href={`/classes/${c.id}`} className="p-2 text-gray-400 hover:text-primary-500 transition-colors">
                  <ChevronRight size={18} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}