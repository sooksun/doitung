'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Assessment } from '@/lib/types'
import { confirmAction } from '@/lib/toast'

export default function AssessmentListPage() {
  const router = useRouter()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAssessments()
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
      DRAFT: { text: 'ร่าง', color: 'bg-gray-100 text-gray-700' },
      IN_PROGRESS: { text: 'กำลังทำ', color: 'bg-blue-100 text-blue-700' },
      SUBMITTED: { text: 'ส่งแล้ว', color: 'bg-green-100 text-green-700' },
      APPROVED: { text: 'อนุมัติ', color: 'bg-purple-100 text-purple-700' },
      REJECTED: { text: 'ไม่อนุมัติ', color: 'bg-red-100 text-red-700' },
    }
    const badge = badges[status as keyof typeof badges] || badges.DRAFT
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    )
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
              <Link href="/dashboard" className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-block">
                ← กลับไปหน้าหลัก
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                แบบประเมินคุณภาพสถานศึกษา
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                จัดการและดูแบบประเมินทั้งหมด
              </p>
            </div>
            <Link
              href="/assessment/new"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              + สร้างแบบประเมินใหม่
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {assessments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              ยังไม่มีแบบประเมิน
            </h3>
            <p className="text-gray-600 mb-6">
              เริ่มต้นสร้างแบบประเมินใหม่เพื่อประเมินคุณภาพสถานศึกษา
            </p>
            <Link
              href="/assessment/new"
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              สร้างแบบประเมินแรก
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {assessments.map((assessment: any) => (
              <div
                key={assessment.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {assessment.school?.name}
                      </h3>
                      {getStatusBadge(assessment.status)}
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">ปีการศึกษา:</span> {assessment.academicYear?.name}
                        {assessment.semester && ` - ${assessment.semester.name}`}
                      </p>
                      <p>
                        <span className="font-medium">จำนวนคำตอบ:</span> {assessment.responseCount || 0} / 47 ข้อ
                      </p>
                      <p>
                        <span className="font-medium">สร้างโดย:</span>{' '}
                        {assessment.createdBy
                          ? `${assessment.createdBy.firstName} ${assessment.createdBy.lastName}`
                          : 'ไม่ระบุ'}
                      </p>
                      <p>
                        <span className="font-medium">วันที่สร้าง:</span>{' '}
                        {new Date(assessment.createdAt).toLocaleDateString('th-TH')}
                      </p>
                      {assessment.submittedAt && (
                        <p>
                          <span className="font-medium">วันที่ส่ง:</span>{' '}
                          {new Date(assessment.submittedAt).toLocaleDateString('th-TH')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <Link
                      href={`/assessment/${assessment.id}`}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm text-center"
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
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium text-sm"
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
