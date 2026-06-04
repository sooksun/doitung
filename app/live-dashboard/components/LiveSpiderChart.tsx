// app/live-dashboard/components/LiveSpiderChart.tsx
// Spider/Radar chart for the Live Dashboard — tokens v2 (PRD §3.1)
// score (พึงประสงค์, blue) vs score2 (เป็นอยู่, violet). DO NOT swap colors.

'use client';

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';

interface SpiderPoint {
  dimension: string;
  labelTh: string;
  current: number;   // avg score2 — สภาพที่เป็นอยู่
  target: number;    // avg score  — เป้าหมาย/พึงประสงค์
}

interface LiveSpiderChartProps {
  data: SpiderPoint[];
  height?: number;
  dark?: boolean;
}

// Mirror of tokens — recharts wants concrete colors, not CSS variables.
const COLOR_BLUE = '#3b82f6';     // --de-score-blue (target / พึงประสงค์)
const COLOR_VIOLET = '#a855f7';   // --de-score-violet (current / เป็นอยู่)

export default function LiveSpiderChart({ data, height = 420, dark = true }: LiveSpiderChartProps) {
  // recharts wants concrete colors; tick/grid must adapt to light vs dark.
  const tickAngle = dark ? 'rgba(226, 232, 240, 0.85)' : '#334155';
  const tickRadius = dark ? 'rgba(148, 163, 184, 0.7)' : '#64748b';
  const gridStroke = dark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(100, 116, 139, 0.3)';
  const chartData = data.map((p) => ({
    group: p.labelTh,
    'พึงประสงค์': p.target || 0,
    'เป็นอยู่': p.current || 0,
  }));

  if (data.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height,
          color: 'var(--de-ink-500)',
          fontSize: '14px',
        }}
      >
        ยังไม่มีข้อมูลการประเมิน
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={chartData} margin={{ top: 24, right: 40, bottom: 16, left: 40 }}>
          <PolarGrid stroke={gridStroke} />
          <PolarAngleAxis
            dataKey="group"
            tick={{
              fill: tickAngle,
              fontSize: 13,
              fontFamily: 'Kanit, sans-serif',
              fontWeight: 500,
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            tick={{ fill: tickRadius, fontSize: 11 }}
            tickCount={6}
            stroke="transparent"
          />
          <Radar
            name="พึงประสงค์"
            dataKey="พึงประสงค์"
            stroke={COLOR_BLUE}
            fill={COLOR_BLUE}
            fillOpacity={0.22}
            strokeWidth={2.5}
            dot={{ fill: COLOR_BLUE, r: 4 }}
            connectNulls={false}
          />
          <Radar
            name="เป็นอยู่"
            dataKey="เป็นอยู่"
            stroke={COLOR_VIOLET}
            fill={COLOR_VIOLET}
            fillOpacity={0.22}
            strokeWidth={2.5}
            dot={{ fill: COLOR_VIOLET, r: 4 }}
            connectNulls={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
