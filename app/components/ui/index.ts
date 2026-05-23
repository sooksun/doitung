// app/components/ui/index.ts
// DE Design System v2 — primitive barrel. Import via: `import { Button } from '@/app/components/ui';`

export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export { Card } from './Card';
export type { CardProps, CardElevation, CardAccent } from './Card';

export { Input } from './Input';
export type { InputProps } from './Input';

export { Badge } from './Badge';
export type { BadgeProps, BadgeTone, BadgeVariant } from './Badge';

export { Container } from './Container';
export type { ContainerProps, ContainerSize } from './Container';

export { ThemeProvider, ThemeToggle, useTheme } from './ThemeProvider';
export type { Theme, ThemeToggleProps } from './ThemeProvider';

export * as Icons from './icons';
export type { IconProps } from './icons';
