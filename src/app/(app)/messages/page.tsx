'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { MessageSquare, Copy, Check, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { ATTITUDE_POSITIVE, ATTITUDE_NEGATIVE, HOMEWORK_ITEMS, SCORE_LABELS } from '@/lib/constants'

type Student = { id: string; name: string; parent_phone: string }
type Class = { id: string; name: string; textbook: string; current_progress: string; subject: string }

export default function MessagesPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd'))
  const [msgLength, setMsgLength] = useState(400)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [savedComm, setSavedComm] = useState<string | null>(null)
  const [teacherName, setTeacherName] = useState('')
  const [messageStyle, setMessageStyle] = useState('')
  const [lessonDates, setLessonDates] = useState<string[]>([])
  const [calFromMonth, setCalFromMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [calToMonth, setCalToMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [openCal, setOpenCal] = useState<'from' | 'to' | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: classData }, { data: teacher }] = await Promise.all([
        supabase.from('classes').select('*').eq('teacher_id', user.id),
        supabase.from('teachers').select('name, message_style').eq('id', user.id).single(),
      ])
      if (classData) setClasses(classData)
      if (teacher) {
        setTeacherName(teacher.name)
        setMessageStyle(teacher.message_style || '')
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedClass) return
    const load = async () => {
      const supabase = createClient()
      const [{ data: studentData }, { data: lessonData }] = await Promise.all([
        supabase.from('student_classes').select('students(id, name, parent_phone)').eq('class_id', selectedClass),
        supabase.from('lessons').select('lesson_date').eq('class_id', selectedClass),
      ])
      if (studentData) setStudents((studentData as any[]).map(d => d.students).filter(Boolean))
      if (lessonData) setLessonDates(lessonData.map(l => l.lesson_date))
      setSelectedStudent('')
      setMessage('')
    }
    load()
  }, [selectedClass])

  const selectedStudentInfo = students.find(s => s.id === selectedStudent)

  const generate = async () => {
    if (!selectedStudent || !selectedClass) return
    setGenerating(true)
    setMessage('')

    const supabase = createClient()
    const cls = classes.find(c => c.id === selectedClass)
    const stu = students.find(s => s.id === selectedStudent)

    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, lesson_date, test_total')
      .eq('class_id', selectedClass)
      .gte('lesson_date', dateFrom)
      .lte('lesson_date', dateTo)
      .order('lesson_date')

    if (!lessons?.length) {
      setMessage('해당 기간에 수업 기록이 없습니다.')
      setGenerating(false)
      return
    }

    const lessonIds = lessons.map(l => l.id)
    const { data: recs } = await supabase
      .from('student_records')
      .select('*')
      .eq('student_id', selectedStudent)
      .in('lesson_id', lessonIds)

    const total = recs?.length || 0
    const attendCount: Record<string, number> = {}
    let attitudeScoreSum = 0, attitudeScoreCount = 0
    const positiveCounts: Record<string, number> = {}
    const negativeCounts: Record<string, number> = {}
    const homeworkCounts: Record<string, number> = {}
    const testScores: { correct: number, total: number }[] = []

    recs?.forEach(r => {
      attendCount[r.attendance] = (attendCount[r.attendance] || 0) + 1
      if (r.attitude_score) { attitudeScoreSum += r.attitude_score; attitudeScoreCount++ }
      r.attitude_positive?.forEach((k: string) => positiveCounts[k] = (positiveCounts[k] || 0) + 1)
      r.attitude_negative?.forEach((k: string) => negativeCounts[k] = (negativeCounts[k] || 0) + 1)
      r.homework?.forEach((k: string) => homeworkCounts[k] = (homeworkCounts[k] || 0) + 1)
      const lesson = lessons.find(l => l.id === r.lesson_id)
      if (r.test_correct !== null && lesson?.test_total) {
        testScores.push({ correct: r.test_correct, total: lesson.test_total })
      }
    })

    const avgAttitude = attitudeScoreCount > 0 ? (attitudeScoreSum / attitudeScoreCount).toFixed(1) : null
    const topPositive = Object.entries(positiveCounts).sort((a,b) => b[1]-a[1]).slice(0,3).map(([k]) => ATTITUDE_POSITIVE.find(i => i.key === k)?.label).filter(Boolean)
    const topNegative = Object.entries(negativeCounts).sort((a,b) => b[1]-a[1]).slice(0,3).map(([k]) => ATTITUDE_NEGATIVE.find(i => i.key === k)?.label).filter(Boolean)
    const topHomework = Object.entries(homeworkCounts).sort((a,b) => b[1]-a[1]).slice(0,3).map(([k]) => HOMEWORK_ITEMS.find(i => i.key === k)?.label).filter(Boolean)
    const avgTest = testScores.length > 0
      ? `${(testScores.reduce((s,t) => s + t.correct/t.total*100, 0) / testScores.length).toFixed(1)}%`
      : null

    const absent = (attendCount['결석'] || 0) + (attendCount['병결'] || 0)
    const earlyLeave = attendCount['조퇴'] || 0

    const styleSection = messageStyle
      ? `아래는 이 선생님이 실제로 보낸 문자 예시입니다. 이 톤과 스타일을 최대한 따라주세요:\n\n---예시 시작---\n${messageStyle}\n---예시 끝---\n`
      : `스타일 가이드:
- 딱딱하지 않고 자연스럽고 따뜻한 말투
- AI 같은 느낌 절대 금지 (항목 나열, 번호 매기기, 과도한 존댓말 금지)
- 진도를 구체적으로 설명하되 왜 이렇게 가르치는지 이유도 함께
- 학생 개인에 대한 구체적인 관찰을 담아서
- 선생님 본인의 솔직한 감정도 자연스럽게 표현
- 마무리는 따뜻하고 진심 어리게
- 이모지는 아주 살짝만 (1~2개)`

    const prompt = `당신은 코스터디 수학학원 선생님입니다. 학부모님께 카카오톡으로 보낼 학생 관리 메시지를 작성해주세요.

${styleSection}

공통 가이드:
- AI 같은 느낌 절대 금지 (항목 나열, 번호 매기기 금지)
- 선생님 이름은 반드시 '${teacherName}T' 로 표시 (절대 [선생님 성함] 같은 플레이스홀더 사용 금지)
- 길이는 반드시 ${msgLength}자 내외로 작성 (${msgLength - 50}자 ~ ${msgLength + 50}자)

학생 정보:
- 학생 이름: ${stu?.name}
- 반: ${cls?.name} (${cls?.subject})
- 교재: ${cls?.textbook || '미기재'}
- 현재 진도: ${cls?.current_progress || '미기재'}
- 기간: ${dateFrom} ~ ${dateTo}

수업 기록 (총 ${total}회 수업):
- 출결: 출석 ${attendCount['출석'] || 0}회${absent > 0 ? `, 결석/병결 ${absent}회` : ''}${earlyLeave > 0 ? `, 조퇴 ${earlyLeave}회` : ''}
- 수업 태도 평균 점수: ${avgAttitude ? `${avgAttitude}/5점 (${SCORE_LABELS[Math.round(parseFloat(avgAttitude))]})` : '기록 없음'}
${topPositive.length > 0 ? `- 자주 보인 긍정적 태도: ${topPositive.join(', ')}` : ''}
${topNegative.length > 0 ? `- 자주 보인 부정적 태도: ${topNegative.join(', ')}` : ''}
${topHomework.length > 0 ? `- 과제 수행 특징: ${topHomework.join(', ')}` : ''}
${avgTest ? `- 일일 테스트 평균 정답률: ${avgTest}` : ''}

위 기록을 바탕으로 자연스럽고 따뜻한 학부모 카카오톡 메시지를 작성해주세요.`

    try {
      const res = await fetch('/api/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const data = await res.json()
      setMessage(data.text || '생성에 실패했습니다.')

      const yearMonth = dateFrom.slice(0, 7)
      const { data: existing } = await supabase
        .from('parent_communications')
        .select('id, parent_feedback')
        .eq('student_id', selectedStudent)
        .eq('class_id', selectedClass)
        .eq('year_month', yearMonth)
        .maybeSingle()

      if (existing) {
        setSavedComm(existing.id)
        setFeedback(existing.parent_feedback || '')
      } else {
        setSavedComm(null)
        setFeedback('')
      }
    } catch (e) {
      setMessage('문구 생성 중 오류가 발생했습니다.')
    }
    setGenerating(false)
  }

  const copy = () => {
    navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveFeedback = async () => {
    const supabase = createClient()
    const yearMonth = dateFrom.slice(0, 7)
    if (savedComm) {
      await supabase.from('parent_communications').update({ parent_feedback: feedback, generated_message: message, sent_at: new Date().toISOString() }).eq('id', savedComm)
    } else {
      const { data } = await supabase.from('parent_communications').insert({
        student_id: selectedStudent,
        class_id: selectedClass,
        year_month: yearMonth,
        generated_message: message,
        sent_at: new Date().toISOString(),
        parent_feedback: feedback,
      }).select().single()
      if (data) setSavedComm(data.id)
    }
    alert('저장되었습니다!')
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">학부모 문자</h1>

      <div className="card mb-5">
        {/* 반 / 학생 선택 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">반 선택</label>
            <select className="input" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              <option value="">-- 반 선택 --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">학생 선택</label>
            <select className="input" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} disabled={!selectedClass}>
              <option value="">-- 학생 선택 --</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {selectedStudentInfo?.parent_phone && (
              <p className="text-sm text-gray-500 mt-1.5">📞 {selectedStudentInfo.parent_phone}</p>
            )}
          </div>
        </div>

        {/* 기간 선택 - 드롭다운 달력 */}
        <div className="mb-4">
          <label className="label">기간 선택</label>
          <div className="flex items-center gap-2">
            {([
              { key: 'from' as const, value: dateFrom, setValue: setDateFrom, month: calFromMonth, setMonth: setCalFromMonth },
              { key: 'to' as const, value: dateTo, setValue: setDateTo, month: calToMonth, setMonth: setCalToMonth },
            ]).map(({ key, value, setValue, month, setMonth }, idx) => {
              const isOpen = openCal === key
              const year = month.getFullYear()
              const mon = month.getMonth()
              const firstDay = new Date(year, mon, 1).getDay()
              const daysInMonth = new Date(year, mon + 1, 0).getDate()
              const weeks: (number | null)[][] = []
              let day = 1 - firstDay
              while (day <= daysInMonth) {
                const week = []
                for (let i = 0; i < 7; i++, day++) week.push(day >= 1 && day <= daysInMonth ? day : null)
                weeks.push(week)
              }
              return (
                <div key={key} className="relative flex-1">
                  <button
                    type="button"
                    className="input w-full text-left text-sm"
                    onClick={() => setOpenCal(isOpen ? null : key)}
                  >
                    {value}
                  </button>
                  {isOpen && (
                    <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-64">
                      <div className="flex items-center justify-between mb-2">
                        <button onClick={() => setMonth(new Date(year, mon - 1, 1))} className="p-1 text-gray-400 hover:text-gray-700 text-sm">◀</button>
                        <span className="text-sm font-semibold text-gray-800">{year}년 {mon + 1}월</span>
                        <button onClick={() => setMonth(new Date(year, mon + 1, 1))} className="p-1 text-gray-400 hover:text-gray-700 text-sm">▶</button>
                      </div>
                      <div className="grid grid-cols-7 text-center mb-1">
                        {['일','월','화','수','목','금','토'].map(d => (
                          <span key={d} className="text-xs text-gray-400 font-medium py-0.5">{d}</span>
                        ))}
                      </div>
                      {weeks.map((week, wi) => (
                        <div key={wi} className="grid grid-cols-7 text-center">
                          {week.map((d, di) => {
                            if (!d) return <span key={di} />
                            const dateStr = `${year}-${String(mon + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                            const hasLesson = lessonDates.includes(dateStr)
                            const isSelected = value === dateStr
                            const inRange = dateStr >= dateFrom && dateStr <= dateTo
                            return (
                              <button
                                key={di}
                                onClick={() => { setValue(dateStr); setOpenCal(null) }}
                                className={`relative text-xs py-1 rounded-lg transition-colors font-medium
                                  ${isSelected ? 'bg-primary-500 text-white' : inRange ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-100'}
                                `}
                              >
                                {d}
                                {hasLesson && !isSelected && (
                                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-400" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      ))}
                      {selectedClass && lessonDates.length > 0 && (
                        <p className="text-xs text-gray-400 mt-2">● 수업 기록 있는 날짜</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            <span className="text-gray-400 text-sm flex-shrink-0">~</span>
          </div>
        </div>

        {/* 문자 길이 슬라이더 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">문자 길이</label>
            <span className="text-sm font-medium text-primary-600">{msgLength}자</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">짧게</span>
            <input
              type="range"
              min={200}
              max={800}
              step={50}
              value={msgLength}
              onChange={e => setMsgLength(Number(e.target.value))}
              className="flex-1 accent-primary-500"
            />
            <span className="text-xs text-gray-400">길게</span>
          </div>
        </div>

        <button
          className="btn-primary flex items-center gap-2"
          onClick={generate}
          disabled={!selectedStudent || generating}
        >
          {generating ? <><RefreshCw size={16} className="animate-spin" /> 생성 중...</> : <><MessageSquare size={16} /> 문구 자동 생성</>}
        </button>
      </div>

      {message && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">생성된 문구</h3>
            <div className="flex gap-2">
              <button onClick={generate} className="btn-secondary flex items-center gap-1 text-sm py-1.5">
                <RefreshCw size={14} /> 재생성
              </button>
              <button onClick={copy} className="btn-primary flex items-center gap-1 text-sm py-1.5">
                {copied ? <><Check size={14} /> 복사됨!</> : <><Copy size={14} /> 복사</>}
              </button>
            </div>
          </div>
          <textarea
            className="input text-sm leading-relaxed"
            rows={12}
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </div>
      )}

      {message && (
        <div className="card">
          <h3 className="font-bold text-gray-900 mb-3">학부모 피드백 / 요청사항 기록</h3>
          <textarea
            className="input"
            rows={4}
            placeholder="문자 발송 후 학부모님 답장 내용, 요청사항 등을 기록해두세요..."
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
          />
          <button className="btn-primary mt-3" onClick={saveFeedback}>기록 저장</button>
        </div>
      )}
    </div>
  )
}