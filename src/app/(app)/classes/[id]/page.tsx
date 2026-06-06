'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, Plus, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import LessonForm from '@/components/forms/LessonForm'

type Lesson = { id: string; lesson_date: string; memo: string; test_total: number | null }
type Student = { id: string; name: string }
type ClassInfo = { id: string; name: string; subject: string; textbook: string; current_progress: string }

export default function ClassDetailPage() {
  const { id } = useParams()
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null)

  const load = async () => {
    const supabase = createClient()
    const [{ data: cls }, { data: les }, { data: sc }] = await Promise.all([
      supabase.from('classes').select('*').eq('id', id).single(),
      supabase.from('lessons').select('*').eq('class_id', id).order('lesson_date', { ascending: false }),
      supabase.from('student_classes').select('students(id, name)').eq('class_id', id),
    ])
    if (cls) setClassInfo(cls)
    if (les) setLessons(les)
    if (sc) setStudents((sc as any[]).map(s => s.students).filter(Boolean))
  }

  useEffect(() => { if (id) load() }, [id])

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

      <div className="mb-3 flex items-center gap-2">
        <CalendarDays size={16} className="text-gray-400" />
        <span className="text-sm text-gray-500">수업 기록 ({lessons.length}회)</span>
        <span className="badge bg-blue-50 text-blue-600 ml-1">👥 {students.length}명</span>
      </div>

      {lessons.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
          <p>아직 수업 기록이 없어요</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {lessons.map(lesson => (
            <button
              key={lesson.id}
              className="card text-left hover:shadow-md transition-shadow w-full"
              onClick={() => { setSelectedLesson(lesson.id); setShowForm(true) }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">
                    {format(new Date(lesson.lesson_date), 'yyyy년 MM월 dd일 (EEEE)', { locale: ko })}
                  </p>
                  <div className="flex gap-3 mt-1 text-sm text-gray-500">
                    {lesson.test_total && <span>📝 테스트 {lesson.test_total}문제</span>}
                    {lesson.memo && <span className="truncate max-w-xs">💬 {lesson.memo}</span>}
                  </div>
                </div>
                <span className="text-xs text-primary-500 font-medium">수정 →</span>
              </div>
            </button>
          ))}
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
