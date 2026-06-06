'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

interface ParsedStudent {
  name: string
  school: string
  parent_phone: string
  student_phone: string
  status: string
}

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export default function StudentImportModal({ onClose, onSuccess }: Props) {
  const [parsed, setParsed] = useState<ParsedStudent[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 })

        const students: ParsedStudent[] = rows
          .filter((r) => r[0]) // 이름 없는 행 제외
          .map((r) => {
            const school = String(r[1] ?? '').trim()
            const grade = String(r[2] ?? '').trim()
            // "사직여고" + "고3" → "사직여고3", "여명중" + "중2" → "여명중2"
            const gradeNum = grade.replace(/[^0-9]/g, '')
            return {
              name: String(r[0] ?? '').trim(),
              school: school + gradeNum,
              parent_phone: String(r[3] ?? '').trim(),
              student_phone: String(r[4] ?? '').trim(),
              status: 'active',
            }
          })

        if (students.length === 0) {
          setError('학생 데이터를 찾을 수 없습니다.')
          return
        }

        setParsed(students)
        setStep('preview')
      } catch {
        setError('파일을 읽는 중 오류가 발생했습니다.')
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleImport = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/import-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: parsed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      alert(`${data.count}명 등록 완료!`)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-gray-900">엑셀로 학생 일괄 등록</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
                <p className="font-semibold mb-2">📋 엑셀 파일 형식</p>
                <div className="mt-2 bg-white rounded-lg overflow-hidden border border-blue-200">
                  <table className="w-full text-center text-xs">
                    <thead className="bg-blue-100">
                      <tr>
                        <th className="py-2 px-2">A: 이름</th>
                        <th className="py-2 px-2">B: 학교</th>
                        <th className="py-2 px-2">C: 학년</th>
                        <th className="py-2 px-2">D: 학부모연락처</th>
                        <th className="py-2 px-2">E: 학생연락처</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-blue-100">
                        <td className="py-2 px-2 text-gray-600">홍길동</td>
                        <td className="py-2 px-2 text-gray-600">여명중</td>
                        <td className="py-2 px-2 text-gray-600">중2</td>
                        <td className="py-2 px-2 text-gray-600">010-1234-5678</td>
                        <td className="py-2 px-2 text-gray-600">010-9999-0000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <p className="text-4xl mb-3">📂</p>
                <p className="text-gray-600 font-medium">클릭해서 파일 선택</p>
                <p className="text-gray-400 text-sm mt-1">.xlsx, .xls 지원</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFile}
                />
              </div>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  총 <span className="font-bold text-blue-600">{parsed.length}명</span> 등록 예정
                </p>
                <button
                  onClick={() => { setStep('upload'); setParsed([]); setError('') }}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  다시 선택
                </button>
              </div>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-4 text-left text-gray-600 font-medium">이름</th>
                      <th className="py-3 px-4 text-left text-gray-600 font-medium">학교/학년</th>
                      <th className="py-3 px-4 text-left text-gray-600 font-medium">학부모연락처</th>
                      <th className="py-3 px-4 text-left text-gray-600 font-medium">학생연락처</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((s, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{s.name}</td>
                        <td className="py-3 px-4 text-gray-600">{s.school}</td>
                        <td className="py-3 px-4 text-gray-600">{s.parent_phone || '-'}</td>
                        <td className="py-3 px-4 text-gray-600">{s.student_phone || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          )}
        </div>

        {step === 'preview' && (
          <div className="p-6 border-t flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 font-medium hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleImport}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '등록 중...' : `${parsed.length}명 등록하기`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}