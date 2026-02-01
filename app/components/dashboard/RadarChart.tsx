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
}

export default function RadarChartComponent({
  domainScores,
  title = 'ผลการประเมิน 4 มิติ',
  height = 400,
}: RadarChartComponentProps) {
  // Transform data for Recharts
  const chartData = domainScores.map((domain) => ({
    domain: domain.groupName,
    คะแนน: domain.averageScore,
    fullMark: 5,
  }))

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          ไม่มีข้อมูลสำหรับแสดงผล
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <RadarChart data={chartData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="domain"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              style={{ fontWeight: 500 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 5]}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
            />
            <Radar
              name="คะแนนเฉลี่ย"
              dataKey="คะแนน"
              stroke="#7c3aed"
              fill="#7c3aed"
              fillOpacity={0.6}
              strokeWidth={2}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
              formatter={(value: number) => [`${value.toFixed(2)} / 5.00`, 'คะแนน']}
            />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      )}

      {/* Score Details */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {domainScores.map((domain) => (
          <div
            key={domain.groupId}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{domain.groupName}</p>
              <p className="text-xs text-gray-500 mt-1">
                {domain.answeredIndicators} / {domain.totalIndicators} ตัวชี้วัด
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary-600">
                {domain.averageScore.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">/ 5.00</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
