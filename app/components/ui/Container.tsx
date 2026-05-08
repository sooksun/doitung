// app/components/ui/Container.tsx
// Max-width content wrapper.

'use client';

import { CSSProperties, HTMLAttributes } from 'react';

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap: Record<NonNullable<ContainerProps['size']>, string> = {
  sm: '640px',
  md: '880px',
  lg: '1120px',
  xl: '1280px',
};

export default function Container({ size = 'lg', style, children, ...rest }: ContainerProps) {
  const base: CSSProperties = {
    width: '100%',
    maxWidth: sizeMap[size],
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: 'var(--de-space-6)',
    paddingRight: 'var(--de-space-6)',
    ...style,
  };
  return (
    <div style={base} {...rest}>
      {children}
    </div>
  );
}
