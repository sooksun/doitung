// app/components/ui/Badge.tsx
'use client';

import React from 'react';

export type BadgeTone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type BadgeVariant = 'soft' | 'solid' | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  dot?: boolean;
  icon?: React.ReactNode;
}

export function Badge({
  tone = 'neutral',
  variant = 'soft',
  dot = false,
  icon,
  className,
  children,
  ...rest
}: BadgeProps) {
  const classes = ['de-badge', `de-badge--${tone}`, `de-badge--${variant}`, className || '']
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...rest}>
      {dot && <span className="de-badge__dot" aria-hidden="true" />}
      {icon && (
        <span className="de-badge__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}
