'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { MessageSquare, Copy, Check, RefreshCw, ChevronDown } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ATTITUDE_POSITIVE, ATTITUDE_NEGATIVE, HOMEWORK_ITEMS, SCORE_LABELS } from '@/lib/constants'

type Student = { id: string; name: string; parent_phone: string }
type Class = { id: string; name: string; textbook: string; current_progress: string; subject: string }

export default function MessagesPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [yearMonth, setYearMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [savedComm, setSavedComm] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('classes').select('*').eq('teacher_id', user.id)
      if (data) setClasses(data)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedClass) return
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('student_classes').select('students(id, name, parent_phone)').eq('class_id', selectedClass)
      if (data) setStudents((data as any[]).map(d => d.students).filter(Boolean))
      setSelectedStudent('')
      setMessage('')
    }
    load()
  }, [selectedClass])

  const generate = async () => {
    if (!selectedStudent || !selectedClass) return
    setGenerating(true)
    setMessage('')

    const supabase = createClient()
    const cls = classes.find(c => c.id === selectedClass)
    const stu = students.find(s => s.id === selectedStudent)

    // 해당 월의 수업 기록 가져오기
    const monthStart = format(startOfMonth(new Date(yearMonth + '-01')), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(new Date(yearMonth + '-01')), 'yyyy-MM-dd')

    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, lesson_date, test_total')
      .eq('class_id', selectedClass)
      .gte('lesson_date', monthStart)
      .lte('lesson_date', monthEnd)
      .order('lesson_date')

    if (!lessons?.length) {
      setMessage('해당 월에 수업 기록이 없습니다.')
      setGenerating(false)
      return
    }

    const lessonIds = lessons.map(l => l.id)
    const { data: recs } = await supabase
      .from('student_records')
      .select('*')
      .eq('student_id', selectedStudent)
      .in('lesson_id', lessonIds)

    // 통계 계산
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

    const prompt = `당신은 수학학원 선생님입니다. 학부모님께 보낼 월별 학생 관리 메시지를 작성해주세요.

톤 가이드: F(감성/공감) 70% + T(논리/팩트) 30% 비율. 잘하는 부분은 충분히 칭찬하고, 부족한 부분은 따끔하지만 학생을 아끼는 마음이 느껴지게 솔직하게 말해주세요. 절대 학생을 싫어해서가 아니라 발전을 바라기 때문이라는 뉘앙스가 전달되어야 합니다. 

학생 정보:
- 학생 이름: ${stu?.name}
- 반: ${cls?.name} (${cls?.subject})
- 교재: ${cls?.textbook || '미기재'}
- 현재 진도: ${cls?.current_progress || '미기재'}
- 기준 월: ${yearMonth}

이번 달 수업 기록 (총 ${total}회 수업):
- 출결: 출석 ${attendCount['출석'] || 0}회${absent > 0 ? `, 결석/병결 ${absent}회` : ''}${earlyLeave > 0 ? `, 조퇴 ${earlyLeave}회` : ''}
- 수업 태도 평균 점수: ${avgAttitude ? `${avgAttitude}/5점 (${SCORE_LABELS[Math.round(parseFloat(avgAttitude))]})` : '기록 없음'}
${topPositive.length > 0 ? `- 자주 보인 긍정적 태도: ${topPositive.join(', ')}` : ''}
${topNegative.length > 0 ? `- 자주 보인 부정적 태도: ${topNegative.join(', ')}` : ''}
${topHomework.length > 0 ? `- 과제 수행 특징: ${topHomework.join(', ')}` : ''}
${avgTest ? `- 일일 테스트 평균 정답률: ${avgTest}` : ''}

요구사항:
1. 학부모님께 카카오톡으로 보낼 문자 형식
2. 인사말로 시작
3. 이번 달 수업 진도 언급
4. 학생의 태도/과제/테스트 결과를 자연스럽게 녹여서
5. 잘한 점은 구체적으로 칭찬
6. 부족한 점은 직접적이지만 따뜻하게
7. 마무리 인사
8. 총 길이 300-400자 내외
9. 이모지 적절히 사용
10. 선생님 이름 자리는 [선생님 성함] 으로 표시`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await res.json()
      const text = data.content?.map((b: any) => b.text || '').join('')
      setMessage(text || '생성에 실패했습니다.')

      // 기존 기록 확인
      const { data: existing } = await supabase
        .from('parent_communications')
        .select('id, parent_feedback')
        .eq('student_id', selectedStudent)
        .eq('class_id', selectedClass)
        .eq('year_month', yearMonth)
        .single()

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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">월말 학부모 문자</h1>

      <div className="card mb-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">기준 월</label>
            <input className="input" type="month" value={yearMonth} onChange={e => setYearMonth(e.target.value)} />
          </div>
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
          </div>
        </div>

        <button
          className="btn-primary mt-4 flex items-center gap-2"
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
