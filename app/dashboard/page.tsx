'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SummaryCards from '../components/dashboard/SummaryCards'
import SystemSignals from '../components/dashboard/SystemSignals'
import RadarChartComponent from '../components/dashboard/RadarChart'
import BarChartComponent from '../components/dashboard/BarChart'
import ComparisonChart from '../components/dashboard/ComparisonChart'
import ConditionsPanel from '../components/dashboard/ConditionsPanel'
import DashboardFilters from '../components/dashboard/DashboardFilters'
import { DashboardStats, AssessmentSummary, ComparisonData } from '../lib/types'
import { showInfo } from '@/lib/toast'
import { ThemeToggle } from '@/components/ThemeToggle'

type ChartType = 'spider' | 'bar'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ firstName?: string; lastName?: string; role?: string; schoolId?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [summaries, setSummaries] = useState<AssessmentSummary[]>([])
  const [comparison, setComparison] = useState<ComparisonData[]>([])
  const [filters, setFilters] = useState<{ schoolId?: string; academicYearId?: string; semesterId?: string }>({})
  const [chartType, setChartType] = useState<ChartType>('spider')
  const isAdmin = user?.role && ['SUPER_ADMIN', 'OFFICE_ADMIN', 'NETWORK_ADMIN'].includes(user.role)

  useEffect(() => {
    fetchUserData()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch when user or filters change
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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      // ignore
    }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    window.location.href = '/login' // hard redirect ล้าง cache/state
  }

  const handleExport = () => {
    showInfo('ฟีเจอร์ Export กำลังพัฒนา')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="nav-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-glow-purple">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </span>
                Dashboard
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-12">
                ยินดีต้อนรับ, {user?.firstName} {user?.lastName} 
                <span className="badge badge-primary ml-2">{user?.role}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                href="/de"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                DE Hub
              </Link>
              <Link
                href="/assessment"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-blue-800 transition-all shadow-md"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                แบบประเมิน
              </Link>
              <button
                onClick={handleLogout}
                className="btn-ghost px-4 py-2"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <DashboardFilters
          onFilterChange={setFilters}
          userRole={user?.role}
          userSchoolId={user?.schoolId}
        />

        {/* Summary Cards */}
        {stats && (
          <div className="mb-8">
            <SummaryCards stats={stats} />
          </div>
        )}

        {/* Chart Type Toggle - Admin only */}
        {isAdmin && summaries.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">รูปแบบกราฟ:</span>
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button
                onClick={() => setChartType('spider')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  chartType === 'spider'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-dark-bg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                Spider (เรดาร์)
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  chartType === 'bar'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-dark-bg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                Bar (แท่ง)
              </button>
            </div>
          </div>
        )}

        {/* DE: System Signals Overview */}
        {summaries.length > 0 && (
          <div className="mb-8">
            <SystemSignals
              domainScores={summaries[0].domainScores}
              assessmentId={summaries[0].assessmentId}
            />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Chart - Spider or Bar (2 มิติ: สภาพที่เป็นอยู่ / สภาพที่พึงประสงค์) */}
          {summaries.length > 0 && (
            <>
              {chartType === 'spider' ? (
                <RadarChartComponent
                  domainScores={summaries[0].domainScores}
                  title="สัญญาณการพัฒนา - 4 มิติ"
                  showTwoDimensions
                />
              ) : (
                <BarChartComponent
                  domainScores={summaries[0].domainScores}
                  title="สัญญาณการพัฒนารายด้าน"
                  showTwoDimensions
                />
              )}
            </>
          )}

          {/* Latest Assessment Summary */}
          {summaries.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  รายละเอียดการประเมินล่าสุด
                </h3>
                <button
                  onClick={handleExport}
                  className="badge badge-success hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">โรงเรียน</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    {summaries[0].schoolName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">ปีการศึกษา</p>
                  <p className="text-base font-medium text-gray-900 dark:text-gray-200">
                    {summaries[0].academicYearName}
                    {summaries[0].semesterName && ` - ${summaries[0].semesterName}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">คะแนนรวม</p>
                  <p className="text-3xl font-bold gradient-text">
                    {summaries[0].overallScore.toFixed(2)}
                    <span className="text-lg font-normal text-gray-500 dark:text-gray-400"> / 5.00</span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">สถานะ</p>
                  <span className="badge badge-success">
                    {summaries[0].status === 'SUBMITTED' ? 'ส่งแล้ว' : summaries[0].status}
                  </span>
                </div>
                {summaries[0].submittedAt && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">วันที่ส่ง</p>
                    <p className="text-base font-medium text-gray-900 dark:text-gray-200">
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
                className="btn-primary mt-6 block w-full text-center"
              >
                ดูรายละเอียดเต็ม
              </Link>
            </div>
          )}
        </div>

        {/* DE: Conditions & Blockers */}
        {summaries.length > 0 && (
          <div className="mb-8">
            <ConditionsPanel
              conditions={summaries[0].conditions}
              assessmentId={summaries[0].assessmentId}
              editable={false}
            />
          </div>
        )}

        {/* DE Signals Quick View */}
        <div className="mb-8 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-400">DE - สัญญาณการพัฒนา</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">ใช้ผลประเมินเพื่อเรียนรู้ ไม่ใช่เพื่อตัดสิน</p>
            </div>
            <Link
              href="/de"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              เปิด DE Hub →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { href: '/de/canvas', label: 'DE Canvas', icon: '🎯' },
              { href: '/de/plc', label: 'PLC Sessions', icon: '👥' },
              { href: '/de/learning', label: 'Learning', icon: '📚' },
              { href: '/de/students', label: 'Student Signals', icon: '🧒' },
              { href: '/de/experiments', label: 'Experiments', icon: '🔬' },
              { href: '/de/reflection', label: 'Reflection', icon: '🪞' },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700">
                <span className="text-2xl block mb-1">{item.icon}</span>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Comparison Chart */}
        {comparison.length > 0 && (
          <div className="mb-8">
            <ComparisonChart data={comparison} />
          </div>
        )}

        {/* Recent Assessments Table */}
        {summaries.length > 0 && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              การประเมินล่าสุด
            </h3>
            <div className="table-container">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th>โรงเรียน</th>
                    <th>ปีการศึกษา</th>
                    <th>คะแนนรวม</th>
                    <th>สถานะ</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.slice(0, 5).map((summary) => (
                    <tr key={summary.assessmentId}>
                      <td className="font-medium text-gray-900 dark:text-white">
                        {summary.schoolName}
                      </td>
                      <td className="text-gray-600 dark:text-gray-400">
                        {summary.academicYearName}
                        {summary.semesterName && ` - ${summary.semesterName}`}
                      </td>
                      <td>
                        <span className="text-lg font-bold gradient-text">
                          {summary.overallScore.toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-success">ส่งแล้ว</span>
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/assessment/${summary.assessmentId}`}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
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
                  className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
                >
                  ดูทั้งหมด ({summaries.length} รายการ) →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* No Data State */}
        {summaries.length === 0 && (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center mx-auto mb-6 shadow-glow-purple">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              ยังไม่มีข้อมูลการประเมิน
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              เริ่มต้นสร้างและทำแบบประเมินเพื่อดูภาพรวมข้อมูล
            </p>
            <Link
              href="/assessment/new"
              className="btn-primary inline-block"
            >
              สร้างแบบประเมินแรก
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
