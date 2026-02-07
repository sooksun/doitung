'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'

const deMenuItems = [
  { href: '/de', label: 'DE Hub', icon: '🏠' },
  { href: '/de/canvas', label: 'DE Canvas', icon: '🎯' },
  { href: '/de/plc', label: 'PLC Sessions', icon: '👥' },
  { href: '/de/learning', label: 'Learning Timeline', icon: '📚' },
  { href: '/de/students', label: 'Student Signals', icon: '🧒' },
  { href: '/de/experiments', label: 'Experiments', icon: '🔬' },
  { href: '/de/reflection', label: 'Monthly Reflection', icon: '🪞' },
]

export default function DELayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<{ firstName?: string; lastName?: string; role?: string } | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    document.cookie = 'accessToken=; path=/; max-age=0'
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Nav */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                Dashboard
              </Link>
              <span className="text-gray-300 dark:text-gray-600">/</span>
              <span className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                DE - การประเมินเพื่อการพัฒนา
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              {user && (
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {user.firstName} {user.lastName}
                </span>
              )}
              <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700">
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* DE Submenu Tabs */}
        <div className="flex flex-wrap gap-1 mb-6 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-gray-700">
          {deMenuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-700'
                }`}
              >
                <span>{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Page Content */}
        {children}
      </div>
    </div>
  )
}
