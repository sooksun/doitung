// app/components/de/index.ts
// TSQMn แม่ฟ้าหลวง design kit — public surface.
// Import from '@/app/components/de'. Kept separate from the legacy
// '@/app/components/ui' kit so un-migrated pages stay untouched.

export { DeIcon, DE_ICONS, type DeIconName, type DeIconProps } from './lucide-icons';
export { Logo, LogoMark, type LogoProps } from './Logo';
export {
  Button, Card, Badge, TrafficLight, Input, Avatar,
  trafficColor, trafficLabel,
  type ButtonProps, type ButtonVariant, type ButtonSize,
  type CardProps, type CardVariant,
  type BadgeProps, type BadgeTone, type BadgeVariant,
  type InputProps, type TrafficStatus,
} from './primitives';
export { SpiderChart, Sparkline, Donut, type SpiderDatum } from './charts';
export { StatCard, ProgressBar, PageHeader, Tabs, Toggle, Modal, type TabItem } from './data-display';
