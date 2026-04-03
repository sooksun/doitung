// app/live-dashboard/components/LiveSpiderChart.tsx
// Large Spider/Radar Chart for Live Display Dashboard

'use client';

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface SpiderPoint {
  dimension: string;
  labelTh: string;
  current: number;
  target: number;
}

interface LiveSpiderChartProps {
  data: SpiderPoint[];
  height?: number;
}

export default function LiveSpiderChart({ data, height = 500 }: LiveSpiderChartProps) {
  const chartData = data.map((point) => ({
    group: point.labelTh,
    'สภาพที่เป็นอยู่': point.current || 0,
    'เป้าหมายการพัฒนา': point.target || 0,
  }));

  if (data.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height,
          color: 'rgba(255,255,255,0.5)',
          fontSize: '1.1rem',
        }}
      >
        ยังไม่มีข้อมูลการประเมิน
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={chartData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
          <PolarGrid stroke="rgba(255,255,255,0.2)" />
          <PolarAngleAxis
            dataKey="group"
            tick={{
              fill: '#e2e8f0',
              fontSize: 13,
              fontFamily: 'Kanit, sans-serif',
              fontWeight: 500,
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            tickCount={6}
            stroke="rgba(255,255,255,0.1)"
          />
          <Radar
            name="สภาพที่เป็นอยู่"
            dataKey="สภาพที่เป็นอยู่"
            stroke="#818cf8"
            fill="#818cf8"
            fillOpacity={0.35}
            strokeWidth={2.5}
            dot={{ fill: '#818cf8', r: 5 }}
            connectNulls={false}
          />
          <Radar
            name="เป้าหมายการพัฒนา"
            dataKey="เป้าหมายการพัฒนา"
            stroke="#34d399"
            fill="#34d399"
            fillOpacity={0.25}
            strokeWidth={2.5}
            dot={{ fill: '#34d399', r: 5 }}
            connectNulls={false}
          />
          <Legend
            wrapperStyle={{
              fontFamily: 'Kanit, sans-serif',
              fontSize: '0.9rem',
              color: '#e2e8f0',
              paddingTop: '16px',
            }}
            iconType="line"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
