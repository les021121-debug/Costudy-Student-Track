'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { LayoutDashboard, Users, BookOpen, MessageSquare, LogOut } from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { href: '/dashboard',         icon: LayoutDashboard, label: '대시보드' },
  { href: '/classes',           icon: BookOpen,        label: '반 관리' },
  { href: '/students',          icon: Users,           label: '학생 관리' },
  { href: '/messages',          icon: MessageSquare,   label: '월말 문자' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/auth/login')
  }

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-sm font-bold">코</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">코스터디</p>
            <p className="text-xs text-gray-400">학생관리 시스템</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-primary-50 text-primary-600'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors w-full"
        >
          <LogOut size={18} />
          로그아웃
        </button>
      </div>
    </aside>
  )
}
