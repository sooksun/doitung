'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetchUserAndData()
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
        const allSemesters = years.flatMap((year: any) => 
          (year.semesters || []).map((sem: any) => ({
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/assessment" className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-block">
            ← กลับไปรายการแบบประเมิน
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            สร้างแบบประเมินใหม่
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            เลือกโรงเรียนและปีการศึกษาที่ต้องการประเมิน
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* School Selection */}
            <div>
              <label htmlFor="school" className="block text-sm font-medium text-gray-700 mb-2">
                โรงเรียน *
              </label>
              <select
                id="school"
                value={formData.schoolId}
                onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                disabled={user?.schoolId !== null}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                <p className="mt-1 text-sm text-gray-500">
                  โรงเรียนถูกกำหนดตามบัญชีผู้ใช้ของคุณ
                </p>
              )}
            </div>

            {/* Academic Year Selection */}
            <div>
              <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700 mb-2">
                ปีการศึกษา *
              </label>
              <select
                id="academicYear"
                value={formData.academicYearId}
                onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value, semesterId: '' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
              <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-2">
                ภาคเรียน (ถ้ามี)
              </label>
              <select
                id="semester"
                value={formData.semesterId}
                onChange={(e) => setFormData({ ...formData, semesterId: e.target.value })}
                disabled={!formData.academicYearId}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">ข้อมูลเกี่ยวกับแบบประเมิน:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
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
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-center"
              >
                ยกเลิก
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'กำลังสร้าง...' : 'เริ่มทำแบบประเมิน'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
