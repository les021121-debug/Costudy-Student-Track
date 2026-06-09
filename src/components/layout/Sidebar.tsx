'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { LayoutDashboard, Users, BookOpen, MessageSquare, LogOut, Shield, Menu, X, Settings } from 'lucide-react'
import clsx from 'clsx'
import { useEffect, useState } from 'react'

const NAV = [
  { href: '/dashboard',  icon: LayoutDashboard, label: '대시보드' },
  { href: '/classes',    icon: BookOpen,         label: '반 관리' },
  { href: '/students',   icon: Users,            label: '학생 관리' },
  { href: '/messages',   icon: MessageSquare,    label: '월말 문자' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('teachers').select('is_admin').eq('id', user.id).single()
      if (data?.is_admin) setIsAdmin(true)
    }
    check()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/auth/login')
  }

  const NavContent = () => (
    <>
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
            onClick={() => setOpen(false)}
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
        {isAdmin && (
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              pathname.startsWith('/admin')
                ? 'bg-primary-50 text-primary-600'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            )}
          >
            <Shield size={18} />
            관리자
          </Link>
        )}
      </nav>

      <div className="p-3 border-t border-gray-100 space-y-1">
        <Link
          href="/settings"
          onClick={() => setOpen(false)}
          className={clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full',
            pathname.startsWith('/settings')
              ? 'bg-primary-50 text-primary-600'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
          )}
        >
          <Settings size={18} />
          내 설정
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors w-full"
        >
          <LogOut size={18} />
          로그아웃
        </button>
      </div>
    </>
  )

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">코</span>
          </div>
          <span className="font-bold text-gray-900 text-sm">코스터디</span>
        </div>
        <button onClick={() => setOpen(!open)} className="p-2 text-gray-500">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-30" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
            <NavContent />
          </div>
        </div>
      )}

      <aside className="hidden md:flex w-56 min-h-screen bg-white border-r border-gray-100 flex-col">
        <NavContent />
      </aside>
    </>
  )
}
