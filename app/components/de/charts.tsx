// app/components/de/charts.tsx
// TSQMn redesign — lightweight inline SVG charts (no chart lib dependency).
'use client';

import React, { useId } from 'react';

export interface SpiderDatum {
  axis: string; // may contain \n for multi-line labels
  current: number;
  target: number;
}

export function SpiderChart({
  data,
  size = 320,
  max = 5,
  showTarget = true,
  levels = 5,
}: {
  data: SpiderDatum[];
  size?: number;
  max?: number;
  showTarget?: boolean;
  levels?: number;
}) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 56;
  const n = data.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (val: number, i: number): [number, number] => {
    const rad = (val / max) * r;
    return [cx + rad * Math.cos(angle(i)), cy + rad * Math.sin(angle(i))];
  };
  const poly = (key: 'current' | 'target') => data.map((d, i) => pt(d[key], i).join(',')).join(' ');
  const gridPolys: string[] = [];
  for (let l = 1; l <= levels; l++) {
    const rr = (r * l) / levels;
    gridPolys.push(data.map((_, i) => [cx + rr * Math.cos(angle(i)), cy + rr * Math.sin(angle(i))].join(',')).join(' '));
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', maxWidth: size, height: 'auto', overflow: 'visible' }}>
      {gridPolys.map((p, i) => (
        <polygon key={'g' + i} points={p} fill="none" stroke="var(--de-border)" strokeWidth={1} />
      ))}
      {data.map((_, i) => {
        const [x, y] = pt(max, i);
        return <line key={'ax' + i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--de-border)" strokeWidth={1} />;
      })}
      {showTarget ? (
        <polygon points={poly('target')} fill="rgba(96,165,250,0.12)" stroke="var(--de-blue-400)" strokeWidth={2} strokeDasharray="5 4" />
      ) : null}
      <polygon points={poly('current')} fill="rgba(167,139,250,0.18)" stroke="var(--de-purple-400)" strokeWidth={2.5} style={{ transition: 'all 0.6s var(--ease)' }} />
      {data.map((d, i) => {
        const [x, y] = pt(d.current, i);
        return <circle key={'c' + i} cx={x} cy={y} r={4} fill="var(--de-purple-500)" stroke="var(--de-bg-surface)" strokeWidth={2} />;
      })}
      {data.map((d, i) => {
        const [x, y] = pt(max * 1.16, i);
        const lines = d.axis.split('\n');
        return (
          <text
            key={'t' + i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: 11, fontWeight: 500, fill: 'var(--de-text-secondary)', fontFamily: 'var(--de-font-sans)' }}
          >
            {lines.map((ln, li) => (
              <tspan key={li} x={x} dy={li === 0 ? -(lines.length - 1) * 6 : 12}>{ln}</tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}

export function Sparkline({
  data,
  width = 120,
  height = 36,
  color = 'var(--de-purple-500)',
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((d, i) => [(i / (data.length - 1)) * width, height - ((d - min) / (max - min || 1)) * (height - 4) - 2]);
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.join(',')).join(' ');
  const area = path + ` L${width},${height} L0,${height} Z`;
  const gid = 'spark-' + useId().replace(/:/g, '');
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1={0} y1={0} x2={0} y2={1}>
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Donut({
  value,
  size = 132,
  stroke = 14,
  color = 'var(--de-purple-500)',
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--de-bg-subtle)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          style={{ transition: 'stroke-dashoffset 0.8s var(--ease)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>{value}%</span>
        {label ? <span style={{ fontSize: 12, color: 'var(--de-text-secondary)' }}>{label}</span> : null}
      </div>
    </div>
  );
}
