'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { showError } from '@/lib/toast'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<{ firstName: string; lastName: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    verifyAdmin()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  const verifyAdmin = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()

      if (data.success) {
        // Check if user has admin role
        if (!['SUPER_ADMIN', 'OFFICE_ADMIN'].includes(data.data.role)) {
          showError('คุณไม่มีสิทธิ์เข้าถึงหน้านี้')
          router.push('/dashboard')
          return
        }
        setUser(data.data)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Verify admin error:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      // ignore
    }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    window.location.href = '/login' // hard redirect ล้าง cache/state
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <header className="nav-header bg-white dark:bg-dark-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">⚙️ Admin Panel</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {user?.firstName} {user?.lastName} ({user?.role})
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300 rounded-lg hover:bg-secondary-200 dark:hover:bg-secondary-800/50 transition-colors font-medium"
              >
                📊 Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="btn-ghost px-4 py-2"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto py-4">
            <Link
              href="/admin"
              className="nav-link whitespace-nowrap px-3 py-2 text-sm font-medium"
            >
              หน้าหลัก
            </Link>
            <Link
              href="/admin/users"
              className="nav-link whitespace-nowrap px-3 py-2 text-sm font-medium"
            >
              จัดการผู้ใช้
            </Link>
            <Link
              href="/admin/schools"
              className="nav-link whitespace-nowrap px-3 py-2 text-sm font-medium"
            >
              จัดการโรงเรียน
            </Link>
            <Link
              href="/admin/structure"
              className="nav-link whitespace-nowrap px-3 py-2 text-sm font-medium"
            >
              โครงสร้าง (เขต/เครือข่าย)
            </Link>
            <Link
              href="/admin/indicators"
              className="nav-link whitespace-nowrap px-3 py-2 text-sm font-medium"
            >
              จัดการตัวชี้วัด
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
