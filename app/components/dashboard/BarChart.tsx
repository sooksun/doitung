'use client'

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { DomainScore } from '@/lib/types'

interface BarChartProps {
  domainScores: DomainScore[]
  title?: string
  height?: number
  showTwoDimensions?: boolean
}

export default function BarChartComponent({
  domainScores,
  title = 'คะแนนเฉลี่ยรายด้าน',
  height = 350,
  showTwoDimensions = true,
}: BarChartProps) {
  const chartData = domainScores.map((d) => ({
    name: d.groupName,
    'สภาพที่เป็นอยู่': d.averageScore,
    'สภาพที่พึงประสงค์': d.averageDesiredScore ?? 0,
  }))

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          ไม่มีข้อมูลสำหรับแสดงผล
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis domain={[0, 5]} tick={{ fill: '#6b7280' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [`${value.toFixed(2)} / 5.00`, '']}
          />
          <Legend />
          <Bar dataKey="สภาพที่เป็นอยู่" fill="#7c3aed" radius={[4, 4, 0, 0]} name="สัญญาณปัจจุบัน" />
          {showTwoDimensions && (
            <Bar
              dataKey="สภาพที่พึงประสงค์"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              name="ทิศทางที่พึงประสงค์"
            />
          )}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}
