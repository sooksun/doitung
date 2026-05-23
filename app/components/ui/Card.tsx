// app/components/ui/Card.tsx
'use client';

import React, { forwardRef } from 'react';

export type CardElevation = 'flat' | 'raised' | 'floating' | 'glass';
export type CardAccent = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'none';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: CardElevation;
  interactive?: boolean;
  accent?: CardAccent;
  /** Override padding (any CSS length). Defaults to the token --de-space-6. */
  padding?: string | number;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { elevation = 'raised', interactive = false, accent = 'none', padding, className, style, children, ...rest },
  ref,
) {
  const classes = [
    'de-card',
    `de-card--${elevation}`,
    accent !== 'none' ? `de-card--accent-${accent}` : '',
    interactive ? 'de-card--interactive' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  const mergedStyle: React.CSSProperties = padding != null ? { padding, ...style } : { ...style };

  return (
    <div ref={ref} className={classes} style={mergedStyle} {...rest}>
      {children}
    </div>
  );
});
