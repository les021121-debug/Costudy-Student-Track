'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { MessageSquare, Copy, Check, RefreshCw } from 'lucide-react'
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

    const prompt = `당신은 코스터디 수학학원 선생님입니다. 학부모님께 카카오톡으로 보낼 월별 학생 관리 메시지를 작성해주세요.

아래는 실제 이 선생님이 보낸 문자 예시입니다. 이 톤과 스타일을 최대한 따라주세요:

---예시 시작---
안녕하세요 서진이 대수 st1 담당 코스터디 은서T 입니다.

현재 진도는 3단원 수열의 합까지 나갔고 개념원리 필수 문항과 유제는 다 풀고 연습문제는 st1정도만 풀고 있습니다. st1이다 보니 난이도 있는 문제를 푸는 것이 아닌 이 개념이 무엇인지 확실히 하는 게 목표입니다.

서진이는 제가 본 학생들 중에 제일 열심히하고 잘 따라오는 학생이어서 제 최애 학생들 중 하나입니다. 서진이랑 오래도록 공부하고 싶은 마음도 커서 더 많은 걸 알려주려고 저도 열심히 공부하게 되는 것 같습니다.

학생들을 가르치는 입장에서 친구들과 열심히 풀어보려는 고민을 하는 모습에 감동받고 좋기도 하다가 피곤해도 와서 공부하고 쏟아지는 졸음을 참으려 안간힘을 쓰는 모습을 보면 좀 안쓰럽기도 합니다. 그럼에도 불구하고 저는 테스트를 지게 하고 숙제를 주는 게 학생들에게 많이 미안하기도 하고 저에게도 이게 맞는 지 수십번 질문을 던지지만 답은 결국 우리 학생들의 미래를 위해서 해야한다 가 되더라구요. 지금까지 믿어주신 만큼 최선을 다해서 우리 학생들 잘 올려보내겠습니다! 감사합니다~
---예시 끝---

스타일 가이드:
- 딱딱하지 않고 자연스럽고 따뜻한 말투
- AI 같은 느낌 절대 금지 (항목 나열, 번호 매기기, 과도한 존댓말 금지)
- 진도를 구체적으로 설명하되 왜 이렇게 가르치는지 이유도 함께
- 학생 개인에 대한 구체적인 관찰을 담아서 (기록된 태도/과제 항목 활용)
- 선생님 본인의 솔직한 감정도 자연스럽게 표현
- 부족한 점은 학생 편에서 안타까워하면서도 따끔하게
- 마무리는 따뜻하고 진심 어리게
- 이모지는 아주 살짝만 (1~2개)
- 귀엽고 인간적인 느낌
- 길이는 400~600자 내외
- 선생님 이름 자리는 [선생님 성함]T 로 표시

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

위 기록을 바탕으로 예시 문자처럼 자연스럽고 따뜻한 학부모 카카오톡 메시지를 작성해주세요. 절대 AI가 쓴 것처럼 느껴지면 안 됩니다.`

    try {
      const res = await fetch('/api/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const data = await res.json()
      setMessage(data.text || '생성에 실패했습니다.')

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
