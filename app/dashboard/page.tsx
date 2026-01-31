'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SummaryCards from '../components/dashboard/SummaryCards'
import RadarChartComponent from '../components/dashboard/RadarChart'
import ComparisonChart from '../components/dashboard/ComparisonChart'
import DashboardFilters from '../components/dashboard/DashboardFilters'
import { DashboardStats, AssessmentSummary, ComparisonData } from '../lib/types'
import { showInfo } from '@/lib/toast'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [summaries, setSummaries] = useState<AssessmentSummary[]>([])
  const [comparison, setComparison] = useState<ComparisonData[]>([])
  const [filters, setFilters] = useState<any>({})

  useEffect(() => {
    fetchUserData()
  }, [])

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user, filters])

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        setUser(data.data)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Fetch user error:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) return

      // Build query params
      const params = new URLSearchParams()
      if (filters.schoolId) params.append('schoolId', filters.schoolId)
      if (filters.academicYearId) params.append('academicYearId', filters.academicYearId)
      if (filters.semesterId) params.append('semesterId', filters.semesterId)

      // Fetch stats
      const statsResponse = await fetch(`/api/dashboard/stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const statsData = await statsResponse.json()
      if (statsData.success) {
        setStats(statsData.data.stats)
      }

      // Fetch summaries
      const summaryResponse = await fetch(`/api/dashboard/summary?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const summaryData = await summaryResponse.json()
      if (summaryData.success) {
        setSummaries(summaryData.data.summaries)
      }

      // Fetch comparison data
      const comparisonResponse = await fetch(`/api/dashboard/comparison?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const comparisonData = await comparisonResponse.json()
      if (comparisonData.success) {
        setComparison(comparisonData.data.comparison)
      }
    } catch (error) {
      console.error('Fetch dashboard data error:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    router.push('/login')
  }

  const handleExport = () => {
    showInfo('ฟีเจอร์ Export กำลังพัฒนา')
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
              <h1 className="text-2xl font-bold text-gray-900">
                📊 Dashboard - ภาพรวมระบบ
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                ยินดีต้อนรับ, {user?.firstName} {user?.lastName} ({user?.role})
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/assessment"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                📝 แบบประเมิน
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <DashboardFilters onFilterChange={setFilters} userRole={user?.role} />

        {/* Summary Cards */}
        {stats && (
          <div className="mb-8">
            <SummaryCards stats={stats} />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Radar Chart */}
          {summaries.length > 0 && (
            <RadarChartComponent
              domainScores={summaries[0].domainScores}
              title="ผลการประเมินล่าสุด - 4 มิติ"
            />
          )}

          {/* Latest Assessment Summary */}
          {summaries.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  รายละเอียดการประเมินล่าสุด
                </h3>
                <button
                  onClick={handleExport}
                  className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
                >
                  📥 Export
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">โรงเรียน</p>
                  <p className="text-base font-semibold text-gray-900">
                    {summaries[0].schoolName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ปีการศึกษา</p>
                  <p className="text-base font-medium text-gray-900">
                    {summaries[0].academicYearName}
                    {summaries[0].semesterName && ` - ${summaries[0].semesterName}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">คะแนนรวม</p>
                  <p className="text-3xl font-bold text-primary-600">
                    {summaries[0].overallScore.toFixed(2)}
                    <span className="text-lg font-normal text-gray-500"> / 5.00</span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">สถานะ</p>
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    {summaries[0].status === 'SUBMITTED' ? 'ส่งแล้ว' : summaries[0].status}
                  </span>
                </div>
                {summaries[0].submittedAt && (
                  <div>
                    <p className="text-sm text-gray-600">วันที่ส่ง</p>
                    <p className="text-base font-medium text-gray-900">
                      {new Date(summaries[0].submittedAt).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>

              <Link
                href={`/assessment/${summaries[0].assessmentId}`}
                className="mt-6 block w-full px-4 py-2 bg-primary-600 text-white text-center rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                ดูรายละเอียดเต็ม
              </Link>
            </div>
          )}
        </div>

        {/* Comparison Chart */}
        {comparison.length > 0 && (
          <div className="mb-8">
            <ComparisonChart data={comparison} />
          </div>
        )}

        {/* Recent Assessments Table */}
        {summaries.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              การประเมินล่าสุด
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      โรงเรียน
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ปีการศึกษา
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      คะแนนรวม
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {summaries.slice(0, 5).map((summary) => (
                    <tr key={summary.assessmentId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {summary.schoolName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {summary.academicYearName}
                        {summary.semesterName && ` - ${summary.semesterName}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-primary-600">
                          {summary.overallScore.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          ส่งแล้ว
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Link
                          href={`/assessment/${summary.assessmentId}`}
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          ดูรายละเอียด →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {summaries.length > 5 && (
              <div className="mt-4 text-center">
                <Link
                  href="/assessment"
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  ดูทั้งหมด ({summaries.length} รายการ) →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* No Data State */}
        {summaries.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              ยังไม่มีข้อมูลการประเมิน
            </h3>
            <p className="text-gray-600 mb-6">
              เริ่มต้นสร้างและทำแบบประเมินเพื่อดูภาพรวมข้อมูล
            </p>
            <Link
              href="/assessment/new"
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              สร้างแบบประเมินแรก
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
