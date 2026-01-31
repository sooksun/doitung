'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { showError } from '@/lib/toast'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    verifyAdmin()
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

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">⚙️ Admin Panel</h1>
              <p className="text-sm text-gray-600 mt-1">
                {user?.firstName} {user?.lastName} ({user?.role})
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 transition-colors font-medium"
              >
                📊 Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto py-4">
            <Link
              href="/admin"
              className="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 hover:border-b-2 hover:border-primary-600"
            >
              หน้าหลัก
            </Link>
            <Link
              href="/admin/users"
              className="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 hover:border-b-2 hover:border-primary-600"
            >
              จัดการผู้ใช้
            </Link>
            <Link
              href="/admin/schools"
              className="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 hover:border-b-2 hover:border-primary-600"
            >
              จัดการโรงเรียน
            </Link>
            <Link
              href="/admin/structure"
              className="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 hover:border-b-2 hover:border-primary-600"
            >
              โครงสร้าง (เขต/เครือข่าย)
            </Link>
            <Link
              href="/admin/indicators"
              className="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 hover:border-b-2 hover:border-primary-600"
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
