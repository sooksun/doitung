'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'

interface School {
  id: string
  name: string
}

interface AcademicYear {
  id: string
  year: number
  name: string
}

interface Semester {
  id: string
  name: string
  academicYearId?: string
}

export default function CreateAssessmentPage() {
  const router = useRouter()
  const [schools, setSchools] = useState<School[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  
  const [formData, setFormData] = useState({
    schoolId: '',
    academicYearId: '',
    semesterId: '',
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<{ schoolId?: string | null } | null>(null)

  useEffect(() => {
    fetchUserAndData()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  const fetchUserAndData = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        router.push('/login')
        return
      }

      // Get user data
      const userResponse = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const userData = await userResponse.json()
      
      if (userData.success && userData.data) {
        setUser(userData.data)
        
        // If user has a school, pre-select it
        if (userData.data.schoolId) {
          setFormData(prev => ({ ...prev, schoolId: userData.data.schoolId }))
        }
      }

      // Fetch schools
      const schoolsResponse = await fetch('/api/admin/schools', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const schoolsData = await schoolsResponse.json()
      if (schoolsData.success && schoolsData.data?.schools) {
        setSchools(schoolsData.data.schools)
      }

      // Fetch academic years
      const yearsResponse = await fetch('/api/admin/years', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const yearsData = await yearsResponse.json()
      if (yearsData.success && yearsData.data?.years) {
        const years = yearsData.data.years || []
        setAcademicYears(years)
        // Extract all semesters from academic years
        const allSemesters = years.flatMap((year: AcademicYear & { semesters?: { id: string; name: string }[] }) =>
          (year.semesters || []).map((sem) => ({
            id: sem.id,
            name: `${year.name} - ${sem.name}`,
            academicYearId: year.id
          }))
        )
        setSemesters(allSemesters)
      }
    } catch (error) {
      console.warn('Fetch data warning:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!formData.schoolId || !formData.academicYearId) {
      setError('กรุณาเลือกโรงเรียนและปีการศึกษา')
      return
    }

    setLoading(true)
    console.log('📤 Submitting assessment:', formData)

    try {
      const token = localStorage.getItem('accessToken')
      
      const response = await fetch('/api/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        // Redirect to assessment form
        router.push(`/assessment/${data.data.assessment.id}`)
      } else {
        setError(data.message || 'เกิดข้อผิดพลาดในการสร้างแบบประเมิน')
      }
    } catch (error) {
      console.error('Create assessment error:', error)
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <header className="nav-header">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/assessment" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm mb-2 inline-block transition-colors">
                ← กลับไปรายการแบบประเมิน
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                สร้างแบบประเมินใหม่
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                เลือกโรงเรียนและปีการศึกษาที่ต้องการประเมิน
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-8 animate-fadeIn">
          {error && (
            <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg animate-fadeIn">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* School Selection */}
            <div>
              <label htmlFor="school" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                โรงเรียน *
              </label>
              <select
                id="school"
                value={formData.schoolId}
                onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                disabled={user?.schoolId !== null}
                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-dark-hover disabled:cursor-not-allowed transition-all"
                required
              >
                <option value="">-- เลือกโรงเรียน --</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
              {user?.schoolId && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  โรงเรียนถูกกำหนดตามบัญชีผู้ใช้ของคุณ
                </p>
              )}
            </div>

            {/* Academic Year Selection */}
            <div>
              <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ปีการศึกษา *
              </label>
              <select
                id="academicYear"
                value={formData.academicYearId}
                onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value, semesterId: '' })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                required
              >
                <option value="">-- เลือกปีการศึกษา --</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester Selection (Optional) */}
            <div>
              <label htmlFor="semester" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ภาคเรียน (ถ้ามี)
              </label>
              <select
                id="semester"
                value={formData.semesterId}
                onChange={(e) => setFormData({ ...formData, semesterId: e.target.value })}
                disabled={!formData.academicYearId}
                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-card text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-dark-hover transition-all"
              >
                <option value="">-- ไม่ระบุภาคเรียน --</option>
                {semesters
                  .filter(sem => !sem.academicYearId || sem.academicYearId === formData.academicYearId)
                  .map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      {semester.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Info Box */}
            <div className="bg-secondary-50 dark:bg-secondary-900/20 border border-secondary-200 dark:border-secondary-800 rounded-xl p-4">
              <div className="flex items-start">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary-500 to-primary-500 flex items-center justify-center mr-3 flex-shrink-0">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-sm text-secondary-800 dark:text-secondary-200">
                  <p className="font-medium mb-2">ข้อมูลเกี่ยวกับแบบประเมิน:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-secondary-700 dark:text-secondary-300">
                    <li>แบบประเมินประกอบด้วย 47 ตัวชี้วัดใน 4 กลุ่ม</li>
                    <li>ระบบจะบันทึกอัตโนมัติทุก 30 วินาที</li>
                    <li>สามารถทำแบบประเมินแบบแบ่งเป็นหลายครั้งได้</li>
                    <li>สามารถแนบหลักฐานประกอบในแต่ละตัวชี้วัด</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Link
                href="/assessment"
                className="btn-secondary flex-1 text-center"
              >
                ยกเลิก
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    กำลังสร้าง...
                  </span>
                ) : 'เริ่มทำแบบประเมิน'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
