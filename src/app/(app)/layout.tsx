import Sidebar from '@/components/layout/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto mt-14 md:mt-0">
        {children}
      </main>
    </div>
  )
}
