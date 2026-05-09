// app/live-dashboard/components/LiveIndicator.tsx
// Animated progress bar for dimension scores — DE Design v2 (PRD §3.1)
//
// NOTE: The new /live-dashboard layout draws its own dimension cards directly
// (see ld-dim-card classes in dashboard.css). This component is preserved
// in case it's reused elsewhere — restyled to use tokens v2.

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

const STATUS_VAR: Record<LiveIndicatorProps['status'], string> = {
  green: 'var(--de-success-500)',
  yellow: 'var(--de-warning-500)',
  red: 'var(--de-danger-500)',
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
  const color = STATUS_VAR[status];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
        }}
      >
        <span
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--de-ink-800)',
            fontFamily: 'var(--de-font-sans)',
          }}
        >
          {nameTh}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {delta !== 0 && (
            <span
              style={{
                fontSize: '12px',
                color: delta > 0 ? 'var(--de-success-500)' : 'var(--de-danger-500)',
                fontWeight: 600,
              }}
            >
              {deltaDisplay}
            </span>
          )}
          <span style={{ fontSize: '15px', fontWeight: 700, color }}>
            {Math.round(percent)}%
          </span>
          {avgScore !== undefined && maxScore !== undefined && maxScore > 0 && (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--de-ink-500)',
                fontFamily: 'var(--de-font-sans)',
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
          height: '8px',
          background: 'color-mix(in oklab, var(--de-ink-300) 25%, transparent)',
          borderRadius: 'var(--de-radius-pill)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${displayWidth}%`,
            height: '100%',
            background: `linear-gradient(90deg, color-mix(in oklab, ${color} 60%, transparent), ${color})`,
            borderRadius: 'inherit',
          }}
        />
      </div>
    </div>
  );
}
