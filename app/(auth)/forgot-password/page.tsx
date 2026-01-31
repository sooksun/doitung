'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // TODO: Implement forgot password API
      // For now, just show success message
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSuccess(true)
    } catch (error) {
      console.error('Forgot password error:', error)
      setError('เกิดข้อผิดพลาดในการส่งอีเมล')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ส่งอีเมลสำเร็จ
          </h2>
          <p className="text-gray-600 mb-6">
            เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมล <strong>{email}</strong> แล้ว
          </p>
          <p className="text-sm text-gray-500 mb-8">
            กรุณาตรวจสอบอีเมลของคุณและทำตามขั้นตอนเพื่อรีเซ็ตรหัสผ่าน
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary-700 mb-2">
          ลืมรหัสผ่าน
        </h1>
        <p className="text-gray-600">
          กรอกอีเมลของคุณเพื่อรีเซ็ตรหัสผ่าน
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="example@email.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'กำลังส่งอีเมล...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
          ← กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>หมายเหตุ:</strong> ฟีเจอร์รีเซ็ตรหัสผ่านยังอยู่ระหว่างการพัฒนา 
          กรุณาติดต่อผู้ดูแลระบบหากต้องการรีเซ็ตรหัสผ่าน
        </p>
      </div>
    </div>
  )
}
