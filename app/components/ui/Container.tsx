// app/components/ui/Container.tsx
'use client';

import React, { forwardRef } from 'react';

export type ContainerSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize;
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(function Container(
  { size = 'xl', className, children, ...rest },
  ref,
) {
  const classes = ['de-container', `de-container--${size}`, className || ''].filter(Boolean).join(' ');
  return (
    <div ref={ref} className={classes} {...rest}>
      {children}
    </div>
  );
});
