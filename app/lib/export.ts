// Export utilities for Excel, CSV and Print
import * as XLSX from 'xlsx'

interface AssessmentSummaryRow {
  schoolName?: string
  academicYearName?: string
  semesterName?: string | null
  overallScore?: number
  status?: string
  submittedAt?: string | Date | null
}

// CSV Export
export function exportToCSV(data: AssessmentSummaryRow[], filename: string) {
  if (!data || data.length === 0) return

  // Convert assessment summaries to flat format
  const flatData = data.map((item) => ({
    'โรงเรียน': item.schoolName || '',
    'ปีการศึกษา': item.academicYearName || '',
    'ภาคเรียน': item.semesterName || '-',
    'คะแนนรวม': item.overallScore?.toFixed?.(2) || '0',
    'สถานะ': item.status === 'SUBMITTED' ? 'ส่งแล้ว' : item.status,
    'วันที่ส่ง': item.submittedAt 
      ? new Date(item.submittedAt).toLocaleDateString('th-TH') 
      : '-',
  }))

  // Create CSV content
  const headers = Object.keys(flatData[0])
  const csvContent = [
    headers.join(','),
    ...flatData.map(row => 
      headers.map(header => {
        const val = (row as Record<string, unknown>)[header]
        // Escape commas and quotes
        return `"${String(val).replace(/"/g, '""')}"`
      }).join(',')
    )
  ].join('\n')

  // Add BOM for Thai characters
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Print Report
export function printReport(data: AssessmentSummaryRow[]) {
  if (!data || data.length === 0) return

  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>รายงานการประเมิน</title>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Sarabun', sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #333; padding: 8px; text-align: left; }
        th { background-color: #4F46E5; color: white; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        h1 { color: #4F46E5; }
        .print-date { text-align: right; color: #666; margin-bottom: 20px; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <h1>รายงานการประเมิน</h1>
      <div class="print-date">พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH')}</div>
      <table>
        <thead>
          <tr>
            <th>โรงเรียน</th>
            <th>ปีการศึกษา</th>
            <th>ภาคเรียน</th>
            <th>คะแนนรวม</th>
            <th>สถานะ</th>
            <th>วันที่ส่ง</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(item => `
            <tr>
              <td>${item.schoolName || '-'}</td>
              <td>${item.academicYearName || '-'}</td>
              <td>${item.semesterName || '-'}</td>
              <td>${item.overallScore?.toFixed?.(2) || '0'}</td>
              <td>${item.status === 'SUBMITTED' ? 'ส่งแล้ว' : item.status}</td>
              <td>${item.submittedAt ? new Date(item.submittedAt).toLocaleDateString('th-TH') : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.print()
  }
}

// Excel Export
export function exportToExcel(data: Record<string, unknown>[], filename: string) {
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

  // Generate Excel file
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

interface AssessmentExport {
  schoolName?: string
  academicYearName?: string
  semesterName?: string
  overallScore?: number
  domainScores?: { groupName: string; averageScore: number; answeredIndicators?: number; totalIndicators?: number }[]
}

// Export assessment report to Excel
export function exportAssessmentToExcel(assessment: AssessmentExport) {
  const data: Record<string, unknown>[] = []

  // Header information
  data.push({
    'รายการ': 'ชื่อโรงเรียน',
    'ข้อมูล': assessment.schoolName || '-',
    '': '',
    ' ': '',
  })
  data.push({
    'รายการ': 'ปีการศึกษา',
    'ข้อมูล': assessment.academicYearName || '-',
    '': '',
    ' ': '',
  })
  if (assessment.semesterName) {
    data.push({
      'รายการ': 'ภาคเรียน',
      'ข้อมูล': assessment.semesterName,
      '': '',
      ' ': '',
    })
  }
  data.push({
    'รายการ': 'คะแนนรวม',
    'ข้อมูล': `${(assessment.overallScore ?? 0).toFixed(2)} / 5.00`,
    '': '',
    ' ': '',
  })
  data.push({}) // Empty row

  // Domain scores
  data.push({
    'รายการ': 'กลุ่มตัวชี้วัด',
    'ข้อมูล': 'คะแนนเฉลี่ย',
    '': 'จำนวนตัวชี้วัด',
    ' ': '',
  })

  ;(assessment.domainScores || []).forEach((domain) => {
    data.push({
      'รายการ': domain.groupName,
      'ข้อมูล': `${domain.averageScore.toFixed(2)} / 5.00`,
      '': `${domain.answeredIndicators ?? 0} / ${domain.totalIndicators ?? 0}`,
      ' ': '',
    })
  })

  // Export
  const filename = `รายงานการประเมิน_${assessment.schoolName}_${assessment.academicYearName}`
  exportToExcel(data, filename)
}

interface ComparisonSummary {
  schoolName?: string
  academicYearName?: string
  semesterName?: string
  overallScore?: number
  status?: string
  submittedAt?: string
  domainScores?: { groupName: string; averageScore: number }[]
}

// Export multiple assessments comparison
export function exportComparisonToExcel(summaries: ComparisonSummary[]) {
  const data = summaries.map((summary) => ({
    'โรงเรียน': summary.schoolName || '-',
    'ปีการศึกษา': summary.academicYearName || '-',
    'ภาคเรียน': summary.semesterName || '-',
    'คะแนนรวม': (summary.overallScore ?? 0).toFixed(2),
    ...Object.fromEntries(
      (summary.domainScores || []).map((d: { groupName: string; averageScore: number }) => [d.groupName, d.averageScore.toFixed(2)])
    ),
    'สถานะ': summary.status === 'SUBMITTED' ? 'ส่งแล้ว' : summary.status || '-',
    'วันที่ส่ง': summary.submittedAt
      ? new Date(summary.submittedAt).toLocaleDateString('th-TH')
      : '-',
  }))

  exportToExcel(data, `รายงานเปรียบเทียบการประเมิน_${new Date().toLocaleDateString('th-TH')}`)
}

interface UserExport {
  email?: string
  firstName?: string
  lastName?: string
  role?: string
  office?: { name: string }
  network?: { name: string }
  school?: { name: string }
  isActive?: boolean
  createdAt?: string | Date
  lastLogin?: string | Date | null
}

// Export users list
export function exportUsersToExcel(users: UserExport[]) {
  const data = users.map((user) => ({
    'อีเมล': user.email || '-',
    'ชื่อ': user.firstName || '-',
    'นามสกุล': user.lastName || '-',
    'บทบาท': user.role || '-',
    'สำนักงานเขต': user.office?.name || '-',
    'เครือข่าย': user.network?.name || '-',
    'โรงเรียน': user.school?.name || '-',
    'สถานะ': user.isActive ? 'ใช้งาน' : 'ปิดใช้งาน',
    'วันที่สร้าง': user.createdAt ? new Date(user.createdAt).toLocaleDateString('th-TH') : '-',
    'เข้าใช้ล่าสุด': user.lastLogin
      ? new Date(user.lastLogin).toLocaleDateString('th-TH')
      : '-',
  }))

  exportToExcel(data, `รายชื่อผู้ใช้_${new Date().toLocaleDateString('th-TH')}`)
}

interface SchoolExport {
  code?: string
  name?: string
  network?: { name: string; office?: { name: string } }
  _count?: { users?: number; assessments?: number }
}

// Export schools list
export function exportSchoolsToExcel(schools: SchoolExport[]) {
  const data = schools.map((school) => ({
    'รหัสโรงเรียน': school.code || '-',
    'ชื่อโรงเรียน': school.name || '-',
    'เครือข่าย': school.network?.name || '-',
    'สำนักงานเขต': school.network?.office?.name || '-',
    'จำนวนผู้ใช้': school._count?.users || 0,
    'จำนวนการประเมิน': school._count?.assessments || 0,
  }))

  exportToExcel(data, `รายชื่อโรงเรียน_${new Date().toLocaleDateString('th-TH')}`)
}
