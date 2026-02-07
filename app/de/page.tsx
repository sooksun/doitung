'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DEDashboardData {
  learningTimeline: unknown[]
  plcSessions: unknown[]
  plcQuality: { safetyLevel: number; questionDepth: number; studentConnection: number; actionFollowUp: number; sessionCount: number } | null
  studentSignals: unknown[]
  experimentSummary: { planned: number; inProgress: number; completed: number }
  latestReflection: { month: string; continueItems?: string; stopItems?: string; nextSteps?: string } | null
}

const hubCards = [
  {
    href: '/de/canvas',
    title: 'DE Canvas',
    subtitle: 'ภาพรวมระบบพัฒนาโรงเรียน',
    description: 'แสดง Purpose, Systems, Signals, Questions, Experiments, Evidence, Adaptation',
    icon: '🎯',
    color: 'from-purple-500 to-indigo-600',
  },
  {
    href: '/de/plc',
    title: 'PLC Sessions',
    subtitle: 'บันทึกวง PLC + คำถาม DE',
    description: 'บันทึกวง PLC พร้อม Quality Signals 4 มิติ และคำถาม DE รายเดือน',
    icon: '👥',
    color: 'from-blue-500 to-cyan-600',
  },
  {
    href: '/de/learning',
    title: 'Learning Timeline',
    subtitle: 'สิ่งที่โรงเรียนเรียนรู้',
    description: 'Timeline รายเดือนแสดงบทเรียนจาก PLC, การนิเทศ, การทดลอง',
    icon: '📚',
    color: 'from-green-500 to-emerald-600',
  },
  {
    href: '/de/students',
    title: 'Student Signals',
    subtitle: 'เรื่องเล่าการเปลี่ยนแปลงผู้เรียน',
    description: 'Story Cards แสดงสัญญาณการเปลี่ยนแปลงของผู้เรียน',
    icon: '🧒',
    color: 'from-orange-500 to-amber-600',
  },
  {
    href: '/de/experiments',
    title: 'Experiments',
    subtitle: 'การทดลองพัฒนา (Prototypes)',
    description: 'ลองเล็ก ๆ แต่ตั้งใจ — ติดตามการทดลองและบทเรียน',
    icon: '🔬',
    color: 'from-pink-500 to-rose-600',
  },
  {
    href: '/de/reflection',
    title: 'Monthly Reflection',
    subtitle: 'สะท้อน + การปรับทิศ',
    description: 'Continue / Stop / Expand — การปรับตัวประจำเดือน',
    icon: '🪞',
    color: 'from-violet-500 to-purple-600',
  },
]

export default function DEHubPage() {
  const [data, setData] = useState<DEDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDEData()
  }, [])

  const fetchDEData = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/de/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const now = new Date()
  const currentMonth = `${now.getFullYear() + 543}-${String(now.getMonth() + 1).padStart(2, '0')}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
        <h1 className="text-2xl font-bold mb-1">DE - การประเมินเพื่อการพัฒนา</h1>
        <p className="text-purple-200 text-sm">
          Developmental Evaluation : ใช้ผลประเมินเพื่อเรียนรู้ ไม่ใช่เพื่อตัดสิน
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="bg-white/10 rounded-lg px-3 py-2">
            <span className="text-purple-200">เดือนปัจจุบัน:</span>{' '}
            <span className="font-semibold">{currentMonth}</span>
          </div>
          {data && (
            <>
              <div className="bg-white/10 rounded-lg px-3 py-2">
                Learning Logs: <span className="font-semibold">{data.learningTimeline.length}</span>
              </div>
              <div className="bg-white/10 rounded-lg px-3 py-2">
                PLC Sessions: <span className="font-semibold">{data.plcSessions.length}</span>
              </div>
              <div className="bg-white/10 rounded-lg px-3 py-2">
                Student Stories: <span className="font-semibold">{data.studentSignals.length}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Stats (PLC Quality) */}
      {data?.plcQuality && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">PLC Quality Signals (เฉลี่ย)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'ความปลอดภัยในการพูด', value: data.plcQuality.safetyLevel },
              { label: 'ความลึกของคำถาม', value: data.plcQuality.questionDepth },
              { label: 'เชื่อมกับผู้เรียน', value: data.plcQuality.studentConnection },
              { label: 'ทดลองจริงหลัง PLC', value: data.plcQuality.actionFollowUp },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{item.value}/5</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hub Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hubCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
          >
            <div className={`bg-gradient-to-r ${card.color} p-4`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{card.icon}</span>
                <div>
                  <h3 className="text-white font-bold">{card.title}</h3>
                  <p className="text-white/80 text-xs">{card.subtitle}</p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">{card.description}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Latest Reflection */}
      {data?.latestReflection && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            Reflection ล่าสุด — {data.latestReflection.month}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {data.latestReflection.continueItems && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <div className="font-semibold text-green-700 dark:text-green-400 mb-1">ทำต่อ</div>
                <p className="text-gray-700 dark:text-gray-300">{data.latestReflection.continueItems}</p>
              </div>
            )}
            {data.latestReflection.stopItems && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <div className="font-semibold text-red-700 dark:text-red-400 mb-1">หยุด</div>
                <p className="text-gray-700 dark:text-gray-300">{data.latestReflection.stopItems}</p>
              </div>
            )}
            {data.latestReflection.nextSteps && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <div className="font-semibold text-blue-700 dark:text-blue-400 mb-1">ก้าวถัดไป</div>
                <p className="text-gray-700 dark:text-gray-300">{data.latestReflection.nextSteps}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">กำลังโหลดข้อมูล...</div>
      )}
    </div>
  )
}
