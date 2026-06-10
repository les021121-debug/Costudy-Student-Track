import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '코스터디 브릿지',
  description: '코스터디 학원 학부모 소통 시스템',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}