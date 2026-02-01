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
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center">
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary-700 mb-2">
          เข้าสู่ระบบ
        </h1>
        <p className="text-gray-600">
          EduQuality Assessment Platform
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            อีเมล
          </label>
          <input
            type="email"
            id="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
            placeholder="example@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            รหัสผ่าน
          </label>
          <input
            type="password"
            id="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
            placeholder="••••••••"
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center">
            <input type="checkbox" className="mr-2 rounded text-primary-600" />
            <span className="text-gray-600">จดจำฉันไว้</span>
          </label>
          <Link href="/forgot-password" className="text-primary-600 hover:text-primary-700">
            ลืมรหัสผ่าน?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        ยังไม่มีบัญชี?{' '}
        <Link href="/signup" className="text-primary-600 hover:text-primary-700 font-medium">
          ลงทะเบียนที่นี่
        </Link>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">บัญชีทดสอบ:</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-gray-50 rounded">
            <div className="font-medium text-gray-700">Super Admin</div>
            <div className="text-gray-600">admin@eqap.local</div>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <div className="font-medium text-gray-700">Teacher</div>
            <div className="text-gray-600">teacher1@eqap.local</div>
          </div>
        </div>
        <div className="mt-2 text-center text-gray-500">รหัสผ่าน: password123</div>
      </div>
    </div>
  )
}
