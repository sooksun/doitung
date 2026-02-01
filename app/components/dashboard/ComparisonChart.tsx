'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { ComparisonData } from '@/lib/types'

interface ComparisonChartProps {
  data: ComparisonData[]
  title?: string
}

export default function ComparisonChart({
  data,
  title = 'การเปรียบเทียบข้อมูลหลายปี',
}: ComparisonChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          ไม่มีข้อมูลสำหรับแสดงผล
        </div>
      </div>
    )
  }

  // Transform data for line chart
  const chartData = data.map((item) => {
    const label = item.semester ? `${item.year} ${item.semester}` : item.year
    return {
      name: label,
      ...item.domainScores,
      'คะแนนรวม': item.overallScore,
    }
  })

  // Get all domain names
  const domains = data.length > 0 ? Object.keys(data[0].domainScores) : []

  // Color scheme for different domains
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            style={{ fontWeight: 500 }}
          />
          <YAxis
            domain={[0, 5]}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            label={{ value: 'คะแนน', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            formatter={(value: number) => value.toFixed(2)}
          />
          <Legend
            wrapperStyle={{
              paddingTop: '20px',
            }}
          />
          
          {/* Overall Score Line */}
          <Line
            type="monotone"
            dataKey="คะแนนรวม"
            stroke="#7c3aed"
            strokeWidth={3}
            dot={{ r: 5 }}
            activeDot={{ r: 7 }}
          />

          {/* Domain Lines */}
          {domains.map((domain, index) => (
            <Line
              key={domain}
              type="monotone"
              dataKey={domain}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend Details */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {domains.map((domain, index) => (
          <div key={domain} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="text-sm text-gray-700">{domain}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-purple-600" />
          <span className="text-sm font-semibold text-gray-900">คะแนนรวม</span>
        </div>
      </div>
    </div>
  )
}
