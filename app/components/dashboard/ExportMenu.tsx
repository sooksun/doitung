'use client'

import { useState, useRef, useEffect } from 'react'
import { AssessmentSummary } from '@/lib/types'
import { exportToCSV, exportToExcel, printReport } from '@/lib/export'

interface ExportMenuProps {
  summaries: AssessmentSummary[]
  disabled?: boolean
}

export default function ExportMenu({ summaries, disabled = false }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleExport = (type: 'csv' | 'excel' | 'print') => {
    const filename = `assessment-report-${new Date().toISOString().split('T')[0]}`

    switch (type) {
      case 'csv':
        exportToCSV(summaries, `${filename}.csv`)
        break
      case 'excel':
        exportToExcel(summaries as unknown as Record<string, unknown>[], `${filename}.xls`)
        break
      case 'print':
        printReport(summaries)
        break
    }

    setIsOpen(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || summaries.length === 0}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            <button
              onClick={() => handleExport('csv')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
            >
              <span className="text-lg">📄</span>
              Export เป็น CSV
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
            >
              <span className="text-lg">📊</span>
              Export เป็น Excel
            </button>
            <button
              onClick={() => handleExport('print')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
            >
              <span className="text-lg">🖨️</span>
              พิมพ์รายงาน
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
