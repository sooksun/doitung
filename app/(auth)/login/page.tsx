'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Ensure client-side hydration is complete
  useEffect(() => {
    setMounted(true)
    console.log('[Login] Component mounted, hydration complete')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('[Login] Form submitted with:', formData.email)
    
    if (!formData.email || !formData.password) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน')
      return
    }

    setError('')
    setLoading(true)

    try {
      console.log('[Login] Sending POST request to /api/auth/login')
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      })

      console.log('[Login] Response status:', response.status)
      
      const data = await response.json()
      console.log('[Login] Response data:', data.success ? 'Success' : data.message)

      if (data.success) {
        // Save tokens to localStorage
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        localStorage.setItem('user', JSON.stringify(data.user))
        
        console.log('[Login] Tokens saved, redirecting to dashboard...')

        // Redirect to dashboard (force full page reload)
        window.location.href = '/dashboard'
      } else {
        setError(data.message || 'เข้าสู่ระบบไม่สำเร็จ')
      }
    } catch (err) {
      console.error('[Login] Error:', err)
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setLoading(false)
    }
  }

  // Show loading state until mounted
  if (!mounted) {
    return (
      <div className="card p-8 animate-pulse">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-8 backdrop-blur-lg bg-white/90 dark:bg-dark-card/90 border border-light-border dark:border-dark-border animate-fadeIn">
      {/* Logo and Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 mb-4 shadow-glow-purple">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold gradient-text mb-2">
          เข้าสู่ระบบ
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          EduQuality Assessment Platform
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm animate-fadeIn">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            อีเมล
          </label>
          <input
            type="email"
            id="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
            placeholder="example@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            รหัสผ่าน
          </label>
          <input
            type="password"
            id="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
            placeholder="••••••••"
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center cursor-pointer">
            <input type="checkbox" className="mr-2 rounded text-primary-600 dark:bg-dark-card focus:ring-primary-500" />
            <span className="text-gray-600 dark:text-gray-400">จดจำฉันไว้</span>
          </label>
          <Link href="/forgot-password" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
            ลืมรหัสผ่าน?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              กำลังเข้าสู่ระบบ...
            </span>
          ) : 'เข้าสู่ระบบ'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        ยังไม่มีบัญชี?{' '}
        <Link href="/signup" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors">
          ลงทะเบียนที่นี่
        </Link>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-dark-border">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">บัญชีทดสอบ:</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 bg-gray-50 dark:bg-dark-hover rounded-lg border border-gray-100 dark:border-dark-border">
            <div className="font-medium text-gray-700 dark:text-gray-300">Super Admin</div>
            <div className="text-gray-500 dark:text-gray-400">admin@eqap.local</div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-dark-hover rounded-lg border border-gray-100 dark:border-dark-border">
            <div className="font-medium text-gray-700 dark:text-gray-300">Teacher</div>
            <div className="text-gray-500 dark:text-gray-400">teacher1@eqap.local</div>
          </div>
        </div>
        <div className="mt-3 text-center text-gray-500 dark:text-gray-400 text-xs">
          รหัสผ่าน: <code className="bg-gray-100 dark:bg-dark-hover px-2 py-0.5 rounded">password123</code>
        </div>
      </div>
    </div>
  )
}
