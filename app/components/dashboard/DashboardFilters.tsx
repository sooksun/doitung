'use client'

import { useState, useEffect } from 'react'

interface FilterValues {
  schoolId?: string
  academicYearId?: string
  semesterId?: string
}

interface DashboardFiltersProps {
  onFilterChange: (filters: FilterValues) => void
  userRole: string
}

interface OptionItem {
  id: string
  name: string
  year?: number
}

export default function DashboardFilters({ onFilterChange, userRole }: DashboardFiltersProps) {
  const [filters, setFilters] = useState({
    schoolId: '',
    academicYearId: '',
    semesterId: '',
  })

  const [schools, setSchools] = useState<OptionItem[]>([])
  const [academicYears, setAcademicYears] = useState<OptionItem[]>([])
  const [semesters, setSemesters] = useState<OptionItem[]>([])

  useEffect(() => {
    // TODO: Fetch schools, academic years, semesters from API
    // For now, using mock data
    setSchools([
      { id: '1', name: 'โรงเรียนตัวอย่าง 1' },
      { id: '2', name: 'โรงเรียนตัวอย่าง 2' },
    ])
    
    setAcademicYears([
      { id: '1', year: 2567, name: 'ปีการศึกษา 2567' },
      { id: '2', year: 2566, name: 'ปีการศึกษา 2566' },
    ])
    
    setSemesters([
      { id: '1', name: 'ภาคเรียนที่ 1' },
      { id: '2', name: 'ภาคเรียนที่ 2' },
    ])
  }, [])

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
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
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">ตัวกรอง</h3>
        <button
          onClick={handleReset}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          ล้างตัวกรอง
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* School Filter */}
        {(userRole === 'SUPER_ADMIN' || userRole === 'OFFICE_ADMIN' || userRole === 'NETWORK_ADMIN') && (
          <div>
            <label htmlFor="school" className="block text-sm font-medium text-gray-700 mb-2">
              โรงเรียน
            </label>
            <select
              id="school"
              value={filters.schoolId}
              onChange={(e) => handleFilterChange('schoolId', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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

        {/* Academic Year Filter */}
        <div>
          <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700 mb-2">
            ปีการศึกษา
          </label>
          <select
            id="academicYear"
            value={filters.academicYearId}
            onChange={(e) => handleFilterChange('academicYearId', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">-- ทั้งหมด --</option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </div>

        {/* Semester Filter */}
        <div>
          <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-2">
            ภาคเรียน
          </label>
          <select
            id="semester"
            value={filters.semesterId}
            onChange={(e) => handleFilterChange('semesterId', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
    </div>
  )
}
