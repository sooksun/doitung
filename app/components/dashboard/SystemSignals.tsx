'use client'

import { DomainScore, TrendIndicator } from '@/lib/types'

interface SystemSignalsProps {
  domainScores: DomainScore[]
}

const getTrendIcon = (trend?: TrendIndicator) => {
  switch (trend) {
    case 'improving':
      return { icon: '↑', label: 'ขยับดีขึ้น', color: 'text-green-600 dark:text-green-400' }
    case 'stable':
      return { icon: '→', label: 'ทรงตัว', color: 'text-blue-600 dark:text-blue-400' }
    case 'declining':
      return { icon: '↓', label: 'ชะลอ', color: 'text-orange-600 dark:text-orange-400' }
    case 'new':
      return { icon: '✦', label: 'กำลังทดลอง', color: 'text-purple-600 dark:text-purple-400' }
    default:
      return { icon: '→', label: 'ทรงตัว', color: 'text-gray-600 dark:text-gray-400' }
  }
}

export default function SystemSignals({ domainScores }: SystemSignalsProps) {
  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        สัญญาณการพัฒนาระบบ
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        ภาพรวมการเปลี่ยนแปลงของ 4 ระบบหลัก (ไม่ใช่คะแนน)
      </p>

      <div className="space-y-4">
        {domainScores.map((domain) => {
          const trendInfo = getTrendIcon(domain.trend)
          const scoreDiff = domain.previousScore
            ? domain.averageScore - domain.previousScore
            : 0

          return (
            <div
              key={domain.groupId}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className={`text-3xl font-bold ${trendInfo.color}`}>
                    {trendInfo.icon}
                  </span>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {domain.groupName}
                    </h4>
                    <p className={`text-sm font-medium ${trendInfo.color}`}>
                      {trendInfo.label}
                    </p>
                  </div>
                </div>
                {domain.previousScore && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 ml-12">
                    เปลี่ยนจาก {domain.previousScore.toFixed(2)} → {domain.averageScore.toFixed(2)}
                    {scoreDiff !== 0 && (
                      <span className={scoreDiff > 0 ? 'text-green-600' : 'text-orange-600'}>
                        {' '}({scoreDiff > 0 ? '+' : ''}{scoreDiff.toFixed(2)})
                      </span>
                    )}
                  </p>
                )}
              </div>
              <button className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                ดูเหตุ-ปัจจัย →
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <span className="font-semibold">คำถาม DE:</span> ระบบไหนขยับเร็วเพราะอะไร? ระบบไหนชะลอเพราะ &ldquo;เงื่อนไข&rdquo; ไม่ใช่ &ldquo;คน&rdquo;?
        </p>
      </div>
    </div>
  )
}
