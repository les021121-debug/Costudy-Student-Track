'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import { ATTITUDE_POSITIVE, ATTITUDE_NEGATIVE, HOMEWORK_ITEMS, ATTENDANCE_OPTIONS, SCORE_LABELS } from '@/lib/constants'

type Student = { id: string; name: string }

type StudentRecord = {
  attendance: string
  attitude_positive: string[]
  attitude_negative: string[]
  attitude_score: number
  homework: string[]
  test_correct: string
  special_note: string
}

const defaultRecord = (): StudentRecord => ({
  attendance: '출석',
  attitude_positive: [],
  attitude_negative: [],
  attitude_score: 3,
  homework: [],
  test_correct: '',
  special_note: '',
})

export default function LessonForm({
  classId, students, lessonId, onClose, onSaved
}: {
  classId: string
  students: Student[]
  lessonId: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [memo, setMemo] = useState('')
  const [testTotal, setTestTotal] = useState('')
  const [records, setRecords] = useState<Record<string, StudentRecord>>({})
  const [expanded, setExpanded] = useState<string | null>(students[0]?.id || null)
  const [saving, setSaving] = useState(false)
  const [loadedLessonId, setLoadedLessonId] = useState<string | null>(null)

  useEffect(() => {
    // init default records
    const init: Record<string, StudentRecord> = {}
    students.forEach(s => { init[s.id] = defaultRecord() })
    setRecords(init)

    if (lessonId) loadLesson(lessonId, init)
    else setLoadedLessonId(null)
  }, [lessonId, students])

  const loadLesson = async (lid: string, init: Record<string, StudentRecord>) => {
    const supabase = createClient()
    const [{ data: lesson }, { data: recs }] = await Promise.all([
      supabase.from('lessons').select('*').eq('id', lid).single(),
      supabase.from('student_records').select('*').eq('lesson_id', lid),
    ])
    if (lesson) {
      setDate(lesson.lesson_date)
      setMemo(lesson.memo || '')
      setTestTotal(lesson.test_total?.toString() || '')
      setLoadedLessonId(lid)
    }
    if (recs) {
      const updated = { ...init }
      recs.forEach(r => {
        updated[r.student_id] = {
          attendance: r.attendance,
          attitude_positive: r.attitude_positive || [],
          attitude_negative: r.attitude_negative || [],
          attitude_score: r.attitude_score || 3,
          homework: r.homework || [],
          test_correct: r.test_correct?.toString() || '',
          special_note: r.special_note || '',
        }
      })
      setRecords(updated)
    }
  }

  const toggle = (studentId: string, field: 'attitude_positive' | 'attitude_negative' | 'homework', key: string) => {
    setRecords(prev => {
      const rec = { ...prev[studentId] }
      const arr = rec[field]
      rec[field] = arr.includes(key) ? arr.filter(k => k !== key) : [...arr, key]
      return { ...prev, [studentId]: rec }
    })
  }

  const update = (studentId: string, field: keyof StudentRecord, value: any) => {
    setRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }))
  }

  const save = async () => {
    setSaving(true)
    const supabase = createClient()

    let lid = loadedLessonId
    if (!lid) {
      const { data } = await supabase.from('lessons').upsert({
        class_id: classId,
        lesson_date: date,
        memo,
        test_total: testTotal ? parseInt(testTotal) : null,
      }, { onConflict: 'class_id,lesson_date' }).select().single()
      lid = data?.id
    } else {
      await supabase.from('lessons').update({ memo, test_total: testTotal ? parseInt(testTotal) : null }).eq('id', lid)
    }

    if (!lid) { setSaving(false); return }

    const upserts = students.map(s => ({
      lesson_id: lid!,
      student_id: s.id,
      attendance: records[s.id]?.attendance || '출석',
      attitude_positive: records[s.id]?.attitude_positive || [],
      attitude_negative: records[s.id]?.attitude_negative || [],
      attitude_score: records[s.id]?.attitude_score || 3,
      homework: records[s.id]?.homework || [],
      test_correct: records[s.id]?.test_correct ? parseInt(records[s.id].test_correct) : null,
      special_note: records[s.id]?.special_note || null,
    }))

    await supabase.from('student_records').upsert(upserts, { onConflict: 'lesson_id,student_id' })
    setSaving(false)
    onSaved()
  }

  // 반 평균 계산
  const avg = (() => {
    const vals = students.map(s => records[s.id]?.test_correct).filter(v => v !== '' && v !== undefined).map(Number).filter(n => !isNaN(n))
    if (!vals.length || !testTotal) return null
    const total = parseInt(testTotal)
    if (!total) return null
    const avgScore = vals.reduce((a, b) => a + b, 0) / vals.length
    return `${avgScore.toFixed(1)}/${total} (${Math.round(avgScore / total * 100)}%)`
  })()

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-lg">{lessonId ? '수업 기록 수정' : '수업 기록 추가'}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* 날짜 + 테스트 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">수업 날짜</label>
              <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} disabled={!!lessonId} />
            </div>
            <div>
              <label className="label">일일테스트 총 문항 수 (없으면 비워두세요)</label>
              <input className="input" type="number" placeholder="예: 20" value={testTotal} onChange={e => setTestTotal(e.target.value)} />
            </div>
          </div>

          {testTotal && avg && (
            <div className="bg-blue-50 rounded-lg px-4 py-2 text-sm text-blue-700 font-medium">
              📊 반 평균: {avg}
            </div>
          )}

          <div>
            <label className="label">수업 전체 메모</label>
            <textarea className="input" rows={2} placeholder="오늘 수업 전반 내용 메모" value={memo} onChange={e => setMemo(e.target.value)} />
          </div>

          {/* 학생별 기록 */}
          <div>
            <p className="label mb-3">학생별 기록</p>
            <div className="space-y-2">
              {students.map(student => {
                const rec = records[student.id] || defaultRecord()
                const isOpen = expanded === student.id

                return (
                  <div key={student.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* 학생 헤더 */}
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      onClick={() => setExpanded(isOpen ? null : student.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900">{student.name}</span>
                        <span className={`badge text-xs ${
                          rec.attendance === '출석' ? 'bg-green-50 text-green-600' :
                          rec.attendance === '결석' ? 'bg-red-50 text-red-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>{rec.attendance}</span>
                        {testTotal && rec.test_correct && (
                          <span className="text-xs text-gray-500">{rec.test_correct}/{testTotal}</span>
                        )}
                      </div>
                      {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </button>

                    {isOpen && (
                      <div className="p-4 space-y-4">
                        {/* 출결 */}
                        <div>
                          <label className="label">출결</label>
                          <div className="flex gap-2 flex-wrap">
                            {ATTENDANCE_OPTIONS.map(opt => (
                              <button
                                key={opt}
                                onClick={() => update(student.id, 'attendance', opt)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                  rec.attendance === opt
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 수업 태도 긍정 */}
                        <div>
                          <label className="label text-green-700">✅ 긍정 태도</label>
                          <div className="flex flex-wrap gap-2">
                            {ATTITUDE_POSITIVE.map(item => (
                              <button
                                key={item.key}
                                onClick={() => toggle(student.id, 'attitude_positive', item.key)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                  rec.attitude_positive.includes(item.key)
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 수업 태도 부정 */}
                        <div>
                          <label className="label text-red-600">⚠️ 부정 태도</label>
                          <div className="flex flex-wrap gap-2">
                            {ATTITUDE_NEGATIVE.map(item => (
                              <button
                                key={item.key}
                                onClick={() => toggle(student.id, 'attitude_negative', item.key)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                  rec.attitude_negative.includes(item.key)
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 수업 전반 점수 */}
                        <div>
                          <label className="label">수업 전반 점수: {rec.attitude_score}점 ({SCORE_LABELS[rec.attitude_score]})</label>
                          <div className="flex gap-2">
                            {[1,2,3,4,5].map(n => (
                              <button
                                key={n}
                                onClick={() => update(student.id, 'attitude_score', n)}
                                className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${
                                  rec.attitude_score === n
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 과제 */}
                        <div>
                          <label className="label">📋 과제 수행</label>
                          <div className="flex flex-wrap gap-2">
                            {HOMEWORK_ITEMS.map(item => (
                              <button
                                key={item.key}
                                onClick={() => toggle(student.id, 'homework', item.key)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                  rec.homework.includes(item.key)
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 테스트 */}
                        {testTotal && (
                          <div>
                            <label className="label">📝 테스트 맞은 개수 (/{testTotal})</label>
                            <input
                              className="input w-32"
                              type="number"
                              min={0}
                              max={parseInt(testTotal)}
                              placeholder="맞은 개수"
                              value={rec.test_correct}
                              onChange={e => update(student.id, 'test_correct', e.target.value)}
                            />
                          </div>
                        )}

                        {/* 특이사항 */}
                        <div>
                          <label className="label">💬 특이사항</label>
                          <textarea
                            className="input"
                            rows={2}
                            placeholder="병결 사유, 상담 내용, 기타 메모..."
                            value={rec.special_note}
                            onChange={e => update(student.id, 'special_note', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-5 border-t border-gray-100">
          <button className="btn-secondary flex-1" onClick={onClose}>취소</button>
          <button className="btn-primary flex-1" onClick={save} disabled={saving}>
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
