'use client'

import { useState, useEffect } from 'react'

interface FilterValues {
  schoolId?: string
  academicYearId?: string
  semesterId?: string
}

interface DashboardFiltersProps {
  onFilterChange: (filters: FilterValues) => void
  userRole?: string
  userSchoolId?: string
}

interface OptionItem {
  id: string
  name: string
  year?: number
}

interface SemesterOption {
  id: string
  name: string
  academicYearId: string
  academicYearName: string
}

export default function DashboardFilters({ onFilterChange, userRole, userSchoolId }: DashboardFiltersProps) {
  const [filters, setFilters] = useState({
    schoolId: '',
    academicYearId: '',
    semesterId: '',
  })

  const [schools, setSchools] = useState<OptionItem[]>([])
  const [academicYears, setAcademicYears] = useState<OptionItem[]>([])
  const [allSemesters, setAllSemesters] = useState<SemesterOption[]>([])
  const [loading, setLoading] = useState(true)

  const isAdmin = ['SUPER_ADMIN', 'OFFICE_ADMIN', 'NETWORK_ADMIN'].includes(userRole || '')

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const token = localStorage.getItem('accessToken')
        if (!token) return

        const res = await fetch('/api/dashboard/filter-options', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()

        if (data.success && data.data) {
          setAcademicYears(data.data.academicYears || [])
          setAllSemesters(data.data.semesters || [])
          setSchools(data.data.schools || [])
        }
      } catch (err) {
        console.error('Fetch filter options error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchOptions()
  }, [])

  const semesters = filters.academicYearId
    ? allSemesters.filter((s) => s.academicYearId === filters.academicYearId)
    : allSemesters

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    if (key === 'academicYearId') {
      newFilters.semesterId = ''
    }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleReset = () => {
    const resetFilters = {
      schoolId: '',
      academicYearId: '',
      semesterId: '',
    }
    setFilters(resetFilters)
    onFilterChange(resetFilters)
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6 mb-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">ตัวกรอง</h3>
        <button
          onClick={handleReset}
          className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium"
        >
          ล้างตัวกรอง
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">กำลังโหลดตัวกรอง...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* โรงเรียน - แสดงเฉพาะ admin (SUPER_ADMIN, OFFICE_ADMIN, NETWORK_ADMIN) */}
          {isAdmin && (
            <div>
              <label htmlFor="school" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                โรงเรียน
              </label>
              <select
                id="school"
                value={filters.schoolId}
                onChange={(e) => handleFilterChange('schoolId', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
              >
                <option value="">-- ทั้งหมด --</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ปีการศึกษา - ดึงจาก database */}
          <div>
            <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ปีการศึกษา
            </label>
            <select
              id="academicYear"
              value={filters.academicYearId}
              onChange={(e) => handleFilterChange('academicYearId', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
            >
              <option value="">-- ทั้งหมด --</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </div>

          {/* ภาคเรียน - ดึงจาก database, กรองตามปีที่เลือก */}
          <div>
            <label htmlFor="semester" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ภาคเรียน
            </label>
            <select
              id="semester"
              value={filters.semesterId}
              onChange={(e) => handleFilterChange('semesterId', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
            >
              <option value="">-- ทั้งหมด --</option>
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!isAdmin && userSchoolId && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          คุณเห็นผลการประเมินเฉพาะโรงเรียนของตนเองเท่านั้น
        </p>
      )}
    </div>
  )
}
