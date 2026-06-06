import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '코스터디 학생관리',
  description: '코스터디 수학학원 학생관리 시스템',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
