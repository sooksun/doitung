// app/live-dashboard/components/LiveIndicator.tsx
// Animated progress bar for dimension scores

'use client';

import { useEffect, useRef, useState } from 'react';

interface LiveIndicatorProps {
  nameTh: string;
  percent: number;
  status: 'green' | 'yellow' | 'red';
  showDelta?: boolean;
  prevPercent?: number;
  avgScore?: number;   // raw 1–5 average (สภาพที่เป็นอยู่). When provided + maxScore set,
  maxScore?: number;   // a "(3.5 / 5)" hint is rendered next to the percent.
}

const STATUS_COLOR: Record<string, string> = {
  green: '#34d399',
  yellow: '#fbbf24',
  red: '#f87171',
};

export default function LiveIndicator({
  nameTh,
  percent,
  status,
  prevPercent,
  avgScore,
  maxScore,
}: LiveIndicatorProps) {
  const [displayWidth, setDisplayWidth] = useState(prevPercent ?? percent);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const startVal = displayWidth;
    const endVal = Math.min(percent, 100);
    const startTime = performance.now();
    const duration = 700;

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayWidth(startVal + (endVal - startVal) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percent]);

  const delta = prevPercent !== undefined ? percent - prevPercent : 0;
  const deltaDisplay = delta > 0 ? `+${delta.toFixed(1)}% ▲` : delta < 0 ? `${delta.toFixed(1)}% ▼` : '';
  const color = STATUS_COLOR[status] || '#818cf8';

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.35rem',
        }}
      >
        <span
          style={{
            fontSize: '0.95rem',
            fontWeight: 600,
            color: '#e2e8f0',
            fontFamily: 'Kanit, sans-serif',
          }}
        >
          {nameTh}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {delta !== 0 && (
            <span
              style={{
                fontSize: '0.75rem',
                color: delta > 0 ? '#34d399' : '#f87171',
                fontWeight: 600,
              }}
            >
              {deltaDisplay}
            </span>
          )}
          <span style={{ fontSize: '1rem', fontWeight: 700, color }}>
            {Math.round(percent)}%
          </span>
          {avgScore !== undefined && maxScore !== undefined && maxScore > 0 && (
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.55)',
                fontFamily: 'Kanit, sans-serif',
              }}
            >
              ({avgScore.toFixed(1)} / {maxScore})
            </span>
          )}
        </div>
      </div>
      <div
        style={{
          width: '100%',
          height: '12px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '6px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${displayWidth}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            borderRadius: '6px',
            boxShadow: `0 0 8px ${color}80`,
            transition: 'none',
          }}
        />
      </div>
    </div>
  );
}
