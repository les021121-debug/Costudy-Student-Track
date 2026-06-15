'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, Plus, CalendarDays, UserPlus, Search, X, Trash2 } from 'lucide-react'
import Link from 'next/link'
import LessonForm from '@/components/forms/LessonForm'

type Lesson = { id: string; lesson_date: string; memo: string; test_total: number | null }
type Student = { id: string; name: string; school?: string }
type ClassInfo = { id: string; name: string; subject: string; textbook: string; current_progress: string }

export default function ClassDetailPage() {
  const { id } = useParams()
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null)

  // 학생 추가 모달
  const [showAddStudents, setShowAddStudents] = useState(false)
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [adding, setAdding] = useState(false)

  const load = async () => {
    const supabase = createClient()
    const [{ data: cls }, { data: les }, { data: sc }] = await Promise.all([
      supabase.from('classes').select('*').eq('id', id).single(),
      supabase.from('lessons').select('*').eq('class_id', id).order('lesson_date', { ascending: false }),
      supabase.from('student_classes').select('students(id, name, school)').eq('class_id', id),
    ])
    if (cls) setClassInfo(cls)
    if (les) setLessons(les)
    if (sc) setStudents((sc as any[]).map(s => s.students).filter(Boolean))
  }

  const openAddStudents = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('students').select('id, name, school').eq('status', 'active').order('name')
    if (data) setAllStudents(data)
    setSelected([])
    setSearch('')
    setShowAddStudents(true)
  }

  const toggleSelect = (sid: string) => {
    setSelected(prev => prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid])
  }

  const addStudents = async () => {
    if (selected.length === 0) return
    setAdding(true)
    const supabase = createClient()
    const currentIds = students.map(s => s.id)
    const newIds = selected.filter(sid => !currentIds.includes(sid))
    if (newIds.length > 0) {
      await supabase.from('student_classes').insert(newIds.map(sid => ({ student_id: sid, class_id: id })))
    }
    setAdding(false)
    setShowAddStudents(false)
    load()
  }

  const removeStudent = async (studentId: string) => {
    if (!confirm('이 학생을 반에서 제거할까요?')) return
    const supabase = createClient()
    await supabase.from('student_classes').delete().eq('student_id', studentId).eq('class_id', id)
    load()
  }

  const deleteLesson = async (lessonId: string, lessonDate: string) => {
    const dateLabel = format(new Date(lessonDate), 'yyyy년 MM월 dd일', { locale: ko })
    if (!confirm(`${dateLabel} 수업 기록을 삭제할까요?\n\n학생들의 출결/태도/과제 기록도 함께 삭제되며 복구할 수 없어요.`)) return
    const supabase = createClient()
    await supabase.from('student_records').delete().eq('lesson_id', lessonId)
    await supabase.from('lessons').delete().eq('id', lessonId)
    load()
  }

  useEffect(() => { if (id) load() }, [id])

  const currentIds = students.map(s => s.id)
  const filtered = allStudents.filter(s =>
    s.name.includes(search) || (s.school || '').includes(search)
  )
  const availableStudents = filtered.filter(s => !currentIds.includes(s.id))
  const alreadyInClass = filtered.filter(s => currentIds.includes(s.id))

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/classes" className="p-2 text-gray-400 hover:text-gray-700 transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{classInfo?.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {classInfo?.textbook && `📚 ${classInfo.textbook}`}
            {classInfo?.current_progress && ` · 📍 ${classInfo.current_progress}`}
          </p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => { setSelectedLesson(null); setShowForm(true) }}
        >
          <Plus size={16} /> 수업 기록
        </button>
      </div>

      {/* 학생 목록 */}
      <div className="card mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-gray-900">👥 수강 학생 ({students.length}명)</span>
          <button
            onClick={openAddStudents}
            className="flex items-center gap-1.5 text-sm text-primary-600 font-medium hover:text-primary-700"
          >
            <UserPlus size={15} /> 학생 추가
          </button>
        </div>
        {students.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">아직 배정된 학생이 없어요</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {students.map(s => (
              <div key={s.id} className="flex items-center gap-1.5 bg-primary-50 text-primary-700 px-3 py-1.5 rounded-xl text-sm font-medium">
                <span>{s.name}</span>
                {s.school && <span className="text-primary-400 text-xs">{s.school}</span>}
                <button onClick={() => removeStudent(s.id)} className="text-primary-300 hover:text-red-500 transition-colors ml-1">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 수업 기록 */}
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays size={16} className="text-gray-400" />
        <span className="text-sm text-gray-500">수업 기록 ({lessons.length}회)</span>
      </div>

      {lessons.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
          <p>아직 수업 기록이 없어요</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {lessons.map(lesson => (
            <div
              key={lesson.id}
              className="card hover:shadow-md transition-shadow w-full"
            >
              <div className="flex items-center justify-between">
                <button
                  className="text-left flex-1 min-w-0"
                  onClick={() => { setSelectedLesson(lesson.id); setShowForm(true) }}
                >
                  <p className="font-bold text-gray-900">
                    {format(new Date(lesson.lesson_date), 'yyyy년 MM월 dd일 (EEEE)', { locale: ko })}
                  </p>
                  <div className="flex gap-3 mt-1 text-sm text-gray-500">
                    {lesson.test_total && <span>📝 테스트 {lesson.test_total}문제</span>}
                    {lesson.memo && <span className="truncate max-w-xs">💬 {lesson.memo}</span>}
                  </div>
                </button>
                <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                  <button
                    onClick={() => { setSelectedLesson(lesson.id); setShowForm(true) }}
                    className="text-xs text-primary-500 font-medium hover:text-primary-600 px-2 py-1"
                  >
                    수정 →
                  </button>
                  <button
                    onClick={() => deleteLesson(lesson.id, lesson.lesson_date)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                    title="수업 기록 삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 학생 추가 모달 */}
      {showAddStudents && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-lg">학생 추가</h2>
              <button onClick={() => setShowAddStudents(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            {/* 검색 */}
            <div className="p-4 border-b">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
                <Search size={15} className="text-gray-400" />
                <input
                  className="flex-1 bg-transparent text-sm outline-none"
                  placeholder="이름 또는 학교로 검색"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {/* 추가 가능한 학생 */}
              {availableStudents.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-2">추가 가능 ({availableStudents.length}명)</p>
                  <div className="space-y-1">
                    {availableStudents.map(s => (
                      <label key={s.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${selected.includes(s.id) ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
                        <input
                          type="checkbox"
                          checked={selected.includes(s.id)}
                          onChange={() => toggleSelect(s.id)}
                          className="accent-primary-500"
                        />
                        <span className="font-medium text-sm">{s.name}</span>
                        {s.school && <span className="text-xs text-gray-400">{s.school}</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* 이미 반에 있는 학생 */}
              {alreadyInClass.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-2">이미 이 반에 있어요</p>
                  <div className="space-y-1">
                    {alreadyInClass.map(s => (
                      <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 opacity-50">
                        <span className="font-medium text-sm">{s.name}</span>
                        {s.school && <span className="text-xs text-gray-400">{s.school}</span>}
                        <span className="ml-auto text-xs text-gray-400">배정됨</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {availableStudents.length === 0 && alreadyInClass.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-8">검색 결과가 없어요</p>
              )}
            </div>

            <div className="p-4 border-t flex gap-2">
              <button onClick={() => setShowAddStudents(false)} className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 font-medium hover:bg-gray-50">
                취소
              </button>
              <button
                onClick={addStudents}
                disabled={selected.length === 0 || adding}
                className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-40"
              >
                {adding ? '추가 중...' : `${selected.length}명 추가하기`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <LessonForm
          classId={id as string}
          students={students}
          lessonId={selectedLesson}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }}
        />
      )}
    </div>
  )
}