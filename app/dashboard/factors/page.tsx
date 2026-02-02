'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ConditionsPanel from '../../components/dashboard/ConditionsPanel'
import { ThemeToggle } from '../../components/ThemeToggle'
import type { DevelopmentCondition } from '@/lib/types'

function FactorsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const assessmentId = searchParams.get('assessmentId')
  const domainName = searchParams.get('domainName')

  const [conditions, setConditions] = useState<DevelopmentCondition[]>([])
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState<{ schoolName?: string; academicYearName?: string; semesterName?: string | null } | null>(null)

  useEffect(() => {
    if (!assessmentId) {
      setLoading(false)
      return
    }
    fetchConditions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId])

  const fetchConditions = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        router.push('/login')
        return
      }
      const res = await fetch(`/api/assessments/${assessmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success && data.data?.assessment) {
        const a = data.data.assessment
        const conds = (a.conditions || []).map((c: { id: string; type: string; description: string; category?: string }) => ({
          id: c.id,
          type: c.type.toLowerCase() as 'supporter' | 'blocker',
          description: c.description,
          category: c.category,
        }))
        setConditions(conds)
        setContext({
          schoolName: a.school?.name,
          academicYearName: a.academicYear?.name,
          semesterName: a.semester?.name ?? null,
        })
      }
    } catch (err) {
      console.error('Fetch conditions error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <header className="nav-header">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/dashboard"
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm mb-2 inline-block transition-colors"
              >
                ← กลับไป Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                เหตุ-ปัจจัย การพัฒนา
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                สิ่งที่หนุนและสิ่งที่ถ่วงการพัฒนาตามระบบ
              </p>
              {domainName && (
                <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                  ระบบ: {decodeURIComponent(domainName)}
                </p>
              )}
              {context && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {context.schoolName} · {context.academicYearName}
                  {context.semesterName && ` · ${context.semesterName}`}
                </p>
              )}
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          </div>
        ) : !assessmentId ? (
          <div className="card p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              ไม่พบข้อมูลแบบประเมิน กรุณาเลือกจาก Dashboard ก่อน
            </p>
            <Link href="/dashboard" className="btn-primary inline-block">
              กลับไป Dashboard
            </Link>
          </div>
        ) : (
          <ConditionsPanel
            conditions={conditions}
            assessmentId={assessmentId}
            onUpdate={fetchConditions}
            editable={false}
          />
        )}
      </main>
    </div>
  )
}

export default function FactorsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    }>
      <FactorsContent />
    </Suspense>
  )
}
