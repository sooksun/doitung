'use client'

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { ComparisonData } from '@/lib/types'

// ลำดับกลุ่มตัวชี้วัด 4 กลุ่ม
const DOMAIN_ORDER = [
  'Q-Leadership ผู้บริหาร',
  'Q-PLC ชุมชนแห่งการเรียนรู้',
  'Q-Learning การจัดการเรียนรู้',
  'Q-Students ด้านนักเรียน',
]

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']

interface ComparisonChartProps {
  data: ComparisonData[]
  title?: string
}

export default function ComparisonChart({
  data,
  title = 'สัญญาณการพัฒนาตามกลุ่มตัวชี้วัด',
}: ComparisonChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          ไม่มีข้อมูลสำหรับแสดงผล
        </div>
      </div>
    )
  }

  // ใช้ข้อมูลล่าสุด - แปลงเป็น 4 แท่งตามกลุ่มตัวชี้วัด
  const latest = data[data.length - 1]
  const domainScores = latest.domainScores || {}

  // ดึง domain names จากข้อมูล และเรียงตาม DOMAIN_ORDER
  const domainKeys = Object.keys(domainScores)
  const orderedDomains = [
    ...DOMAIN_ORDER.filter((d) => domainKeys.includes(d)),
    ...domainKeys.filter((d) => !DOMAIN_ORDER.includes(d)),
  ]

  const chartData = orderedDomains.map((domainName, index) => ({
    name: domainName,
    คะแนน: domainScores[domainName] ?? 0,
    fill: COLORS[index % COLORS.length],
  }))

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {latest.semester ? `${latest.year} ${latest.semester}` : latest.year}
      </p>

      <ResponsiveContainer width="100%" height={350}>
        <RechartsBarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            angle={-25}
            textAnchor="end"
            height={90}
          />
          <YAxis domain={[0, 5]} tick={{ fill: '#6b7280' }} label={{ value: 'คะแนน', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [`${value.toFixed(2)} / 5.00`, 'คะแนน']}
          />
          <Bar dataKey="คะแนน" radius={[4, 4, 0, 0]} name="คะแนนเฉลี่ย">
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>

      {/* Legend - 4 กลุ่ม */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: item.fill }}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate" title={item.name}>
              {item.name}
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white ml-auto">
              {item.คะแนน.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
