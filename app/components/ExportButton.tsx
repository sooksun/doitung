'use client'

import { useState } from 'react'
import { exportAssessmentToExcel, exportComparisonToExcel, exportUsersToExcel, exportSchoolsToExcel } from '@/lib/export'
import { showError } from '@/lib/toast'

interface ExportButtonProps {
  type: 'assessment' | 'comparison' | 'users' | 'schools'
  data?: unknown
  assessmentId?: string
  label?: string
  className?: string
}

export default function ExportButton({
  type,
  data,
  assessmentId,
  label = '📥 Export Excel',
  className = 'px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium',
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)

    try {
      if (type === 'assessment' && assessmentId) {
        // Fetch assessment data for export
        const token = localStorage.getItem('accessToken')
        const response = await fetch(`/api/export/assessment/${assessmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const result = await response.json()

        if (result.success) {
          exportAssessmentToExcel(result.data.assessment)
        } else {
          showError(result.message)
        }
      } else if (type === 'comparison' && data) {
        exportComparisonToExcel(data)
      } else if (type === 'users' && data) {
        exportUsersToExcel(data)
      } else if (type === 'schools' && data) {
        exportSchoolsToExcel(data)
      }
    } catch (error) {
      console.error('Export error:', error)
      showError('เกิดข้อผิดพลาดในการส่งออกข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className={className}
    >
      {loading ? 'กำลังส่งออก...' : label}
    </button>
  )
}
