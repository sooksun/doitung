// app/components/de/Logo.tsx
// TSQMn แม่ฟ้าหลวง brand mark + wordmark. The mark is the Doitung logo
// served from /public/brand/logo.png (swap the file to rebrand).

import React from 'react';

export function LogoMark({ size = 36, radius = 10 }: { size?: number; radius?: number }) {
  return (
    <img
      src="/brand/logo.png"
      alt="พัฒนาครูแม่ฟ้าหลวง"
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        flexShrink: 0,
        display: 'block',
        borderRadius: radius,
      }}
    />
  );
}

export interface LogoProps {
  size?: number;
  markSize?: number;
  light?: boolean;
  showWord?: boolean;
  sub?: boolean;
}

export function Logo({ size = 36, light = false, showWord = true, sub = true }: LogoProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {showWord ? (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
          <span
            style={{
              fontSize: size * 0.5,
              fontWeight: 700,
              letterSpacing: '0.02em',
              color: light ? '#fff' : 'var(--de-text-primary)',
              whiteSpace: 'nowrap',
            }}
          >
            พัฒนาครูแม่ฟ้าหลวง
          </span>
          {sub ? (
            <span
              style={{
                fontSize: size * 0.27,
                fontWeight: 400,
                color: light ? 'rgba(255,255,255,0.7)' : 'var(--de-text-tertiary)',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
              }}
            >
              Doitung Development Evaluation
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
