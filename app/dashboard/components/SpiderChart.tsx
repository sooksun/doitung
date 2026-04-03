// app/dashboard/components/SpiderChart.tsx
// Spider/Radar Chart component for Dashboard

'use client';

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ResponsiveContainer } from 'recharts';

export interface SpiderChartDataPoint {
  groupName: string;
  currentState: number;
  targetDesiredState: number;
}

interface SpiderChartProps {
  data: SpiderChartDataPoint[];
  height?: number;
}

export default function SpiderChart({ data, height = 400 }: SpiderChartProps) {
  // Transform data for Recharts - เรียงลำดับตาม data ที่ส่งมา (API จะเรียงให้แล้ว)
  const chartData = data.map((point) => ({
    group: point.groupName,
    'สภาพที่เป็นอยู่': point.currentState || 0, // ใช้ 0 ถ้าไม่มีข้อมูล
    'เป้าหมายการพัฒนา': point.targetDesiredState || 0, // ใช้ 0 ถ้าไม่มีข้อมูล
  }));

  if (data.length === 0) {
    return (
      <div
        style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center',
          color: '#666',
        }}
      >
        <p>ไม่มีข้อมูลสำหรับแสดงกราฟ</p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <h3
        style={{
          fontSize: '1.25rem',
          fontWeight: 'bold',
          marginBottom: '1.5rem',
          color: '#333',
          textAlign: 'center',
        }}
      >
        🕸️ Spider Graph - เปรียบเทียบคะแนนตามกลุ่มตัวชี้วัด
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={chartData}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="group"
            tick={{ fill: '#333', fontSize: 11, fontFamily: 'Kanit, sans-serif' }}
            style={{ fontFamily: 'Kanit, sans-serif' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            tick={{ fill: '#666', fontSize: 10 }}
            tickCount={6}
          />
          <Radar
            name="สภาพที่เป็นอยู่"
            dataKey="สภาพที่เป็นอยู่"
            stroke="#667eea"
            fill="#667eea"
            fillOpacity={0.3}
            strokeWidth={2}
            dot={{ fill: '#667eea', r: 4 }}
            connectNulls={false}
          />
          <Radar
            name="เป้าหมายการพัฒนา"
            dataKey="เป้าหมายการพัฒนา"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.3}
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            connectNulls={false}
          />
          <Legend
            wrapperStyle={{ fontFamily: 'Kanit, sans-serif', fontSize: '0.875rem' }}
            iconType="line"
          />
        </RadarChart>
      </ResponsiveContainer>
      <div
        style={{
          marginTop: '1rem',
          fontSize: '0.875rem',
          color: '#666',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'inline-flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '16px',
                height: '3px',
                background: '#667eea',
                borderRadius: '2px',
              }}
            />
            <span>สภาพที่เป็นอยู่ (1-5)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '16px',
                height: '3px',
                background: '#10b981',
                borderRadius: '2px',
              }}
            />
            <span>เป้าหมายการพัฒนา (จาก Set Goal)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

