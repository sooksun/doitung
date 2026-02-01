'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAutoSave } from '@/hooks/useAutoSave'
import GroupRatingTable from '@/components/assessment/GroupRatingTable'
import ProgressBar from '@/components/assessment/ProgressBar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Assessment, AssessmentResponseInput } from '@/lib/types'
import { showSuccess, showError, confirmAction } from '@/lib/toast'

export default function AssessmentFormPage() {
  const router = useRouter()
  const params = useParams()
  const assessmentId = params.id as string
  
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [indicators, setIndicators] = useState<{ id: string; code?: string; name: string; nameEn?: string; indicators: { id: string; code: string; title: string; orderNo: number }[] }[]>([])
  const [responses, setResponses] = useState<Map<string, AssessmentResponseInput>>(new Map())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string | 'all'>('all')

  // Auto-save hook (save is called internally by the hook)
  useAutoSave({
    assessmentId: assessmentId,
    responses: Array.from(responses.values()),
    onSave: (success) => {
      setAutoSaveStatus(success ? 'saved' : 'error')
      setTimeout(() => setAutoSaveStatus(null), 3000)
    },
    enabled: assessment?.status !== 'SUBMITTED',
  })

  useEffect(() => {
    if (assessmentId) {
      fetchAssessmentAndIndicators()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch on assessmentId only
  }, [assessmentId])

  const fetchAssessmentAndIndicators = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        router.push('/login')
        return
      }

      // Fetch assessment details
      const assessmentResponse = await fetch(`/api/assessments/${assessmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const assessmentData = await assessmentResponse.json()

      if (!assessmentData.success) {
        setError(assessmentData.message)
        return
      }

      setAssessment(assessmentData.data.assessment)

      // Build responses map from existing responses
      const responsesMap = new Map<string, AssessmentResponseInput>()
      if (assessmentData.data.assessment.responses) {
        ;(assessmentData.data.assessment.responses as AssessmentResponse[]).forEach((response) => {
          responsesMap.set(response.indicatorId, {
            indicatorId: response.indicatorId,
            score: response.score,
            desiredScore: response.desiredScore,
            note: response.note || '',
          })
        })
      }
      setResponses(responsesMap)

      // Fetch all indicators
      const indicatorsResponse = await fetch('/api/indicators', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const indicatorsData = await indicatorsResponse.json()

      if (indicatorsData.success) {
        setIndicators(indicatorsData.data.groups)
      }
    } catch (error) {
      console.error('Fetch error:', error)
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  const handleResponseChange = (indicatorId: string, score: number, desiredScore: number | undefined, note: string) => {
    const newResponses = new Map(responses)
    newResponses.set(indicatorId, { indicatorId, score, desiredScore, note })
    setResponses(newResponses)
    setAutoSaveStatus('saving')
  }

  const handleSubmit = async () => {
    if (!assessment) return

    const totalIndicators = indicators.reduce((sum, group) => sum + group.indicators.length, 0)
    
    // Count complete responses (both current and desired scores)
    const completeResponses = Array.from(responses.values()).filter(
      r => (r.score ?? 0) > 0 && r.desiredScore && r.desiredScore > 0
    ).length
    
    if (completeResponses < totalIndicators) {
      showError(`กรุณาตอบคำถามให้ครบทั้ง ${totalIndicators} ข้อ (ตอบแล้ว ${completeResponses} ข้อ) - ต้องกรอกทั้ง "สภาพที่เป็นอยู่" และ "สภาพที่พึงประสงค์"`)
      return
    }

    const confirmed = await confirmAction(
      'เมื่อส่งแล้วจะไม่สามารถแก้ไขได้',
      'คุณต้องการส่งแบบประเมินนี้หรือไม่?'
    )
    
    if (!confirmed) {
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const token = localStorage.getItem('accessToken')

      const response = await fetch(`/api/assessments/${assessmentId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        showSuccess('ส่งแบบประเมินสำเร็จ')
        router.push('/assessment')
      } else {
        showError(data.message || 'เกิดข้อผิดพลาดในการส่งแบบประเมิน')
      }
    } catch (error) {
      console.error('Submit error:', error)
      showError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setSubmitting(false)
    }
  }

  const getFilteredIndicators = () => {
    if (selectedGroup === 'all') {
      return indicators
    }
    return indicators.filter(group => group.id === selectedGroup)
  }

  const totalIndicators = indicators.reduce((sum, group) => sum + group.indicators.length, 0)
  const answeredCount = responses.size

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

  if (!assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">ไม่พบแบบประเมิน</h2>
          <Link href="/assessment" className="text-primary-600 dark:text-primary-400 hover:text-primary-700">
            กลับไปรายการแบบประเมิน
          </Link>
        </div>
      </div>
    )
  }

  const isSubmitted = assessment.status === 'SUBMITTED'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 nav-header bg-white dark:bg-dark-card shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <Link href="/assessment" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 text-sm mb-2 inline-block">
                ← กลับไปรายการแบบประเมิน
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {assessment.school?.name}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {assessment.academicYear?.name}
                {assessment.semester && ` - ${assessment.semester.name}`}
              </p>
            </div>

            {/* Theme Toggle + Auto-save Status */}
            <div className="flex items-center gap-4">
              <ThemeToggle />
              {autoSaveStatus && (
                <div className="flex items-center gap-2 text-sm">
                  {autoSaveStatus === 'saving' && (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                      <span className="text-gray-600 dark:text-gray-400">กำลังบันทึก...</span>
                    </>
                  )}
                  {autoSaveStatus === 'saved' && (
                    <>
                      <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-green-600 dark:text-green-400">บันทึกแล้ว</span>
                    </>
                  )}
                  {autoSaveStatus === 'error' && (
                    <>
                      <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="text-red-600 dark:text-red-400">บันทึกล้มเหลว</span>
                    </>
                  )}
                </div>
              )}

              {!isSubmitted && (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || answeredCount < totalIndicators}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'กำลังส่ง...' : 'ส่งแบบประเมิน'}
                </button>
              )}
            </div>
          </div>

          <ProgressBar current={answeredCount} total={totalIndicators} />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {isSubmitted && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg">
            <p className="font-medium">✓ แบบประเมินนี้ถูกส่งแล้ว</p>
            <p className="text-sm mt-1">ส่งเมื่อ: {new Date(assessment.submittedAt!).toLocaleString('th-TH')}</p>
          </div>
        )}

        {/* Group Filter */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedGroup('all')}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
              selectedGroup === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover'
            }`}
          >
            ทั้งหมด ({totalIndicators})
          </button>
          {indicators.map((group) => (
            <button
              key={group.id}
              onClick={() => setSelectedGroup(group.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                selectedGroup === group.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover'
              }`}
            >
              {group.name} ({group.indicators.length})
            </button>
          ))}
        </div>

        {/* Indicators List - Using Rating Table */}
        <div className="space-y-8">
          {getFilteredIndicators().map((group) => (
            <GroupRatingTable
              key={group.id}
              group={group}
              responses={responses}
              onChange={handleResponseChange}
              disabled={isSubmitted}
            />
          ))}
        </div>

        {/* Bottom Actions */}
        {!isSubmitted && (
          <div className="mt-8 p-6 card bg-white dark:bg-dark-card rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  ตอบแล้ว {answeredCount} / {totalIndicators} ข้อ
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {answeredCount < totalIndicators 
                    ? `เหลืออีก ${totalIndicators - answeredCount} ข้อ`
                    : 'ตอบครบทุกข้อแล้ว พร้อมส่ง!'}
                </p>
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || answeredCount < totalIndicators}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'กำลังส่ง...' : 'ส่งแบบประเมิน'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
