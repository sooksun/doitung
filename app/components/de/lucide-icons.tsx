// app/components/de/lucide-icons.tsx
// TSQMn redesign — icon registry mapping the prototype's icon names to
// lucide-react components. New components reference icons by string name
// (e.g. <DeIcon name="home" />) so markup stays close to the design source.
'use client';

import {
  Home, Activity, ClipboardList, FileText, Wrench, Folder, School, Network,
  UserRound, Users, Settings, Search, Bell, Sun, Moon,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Menu, X, Plus, Check,
  CheckCircle2, ShieldCheck, LayoutDashboard, Layers, Download, RefreshCw,
  Filter, ArrowUp, ArrowDown, ArrowRight, LogOut, Pencil, Trash2, Printer,
  Eye, EyeOff, Mail, Lock, Calendar, Clock, TrendingUp, TrendingDown,
  Sparkles, Target, LineChart, BarChart3, LayoutGrid, Dot, Save, Info,
  AlertTriangle, ArrowUpDown, MoreVertical, Play, Pause, Star, BookOpen,
  Globe, Phone, MapPin,
  type LucideIcon, type LucideProps,
} from 'lucide-react';

export const DE_ICONS = {
  home: Home,
  activity: Activity,
  clipboard: ClipboardList,
  fileText: FileText,
  tool: Wrench,
  folder: Folder,
  school: School,
  network: Network,
  userTie: UserRound,
  users: Users,
  settings: Settings,
  search: Search,
  bell: Bell,
  sun: Sun,
  moon: Moon,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  menu: Menu,
  x: X,
  plus: Plus,
  check: Check,
  checkCircle: CheckCircle2,
  shieldCheck: ShieldCheck,
  layout: LayoutDashboard,
  layers: Layers,
  download: Download,
  refresh: RefreshCw,
  filter: Filter,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  arrowRight: ArrowRight,
  logout: LogOut,
  edit: Pencil,
  trash: Trash2,
  printer: Printer,
  eye: Eye,
  eyeOff: EyeOff,
  mail: Mail,
  lock: Lock,
  calendar: Calendar,
  clock: Clock,
  trendUp: TrendingUp,
  trendDown: TrendingDown,
  sparkles: Sparkles,
  target: Target,
  chart: LineChart,
  barChart: BarChart3,
  grid: LayoutGrid,
  dot: Dot,
  save: Save,
  info: Info,
  alert: AlertTriangle,
  sortAsc: ArrowUpDown,
  more: MoreVertical,
  play: Play,
  pause: Pause,
  star: Star,
  book: BookOpen,
  globe: Globe,
  phone: Phone,
  mapPin: MapPin,
} satisfies Record<string, LucideIcon>;

export type DeIconName = keyof typeof DE_ICONS;

export interface DeIconProps extends Omit<LucideProps, 'ref'> {
  name: DeIconName;
}

/** Render a registered icon by name. Inherits color via currentColor. */
export function DeIcon({ name, size = 20, strokeWidth = 2, ...rest }: DeIconProps) {
  const Cmp = DE_ICONS[name];
  if (!Cmp) return null;
  return <Cmp size={size} strokeWidth={strokeWidth} {...rest} />;
}
