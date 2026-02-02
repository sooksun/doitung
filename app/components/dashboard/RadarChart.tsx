'use client'

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { DomainScore } from '@/lib/types'

interface RadarChartComponentProps {
  domainScores: DomainScore[]
  title?: string
  height?: number
  showTwoDimensions?: boolean // แสดง 2 มิติ: สภาพที่เป็นอยู่ / สภาพที่พึงประสงค์
}

export default function RadarChartComponent({
  domainScores,
  title = 'ผลการประเมิน 4 มิติ',
  height = 400,
  showTwoDimensions = true,
}: RadarChartComponentProps) {
  const chartData = domainScores.map((domain) => ({
    domain: domain.groupName,
    'สภาพที่เป็นอยู่': domain.averageScore,
    'สภาพที่พึงประสงค์': domain.averageDesiredScore ?? 0,
    fullMark: 5,
  }))

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>

      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          ไม่มีข้อมูลสำหรับแสดงผล
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <RadarChart data={chartData}>
            <PolarGrid stroke="#e5e7eb" strokeOpacity={0.5} />
            <PolarAngleAxis
              dataKey="domain"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              style={{ fontWeight: 500 }}
            />
            <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fill: '#9ca3af', fontSize: 11 }} />
            <Radar
              name="สภาพที่เป็นอยู่"
              dataKey="สภาพที่เป็นอยู่"
              stroke="#7c3aed"
              fill="#7c3aed"
              fillOpacity={0.5}
              strokeWidth={2}
            />
            {showTwoDimensions && (
              <Radar
                name="สภาพที่พึงประสงค์"
                dataKey="สภาพที่พึงประสงค์"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
              formatter={(value: number) => [`${Number(value).toFixed(2)} / 5.00`, 'คะแนน']}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
          </RadarChart>
        </ResponsiveContainer>
      )}

      {/* Score Details - แสดง 2 มิติ */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {domainScores.map((domain) => (
          <div
            key={domain.groupId}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{domain.groupName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {domain.answeredIndicators} / {domain.totalIndicators} ตัวชี้วัด
              </p>
            </div>
            <div className="text-right space-y-1">
              <div className="flex items-center gap-2 justify-end">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">เป็นอยู่:</span>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {(domain.averageScore ?? 0).toFixed(2)}
                </p>
              </div>
              {showTwoDimensions && (
                <div className="flex items-center gap-2 justify-end">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">พึงประสงค์:</span>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {(domain.averageDesiredScore ?? 0).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
