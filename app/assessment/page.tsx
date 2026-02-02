'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Assessment } from '@/lib/types'
import { confirmAction } from '@/lib/toast'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function AssessmentListPage() {
  const router = useRouter()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAssessments()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  const fetchAssessments = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/assessments', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        setAssessments(data.data.assessments)
      } else {
        setError(data.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล')
      }
    } catch (error) {
      console.error('Fetch assessments error:', error)
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      DRAFT: { text: 'ร่าง', class: 'badge-info' },
      IN_PROGRESS: { text: 'กำลังทำ', class: 'badge-warning' },
      SUBMITTED: { text: 'ส่งแล้ว', class: 'badge-success' },
      APPROVED: { text: 'อนุมัติ', class: 'badge-primary' },
      REJECTED: { text: 'ไม่อนุมัติ', class: 'badge-danger' },
    }
    const badge = badges[status as keyof typeof badges] || badges.DRAFT
    return (
      <span className={`badge ${badge.class}`}>
        {badge.text}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="nav-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/dashboard" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm mb-2 inline-block transition-colors">
                ← กลับไปหน้าหลัก
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-glow-purple">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </span>
                แบบประเมินคุณภาพสถานศึกษา
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-13">
                จัดการและดูแบบประเมินทั้งหมด
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                href="/assessment/new"
                className="btn-primary px-4 py-2"
              >
                + สร้างแบบประเมินใหม่
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg animate-fadeIn">
            {error}
          </div>
        )}

        {assessments.length === 0 ? (
          <div className="card p-12 text-center animate-fadeIn">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center mx-auto mb-6 shadow-glow-purple">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              ยังไม่มีแบบประเมิน
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              เริ่มต้นสร้างแบบประเมินใหม่เพื่อประเมินคุณภาพสถานศึกษา
            </p>
            <Link
              href="/assessment/new"
              className="btn-primary inline-block"
            >
              สร้างแบบประเมินแรก
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {assessments.map((assessment, index) => (
              <div
                key={assessment.id}
                className="card p-6 hover:shadow-glow-purple transition-all duration-300 animate-fadeIn"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {assessment.school?.name}
                      </h3>
                      {assessment.createdBy && (
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                          👤 {assessment.createdBy.firstName} {assessment.createdBy.lastName}
                        </span>
                      )}
                      {getStatusBadge(assessment.status)}
                    </div>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <p className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium text-gray-700 dark:text-gray-300">ปีการศึกษา:</span> {assessment.academicYear?.name}
                        {assessment.semester && ` - ${assessment.semester.name}`}
                      </p>
                      <p className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium text-gray-700 dark:text-gray-300">จำนวนคำตอบ:</span> 
                        <span className="gradient-text font-semibold">{assessment.responseCount || 0}</span> / 47 ข้อ
                      </p>
                      <p className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-medium text-gray-700 dark:text-gray-300">สร้างโดย:</span>{' '}
                        {assessment.createdBy
                          ? `${assessment.createdBy.firstName} ${assessment.createdBy.lastName}`
                          : 'ไม่ระบุ'}
                      </p>
                      <p className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium text-gray-700 dark:text-gray-300">วันที่สร้าง:</span>{' '}
                        {new Date(assessment.createdAt).toLocaleDateString('th-TH')}
                      </p>
                      {assessment.submittedAt && (
                        <p className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="font-medium text-gray-700 dark:text-gray-300">วันที่ส่ง:</span>{' '}
                          {new Date(assessment.submittedAt).toLocaleDateString('th-TH')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <Link
                      href={`/assessment/${assessment.id}`}
                      className="btn-primary px-4 py-2 text-sm text-center"
                    >
                      {assessment.status === 'SUBMITTED' ? 'ดูรายละเอียด' : 'ทำต่อ'}
                    </Link>
                    {assessment.status !== 'SUBMITTED' && (
                      <button
                        onClick={async () => {
                          const confirmed = await confirmAction('คุณต้องการลบแบบประเมินนี้หรือไม่?', 'ยืนยันการลบ')
                          if (confirmed) {
                            // TODO: Implement delete
                          }
                        }}
                        className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium text-sm"
                      >
                        ลบ
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
