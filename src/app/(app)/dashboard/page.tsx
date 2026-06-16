'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { BookOpen, Users, CalendarCheck, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function DashboardPage() {
  const [stats, setStats] = useState({ classes: 0, students: 0 })
  const [teacherName, setTeacherName] = useState('')
  const today = format(new Date(), 'yyyy년 MM월 dd일 (EEEE)', { locale: ko })

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ count: classCount }, { count: studentCount }, { data: teacher }] = await Promise.all([
        supabase.from('classes').select('*', { count: 'exact', head: true }).eq('teacher_id', user.id),
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('teachers').select('name').eq('id', user.id).single(),
      ])

      setStats({ classes: classCount ?? 0, students: studentCount ?? 0 })
      if (teacher) setTeacherName(teacher.name)
    }
    load()
  }, [])

  const cards = [
    { icon: BookOpen, label: '담당 반', value: `${stats.classes}개 반`, href: '/classes', color: 'bg-primary-50 text-primary-600' },
    { icon: Users, label: '전체 학생', value: `${stats.students}명`, href: '/students', color: 'bg-green-50 text-green-600' },
    { icon: CalendarCheck, label: '오늘 수업 기록', value: '수업 일지 작성', href: '/classes', color: 'bg-amber-50 text-amber-600' },
    { icon: MessageSquare, label: '월말 문자', value: '문구 생성하기', href: '/messages', color: 'bg-purple-50 text-purple-600' },
  ]

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm text-gray-400">{today}</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          안녕하세요{teacherName ? `, ${teacherName} 선생님` : ''} 👋
        </h1>
        <p className="text-gray-500 mt-1">오늘도 좋은 수업 되세요!</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(({ icon: Icon, label, value, href, color }) => (
          <Link key={label} href={href}>
            <div className="card hover:shadow-md transition-shadow cursor-pointer">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon size={20} />
              </div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="font-bold text-gray-900 mt-0.5">{value}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
