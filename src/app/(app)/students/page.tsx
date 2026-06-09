'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, Users, Pencil, Trash2 } from 'lucide-react'

type Student = { id: string; name: string; parent_phone: string; notes: string; school: string; status: string; classes?: string[] }
type Class = { id: string; name: string }

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Student | null>(null)
  const [form, setForm] = useState({ name: '', parent_phone: '', notes: '', school: '', classIds: [] as string[] })

  const load = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: stus }, { data: cls }] = await Promise.all([
      supabase.from('students').select('*').order('status').order('name'),
      supabase.from('classes').select('id, name'),
    ])

    if (stus && cls) {
      const withClasses = await Promise.all(stus.map(async s => {
        const { data: sc } = await supabase.from('student_classes').select('class_id').eq('student_id', s.id)
        const classNames = (sc || []).map(r => cls.find(c => c.id === r.class_id)?.name).filter(Boolean) as string[]
        return { ...s, classes: classNames }
      }))
      setStudents(withClasses)
      setClasses(cls)
    }
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let studentId = editTarget?.id
    if (editTarget) {
      await supabase.from('students').update({ name: form.name, parent_phone: form.parent_phone, notes: form.notes, school: form.school }).eq('id', editTarget.id)
    } else {
      const { data } = await supabase.from('students').insert({ name: form.name, parent_phone: form.parent_phone, notes: form.notes, school: form.school, status: 'active' }).select().single()
      studentId = data?.id
    }

    if (studentId) {
      await supabase.from('student_classes').delete().eq('student_id', studentId)
      if (form.classIds.length > 0) {
        await supabase.from('student_classes').insert(form.classIds.map(cid => ({ student_id: studentId!, class_id: cid })))
      }
    }

    setShowForm(false)
    setEditTarget(null)
    setForm({ name: '', parent_phone: '', notes: '', school: '', classIds: [] })
    load()
  }

  const del = async (id: string) => {
    if (!confirm('학생을 삭제할까요?')) return
    const supabase = createClient()
    await supabase.from('students').delete().eq('id', id)
    load()
  }

  const setStatus = async (s: Student, status: string) => {
    if (s.status === status) return
    const supabase = createClient()
    await supabase.from('students').update({ status }).eq('id', s.id)
    load()
  }

  const openEdit = async (s: Student) => {
    const supabase = createClient()
    const { data: sc } = await supabase.from('student_classes').select('class_id').eq('student_id', s.id)
    setEditTarget(s)
    setForm({ name: s.name, parent_phone: s.parent_phone || '', notes: s.notes || '', school: s.school || '', classIds: (sc || []).map(r => r.class_id) })
    setShowForm(true)
  }

  const toggleClass = (cid: string) => {
    setForm(f => ({
      ...f,
      classIds: f.classIds.includes(cid) ? f.classIds.filter(id => id !== cid) : [...f.classIds, cid]
    }))
  }

  const activeStudents = students.filter(s => s.status === 'active')
  const pausedStudents = students.filter(s => s.status === 'paused')

  const StatusButtons = ({ s }: { s: Student }) => (
    <div className="flex gap-1">
      <button
        onClick={() => setStatus(s, 'active')}
        className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
          s.status === 'active' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
        }`}
      >
        재원
      </button>
      <button
        onClick={() => setStatus(s, 'paused')}
        className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${
          s.status === 'paused' ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
        }`}
      >
        휴원
      </button>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">학생 관리</h1>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => { setEditTarget(null); setForm({ name: '', parent_phone: '', notes: '', school: '', classIds: [] }); setShowForm(true) }}
        >
          <Plus size={16} /> 학생 추가
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="card w-full max-w-md">
            <h2 className="font-bold text-lg mb-4">{editTarget ? '학생 정보 수정' : '새 학생 추가'}</h2>
            <div className="space-y-3">
              <div>
                <label className="label">이름 *</label>
                <input className="input" placeholder="홍길동" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">학교/학년</label>
                <input className="input" placeholder="여명중2" value={form.school} onChange={e => setForm(f => ({ ...f, school: e.target.value }))} />
              </div>
              <div>
                <label className="label">학부모 연락처</label>
                <input className="input" placeholder="010-0000-0000" value={form.parent_phone} onChange={e => setForm(f => ({ ...f, parent_phone: e.target.value }))} />
              </div>
              <div>
                <label className="label">학생 메모</label>
                <textarea className="input" rows={2} placeholder="기타 메모" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div>
                <label className="label">수강 반 (중복 선택 가능)</label>
                <div className="flex flex-wrap gap-2">
                  {classes.map(c => (
                    <button
                      key={c.id}
                      onClick={() => toggleClass(c.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        form.classIds.includes(c.id) ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button className="btn-secondary flex-1" onClick={() => setShowForm(false)}>취소</button>
              <button className="btn-primary flex-1" onClick={save} disabled={!form.name}>저장</button>
            </div>
          </div>
        </div>
      )}

      {students.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p>아직 등록된 학생이 없어요</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3">
            {activeStudents.map(s => (
              <div key={s.id} className="card flex items-center gap-4">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-600 flex-shrink-0">
                  {s.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{s.name}</span>
                    {s.school && <span className="text-sm text-gray-500">{s.school}</span>}
                    {s.classes?.map(cn => (
                      <span key={cn} className="badge bg-primary-50 text-primary-600">{cn}</span>
                    ))}
                  </div>
                  {s.parent_phone && <p className="text-sm text-gray-500 mt-0.5">📞 {s.parent_phone}</p>}
                </div>
                <div className="flex gap-1 items-center">
                  <StatusButtons s={s} />
                  <button onClick={() => openEdit(s)} className="p-2 text-gray-400 hover:text-primary-500 transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => del(s.id)} className="p-2 text-gray-400 hover:text-danger transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {pausedStudents.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-400 mb-3">휴원생 ({pausedStudents.length}명)</p>
              <div className="grid gap-3">
                {pausedStudents.map(s => (
                  <div key={s.id} className="card flex items-center gap-4 opacity-50">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-400 flex-shrink-0">
                      {s.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-500">{s.name}</span>
                        {s.school && <span className="text-sm text-gray-400">{s.school}</span>}
                      </div>
                      {s.parent_phone && <p className="text-sm text-gray-400 mt-0.5">📞 {s.parent_phone}</p>}
                    </div>
                    <div className="flex gap-1 items-center">
                      <StatusButtons s={s} />
                      <button onClick={() => openEdit(s)} className="p-2 text-gray-400 hover:text-primary-500 transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => del(s.id)} className="p-2 text-gray-400 hover:text-danger transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}