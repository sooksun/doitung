# PRD — DE Platform UX/UI Redesign
**ระบบ Doitung Development Evaluation (DE)**
Version 1.0 | 2026-06-04 | Author: sooksun

---

## 1. Executive Summary

### ปัญหาปัจจุบัน
- แต่ละหน้าใช้ inline style ที่ไม่สอดคล้องกัน
- ไม่มี persistent navigation — ผู้ใช้ต้องกลับ `/` ทุกครั้งเพื่อเปลี่ยนหน้า
- ไม่มี Landing page — กด URL โดนหน้า login ทันที ขาด brand story
- Design System v2 ยังไม่ rollout ครบ (มีแค่ `/login`)
- สี / ขนาด / spacing ไม่ consistent ข้ามหน้า

### เป้าหมาย
ออกแบบ UX/UI ใหม่ทั้งระบบ ให้ได้:
- **Clean Minimal** — white space, ลดความรกของ UI
- **Shell Layout** — Left Sidebar + Top Header ถาวร ทุกหน้า
- **Landing Page** — ก่อน login มี hero + feature showcase
- **Color Tone** — ม่วง–น้ำเงิน–ขาว (Purple-Blue-White)
- **Dark / Light Mode** — ทำงานทุกหน้า
- **Logic เดิมทุกอย่าง** — ไม่เปลี่ยน API, business rule, data model

---

## 2. Scope

### In Scope (ทำใหม่)
| Layer | รายละเอียด |
|---|---|
| Shell | Left sidebar, Top header, Content wrapper |
| Landing Page | Hero, Features, Stats, CTA |
| Design Tokens | Color palette ใหม่ (Purple-Blue-White), spacing, radius, shadow |
| Typography | Font scale, weight, line-height |
| Component Library | Button, Card, Badge, Input, Table, Modal, Alert |
| Navigation UX | Role-based menu, breadcrumb, active state |
| Dark/Light Mode | ครบทุก token และ component |
| Page Templates | 5 layouts (Dashboard, Form, List, Detail, Print) |

### Out of Scope (ไม่แตะ)
- API routes, business logic, DB schema
- Authentication flow (ใช้ JWT เดิม, แค่ reskin UI)
- Real-time polling interval
- AI features (SAR, SOAR, Exec Summary)

---

## 3. Users & Roles

| Role | Thai | สิทธิ์ที่เห็น |
|---|---|---|
| ADMIN | ผู้ดูแลระบบ | ทุกอย่าง รวม Admin section |
| SCHOOL_LEADER | ผู้อำนวยการโรงเรียน | Dashboard, Evaluations, Evidence, SAR |
| TEACHER | ครู | Assessment form ของตัวเอง + Evidence |
| SUPERVISOR | ศึกษานิเทศก์ | Dashboard, Reports (read-only) |

---

## 4. Color System (Design Tokens)

### 4.1 Brand Palette

#### Primary — Purple
```
--de-purple-50:   #F5F3FF
--de-purple-100:  #EDE9FE
--de-purple-200:  #DDD6FE
--de-purple-300:  #C4B5FD
--de-purple-400:  #A78BFA
--de-purple-500:  #8B5CF6   ← primary interactive
--de-purple-600:  #7C3AED   ← hover / pressed
--de-purple-700:  #6D28D9   ← dark accent
--de-purple-800:  #5B21B6
--de-purple-900:  #4C1D95
```

#### Secondary — Blue
```
--de-blue-50:    #EFF6FF
--de-blue-100:   #DBEAFE
--de-blue-200:   #BFDBFE
--de-blue-300:   #93C5FD
--de-blue-400:   #60A5FA
--de-blue-500:   #3B82F6   ← secondary interactive
--de-blue-600:   #2563EB   ← hover / pressed
--de-blue-700:   #1D4ED8
--de-blue-800:   #1E40AF
--de-blue-900:   #1E3A8A
```

#### Neutral — Slate (Backgrounds & Text)
```
--de-slate-0:    #FFFFFF
--de-slate-50:   #F8FAFC
--de-slate-100:  #F1F5F9
--de-slate-200:  #E2E8F0
--de-slate-300:  #CBD5E1
--de-slate-400:  #94A3B8
--de-slate-500:  #64748B
--de-slate-600:  #475569
--de-slate-700:  #334155
--de-slate-800:  #1E293B
--de-slate-900:  #0F172A
--de-slate-950:  #020617
```

#### Semantic
```
--de-success:    #10B981  (Emerald-500)
--de-warning:    #F59E0B  (Amber-500)
--de-danger:     #EF4444  (Red-500)
--de-info:       #3B82F6  (Blue-500)
```

### 4.2 Semantic Aliases (Light Mode)

| Token | Light Value | Dark Value |
|---|---|---|
| `--de-bg-canvas` | `--de-slate-50` (#F8FAFC) | `--de-slate-950` (#020617) |
| `--de-bg-surface` | `#FFFFFF` | `--de-slate-900` (#0F172A) |
| `--de-bg-elevated` | `#FFFFFF` | `--de-slate-800` (#1E293B) |
| `--de-bg-sidebar` | `--de-purple-900` (#4C1D95) | `--de-slate-950` (#020617) |
| `--de-bg-sidebar-hover` | `--de-purple-800` (#5B21B6) | `--de-slate-800` (#1E293B) |
| `--de-bg-sidebar-active` | `--de-purple-700` (#6D28D9) | `--de-purple-900` (#4C1D95) |
| `--de-text-primary` | `--de-slate-900` | `--de-slate-50` |
| `--de-text-secondary` | `--de-slate-500` | `--de-slate-400` |
| `--de-text-sidebar` | `rgba(255,255,255,0.85)` | `rgba(255,255,255,0.80)` |
| `--de-text-sidebar-active` | `#FFFFFF` | `#FFFFFF` |
| `--de-border` | `--de-slate-200` | `--de-slate-700` |
| `--de-border-focus` | `--de-purple-500` | `--de-purple-400` |

### 4.3 Gradient

```css
--de-gradient-brand:   linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)
--de-gradient-hero:    linear-gradient(135deg, #4C1D95 0%, #1E3A8A 60%, #1D4ED8 100%)
--de-gradient-card:    linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(59,130,246,0.08) 100%)
--de-gradient-sidebar: linear-gradient(180deg, #4C1D95 0%, #1E3A8A 100%)
```

---

## 5. Typography

| Token | Value |
|---|---|
| `--de-font-sans` | Kanit, system-ui, sans-serif |
| `--de-font-mono` | JetBrains Mono, monospace |

### Type Scale

| Name | Size | Weight | Line-height | ใช้กับ |
|---|---|---|---|---|
| `display-2xl` | 72px | 700 | 1.1 | Hero headline |
| `display-xl` | 48px | 700 | 1.15 | Section title |
| `display-lg` | 36px | 700 | 1.2 | Page title |
| `heading-1` | 30px | 600 | 1.3 | H1 |
| `heading-2` | 24px | 600 | 1.35 | H2, card title |
| `heading-3` | 20px | 600 | 1.4 | H3, section label |
| `body-lg` | 18px | 400 | 1.6 | Body text large |
| `body-md` | 16px | 400 | 1.6 | Body text default |
| `body-sm` | 14px | 400 | 1.5 | Helper, meta |
| `label` | 14px | 500 | 1.4 | Form label, nav item |
| `caption` | 12px | 400 | 1.5 | Caption, timestamp |
| `code` | 14px | 400 | 1.6 | Code, IDs |

---

## 6. Spacing & Radius

### Spacing Scale (ใช้ multiples of 4px)
```
xs:   4px
sm:   8px
md:  16px
lg:  24px
xl:  32px
2xl: 48px
3xl: 64px
4xl: 96px
```

### Border Radius
```
--de-radius-sm:   4px   (input, tag)
--de-radius-md:   8px   (card, button)
--de-radius-lg:  12px   (modal, panel)
--de-radius-xl:  16px   (hero card, feature card)
--de-radius-full: 9999px (pill badge, avatar)
```

### Shadow
```
--de-shadow-xs:  0 1px 2px rgba(0,0,0,0.05)
--de-shadow-sm:  0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)
--de-shadow-md:  0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)
--de-shadow-lg:  0 10px 15px rgba(0,0,0,0.10), 0 4px 6px rgba(0,0,0,0.05)
--de-shadow-xl:  0 20px 25px rgba(0,0,0,0.10), 0 8px 10px rgba(0,0,0,0.04)
```

---

## 7. Shell Layout

### 7.1 Structure

```
┌──────────────────────────────────────────────────────────┐
│  SIDEBAR (240px)  │  TOP HEADER (60px)                   │
│                   ├──────────────────────────────────────┤
│  [Logo]           │  CONTENT AREA                        │
│                   │                                      │
│  [Nav Items]      │  (ทุก page render ที่นี่)             │
│                   │                                      │
│  [Admin Section]  │                                      │
│                   │                                      │
│  ─────────────    │                                      │
│  [User Profile]   │                                      │
│  [Theme Toggle]   │                                      │
└──────────────────────────────────────────────────────────┘
```

### 7.2 Sidebar Spec

| Property | Value |
|---|---|
| Width (expanded) | 240px |
| Width (collapsed) | 64px |
| Background | `--de-gradient-sidebar` (ม่วงเข้ม → น้ำเงิน) |
| Position | Fixed left, full height |
| Z-index | 30 |
| Collapse trigger | Icon button ที่ top |
| Mobile behavior | Overlay drawer (slide in from left), backdrop overlay |

#### Logo Zone (top 64px)
- Logo mark (icon) + "DE" wordmark
- เมื่อ collapsed: แสดงแค่ logo mark
- ขอบล่าง: 1px divider (rgba(255,255,255,0.12))

#### Nav Item
```
State: Default
  Background: transparent
  Text: rgba(255,255,255,0.75)
  Icon: rgba(255,255,255,0.6)

State: Hover
  Background: rgba(255,255,255,0.10)
  Text: rgba(255,255,255,0.95)
  Icon: rgba(255,255,255,0.85)

State: Active
  Background: rgba(255,255,255,0.18)
  Left border: 3px solid #A78BFA (Purple-400)
  Text: #FFFFFF
  Icon: #FFFFFF
```

- Padding: 10px 16px
- Border-radius: 8px (margin: 4px 8px)
- Icon size: 20px (จาก icons.tsx)
- Label: 14px / weight 500 / Kanit

#### Nav Structure (Role-based)
```
Everyone
  ├─ 🏠 หน้าหลัก (Dashboard)         /dashboard
  ├─ 📡 Live Dashboard                 /live-dashboard
  ├─ 📋 รายการประเมิน                 /evaluations
  ├─ 📄 รายงาน                        /reports
  └─ 🔧 เครื่องมือประเมิน            /instruments

Admin / School Leader only
  ─── Admin ─────────────────────
  ├─ 📁 เอกสาร SAR                    /admin/sar
  ├─ 🏫 โรงเรียน                      /admin/schools
  ├─ 🕸️ เครือข่าย                    /admin/networks
  ├─ 👤 ผู้อำนวยการ                   /admin/school-directors
  ├─ 👥 ผู้ใช้งาน                     /users
  └─ ⚙️ ตั้งค่า Feature Flags         /admin/settings/feature-flags

Bottom (always)
  ├─ 🌗 Dark / Light toggle
  └─ 👤 ชื่อผู้ใช้ + Role badge + Logout
```

### 7.3 Top Header Spec

| Property | Value |
|---|---|
| Height | 60px |
| Background | `--de-bg-surface` (white / dark-900) |
| Border bottom | 1px solid `--de-border` |
| Left padding | sidebar-width + 24px |
| Position | Fixed top, full width |

#### Layout (left → right)
```
[Breadcrumb]          [Search Bar (max 360px)]    [Notifications]  [Avatar]
```

- **Breadcrumb**: link chain — `หน้าหลัก / รายการประเมิน / ประเมิน #42`
- **Search Bar**: global search placeholder `"ค้นหา โรงเรียน, ครู, เครื่องมือ…"` / icon แว่นขยาย / shortcut badge `⌘K`
- **Notifications bell**: count badge
- **Avatar**: initials circle + dropdown (โปรไฟล์, ออกจากระบบ)

### 7.4 Content Area

| Property | Value |
|---|---|
| Margin left | 240px (collapsed: 64px) |
| Margin top | 60px |
| Min-height | calc(100vh - 60px) |
| Background | `--de-bg-canvas` |
| Padding | 32px |
| Max-width | 1400px (centered for wide screens) |

---

## 8. Landing Page

**Route**: `/` (ก่อน login, public)
**Goal**: แสดง brand story + ฟีเจอร์หลัก + CTA ไปหน้า login

### 8.1 Sections

#### Section 1 — Navbar (top, transparent → solid on scroll)
```
[Logo]  [ฟีเจอร์] [เกี่ยวกับ] [ติดต่อ]              [เข้าสู่ระบบ →]
```
- Fixed top, z-index 50
- ก่อน scroll: `background: transparent`
- หลัง scroll 40px: `background: rgba(255,255,255,0.92)` + blur backdrop-filter

#### Section 2 — Hero
```
Background: --de-gradient-hero (ม่วงเข้ม → น้ำเงิน, full viewport)
Pattern overlay: subtle grid/dot pattern (opacity 0.06)

[Left Column — 60%]
  หัวข้อหลัก (display-xl, white):
    "ระบบประเมินและพัฒนา
     คุณภาพโรงเรียน"
  
  คำอธิบาย (body-lg, rgba(255,255,255,0.80)):
    "รองรับ Q-Model, THAI P.1–3 และ DERS
     ครบวงจรตั้งแต่การประเมินถึงรายงาน AI"
  
  [เริ่มต้นใช้งาน]  [ดูการสาธิต]
  (Button: gradient white-fill / ghost white)

[Right Column — 40%]
  Dashboard preview card (floating, slight rotation)
  Glass-morphism card แสดง Spider chart + stat numbers
  Background blur: --de-shadow-xl
```

#### Section 3 — Stats Bar
```
Background: white (light) / slate-900 (dark)
Border top/bottom: 1px --de-border

[โรงเรียนทั้งหมด] [ครูที่ประเมินแล้ว] [รอบการประเมิน] [เครื่องมือ]
      47+                 320+               3                 3
  แบบทดสอบ            ผู้ใช้งาน          ปีการศึกษา        Q-Model, THAI, DERS
```
- Grid 4 columns
- Number: display-lg, purple-600
- Label: body-sm, slate-500

#### Section 4 — Features Grid
```
Background: --de-slate-50 (light) / --de-slate-950 (dark)

Title: "ฟีเจอร์ที่ออกแบบมาเพื่อโรงเรียน"

Feature Cards (3 columns × 2 rows = 6 cards):
  1. Q-Model Assessment      icon: CheckCircle   color: purple
     "ประเมิน 47 ตัวชี้วัด 4 มิติ ด้วย Likert 1-5"
  
  2. THAI P.1–3 Dual Review  icon: Users         color: blue
     "ประเมินร่วมกัน ครู + ผอ. แบบ Teacher-Pair"
  
  3. Live Dashboard           icon: Activity      color: indigo
     "แดชบอร์ดสดรีเฟรชทุก 5 วินาที Spider chart"
  
  4. SAR + AI Analysis        icon: FileText      color: violet
     "อัปโหลด SAR → AI SOAR Analysis อัตโนมัติ"
  
  5. Sticky Brainstorm        icon: Layout        color: blue
     "Iceberg Model + กระดาน Post-it ออนไลน์"
  
  6. Multi-Role Access        icon: ShieldCheck   color: purple
     "จัดการสิทธิ์ ADMIN, ผอ., ครู, ศน. แยกกัน"
```
- Card: white bg, radius-xl, shadow-md, hover lift
- Icon: 40×40 กล่อง gradient soft (purple-50 → blue-50)

#### Section 5 — How it Works (3 Steps)
```
Background: white

"วิธีการทำงาน"

Step 1: สร้างรอบการประเมิน  →  Step 2: ครูทำแบบประเมิน  →  Step 3: ดูรายงานและแดชบอร์ด
        (Admin สร้าง session)         (Likert form, auto-save)        (Spider, AI summary, PDF)
```
- Connected with dashed line + arrow
- Each step: number circle (gradient) + title + description

#### Section 6 — CTA Banner
```
Background: --de-gradient-brand (purple → blue)

"พร้อมเริ่มต้นแล้วหรือยัง?"
"ระบบพร้อมใช้งาน เข้าสู่ระบบได้เลย"

[เข้าสู่ระบบ] (Button: white, large)
```

#### Section 7 — Footer
```
Background: --de-slate-900

[Logo + "DE Platform"]    [ลิงก์ด่วน]    [ติดต่อ]
                           หน้าหลัก
                           ประเมิน
                           รายงาน
                           เอกสาร

Copyright 2025–2026 Doitung CNPPAI. All rights reserved.
```

---

## 9. Login Page

**Route**: `/login`
**เข้าถึงได้**: public, redirect ไป `/dashboard` ถ้า login แล้ว

### Layout
- Full viewport, 2 columns (≥768px) / 1 column (mobile)
- Left panel (55%): decorative — gradient hero + platform tagline + floating stats
- Right panel (45%): login form

### Left Panel
```
Background: --de-gradient-hero
Pattern: subtle grid overlay

[Logo]
"เข้าสู่ระบบระบบประเมิน"
"DE: Development Evaluation Platform"

Stats chips (floating):
  ✅ 47 ตัวชี้วัด Q-Model
  ✅ THAI P.1-3 Teacher-Pair
  ✅ AI SAR Analysis
```

### Right Panel
```
Background: --de-bg-surface (white / dark-900)

[Logo small + "DE Platform"]

"ยินดีต้อนรับกลับ"
"เข้าสู่ระบบด้วยบัญชีของคุณ"

[Input: อีเมล]
[Input: รหัสผ่าน + show/hide toggle]
[Button: เข้าสู่ระบบ (primary, full-width, large)]

[Theme toggle bottom-right]
```

---

## 10. Page Templates

### Template A — Dashboard
```
Header: ชื่อหน้า + date range picker + action buttons (Export, Refresh)
Body:
  Row 1: KPI Cards (4 columns) — stat + trend
  Row 2: Main chart (2/3) + summary table (1/3)
  Row 3: Detail breakdown
Footer: Last updated timestamp
```

### Template B — List Page
```
Header: ชื่อหน้า + [+ สร้างใหม่] button
Toolbar: Search input + Filters (dropdowns) + Sort
Table:
  - Sticky column header
  - Row hover highlight
  - Pagination footer
Empty state: illustration + CTA
```

### Template C — Form / Create
```
Header: ชื่อหน้า + breadcrumb
Layout: Single column (max 720px centered)
  - Card sections for logical grouping
  - Label + input pairs (16px gap)
  - Error messages inline (red, icon)
Footer bar (fixed): [Cancel] [Save] (sticky)
```

### Template D — Detail / View
```
Header: Entity title + status badge + action buttons (Edit, Delete, Print)
Breadcrumb: parent → current
Layout: 2 columns (content 2/3 + sidebar metadata 1/3)
  Main: tabbed content or accordion sections
  Sidebar: metadata, related records, quick actions
```

### Template E — Assessment Form
```
Header: Teacher name + Instrument + Term + auto-save indicator
Section Tabs: (sticky below header)
  [ด้านที่ 1] [ด้านที่ 2] [ด้านที่ 3] [ด้านที่ 4]
Content: Indicator cards per tab
  - IndicatorCard: code + title + collapsible rubric + score input(s)
Footer: [ย้อนกลับ] [ไปหน้าถัดไป] [บันทึก] (auto-save badge)
```

---

## 11. Component Library (Updated)

### Button
```
Variants: primary | secondary | ghost | danger | gradient
Sizes: sm (32px h) | md (40px h) | lg (48px h)
States: default | hover | active | disabled | loading

primary: bg=purple-600, hover=purple-700, text=white
secondary: bg=blue-50, border=blue-200, text=blue-700, hover=blue-100
ghost: bg=transparent, text=slate-600, hover=slate-100
danger: bg=red-600, hover=red-700
gradient: bg=--de-gradient-brand, text=white, shadow
```

### Card
```
Variants: default | elevated | glass | bordered | gradient-subtle

default: bg=white, border=slate-200, shadow-xs
elevated: shadow-md, no border
glass: bg=rgba(255,255,255,0.7), backdrop-blur, border=rgba(255,255,255,0.3)
bordered: border=slate-200, no shadow
gradient-subtle: bg=--de-gradient-card (purple-blue soft)
```

### Input
```
States: default | focus | error | disabled
Border: 1px slate-300, radius-md
Focus: border=purple-500, ring=purple-200 (3px)
Error: border=red-500, ring=red-100
Label: 14px / weight 500 / slate-700
Helper: 12px / slate-500
Error msg: 12px / red-600 + icon
```

### Badge
```
Tones: brand(purple) | blue | success | warning | danger | neutral
Variants: soft | solid | outline | dot-only
```

### Table
```
- Header: bg=slate-50, text=slate-500, 12px uppercase, weight-600
- Row: bg=white, hover=purple-50/50
- Border: 1px slate-100 (rows)
- Selected row: bg=purple-50, left-border=3px purple-500
- Responsive: horizontal scroll on mobile
```

### Stat Card (KPI)
```
Layout: Icon box (top-left) + value (large) + label + trend indicator
Icon box: 48×48, gradient soft, radius-lg
Value: 32px, weight-700, text-primary
Trend: up=green, down=red, arrow icon + % change
Hover: slight lift (transform translateY -2px)
```

### Traffic Light Indicator
```
● Green  (≥90%)  #10B981
● Yellow (≥70%)  #F59E0B
● Red    (<70%)  #EF4444

สำหรับ inline: dot 8×8 + label
สำหรับ card: full-width top border 4px + icon
```

### Spider / Radar Chart
```
Current: stroke=purple-400, fill=purple-400 (opacity 0.15)
Target:  stroke=blue-400,   fill=blue-400   (opacity 0.10)
Grid: stroke=slate-200
Label: 13px / slate-600
Legend: pill badge (current=purple-soft, target=blue-soft)
```

---

## 12. Dark Mode

### Mechanism
- `data-theme="dark"` บน `<html>`
- CSS variable override ใน `:root[data-theme="dark"]`
- Persist: `localStorage['de-theme']`
- Anti-FOUC inline script ใน layout.tsx

### Dark Mode Token Overrides
```css
:root[data-theme="dark"] {
  --de-bg-canvas:   #020617;
  --de-bg-surface:  #0F172A;
  --de-bg-elevated: #1E293B;
  --de-bg-sidebar:  #020617;
  --de-text-primary:   #F8FAFC;
  --de-text-secondary: #94A3B8;
  --de-border:      #334155;
  /* Brand colors stay, slightly lighter */
  --de-purple-500:  #A78BFA;
  --de-blue-500:    #60A5FA;
}
```

### Sidebar Dark Mode
- Dark theme: sidebar ใช้ `--de-slate-950` (ดำเกือบสนิท) + purple accent
- Light theme: sidebar ใช้ `--de-gradient-sidebar` (ม่วงเข้ม)
- Sidebar สีไม่เปลี่ยนมากระหว่าง dark/light — จงใจ ให้ sidebar เป็น anchor สีม่วง

---

## 13. Responsive Breakpoints

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | < 768px | Sidebar = hidden (hamburger), top header full-width, 1-column content |
| Tablet | 768–1023px | Sidebar collapsed (64px icons only), 2-column content |
| Desktop | 1024–1279px | Sidebar expanded (240px), standard |
| Wide | ≥ 1280px | Same + content max-width 1400px centered |

### Sidebar on Mobile
- ซ่อนอยู่นอกหน้าจอ (transform: translateX(-100%))
- Hamburger button บน top header (left)
- Slide-in overlay + dim backdrop
- Tap backdrop เพื่อปิด

---

## 14. Animations & Motion

### Principles
- ใช้ motion เพื่อ inform ไม่ใช่ entertain
- Duration: fast 150ms / normal 200ms / slow 300ms
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` (ease-in-out-material)
- Respect `prefers-reduced-motion`

### Standard Transitions
```
nav item hover:     background 150ms ease
card hover lift:    transform 200ms ease, shadow 200ms ease
modal open:         opacity 200ms + scale 0.96→1 200ms
sidebar collapse:   width 200ms ease
page transition:    opacity 150ms (fade only)
number counter:     60fps requestAnimationFrame (Live Dashboard)
```

---

## 15. Accessibility

- **Focus ring**: `outline: 3px solid --de-purple-400; outline-offset: 2px`
- **Contrast ratio**: ≥ 4.5:1 (text), ≥ 3:1 (large text)
- **ARIA labels**: nav items, icon buttons, modals
- **Keyboard navigation**: tab order เป็นธรรมชาติ, sidebar items tabbable
- **Screen reader**: `aria-current="page"` บน active nav item
- **Skip to content**: visible-on-focus link ที่ต้น `<body>`

---

## 16. Page-by-Page Redesign Checklist

| Page | Template | Priority |
|---|---|---|
| Landing (`/`) | Custom | P0 |
| Login (`/login`) | Custom | P0 |
| Dashboard (`/dashboard`) | A | P0 |
| Live Dashboard (`/live-dashboard`) | Custom (fullscreen) | P1 |
| Evaluations List (`/evaluations`) | B | P1 |
| New Evaluation (`/evaluations/new`) | C | P1 |
| Evaluation Detail (`/evaluations/[id]`) | D | P1 |
| Assessment Form (`/assessment/[id]`) | E | P2 |
| SAR List (`/admin/sar`) | B | P1 |
| SAR Detail (`/admin/sar/[id]`) | D | P1 |
| Schools Admin (`/admin/schools`) | B | P2 |
| Networks Admin (`/admin/networks`) | B | P2 |
| Users (`/users`) | B | P2 |
| Instruments (`/instruments`) | B | P3 |
| Reports (`/reports`) | A | P2 |
| THAI Summary (`/admin/thai-summary`) | A | P2 |

---

## 17. Implementation Notes (for Developers)

### File Structure Changes
```
app/
  components/
    shell/
      Sidebar.tsx          ← NEW: Left sidebar component
      TopHeader.tsx        ← NEW: Fixed top header
      AppShell.tsx         ← NEW: Shell wrapper (sidebar + header + content)
      MobileDrawer.tsx     ← NEW: Mobile sidebar overlay
    ui/                    ← EXTEND existing
      StatCard.tsx         ← NEW
      Table.tsx            ← NEW
      Modal.tsx            ← NEW
      TrafficLight.tsx     ← NEW
      Breadcrumb.tsx       ← NEW
      SearchBar.tsx        ← NEW
  landing/
    page.tsx               ← NEW: Public landing page
  (login)                  ← REDESIGN existing
```

### Migration Strategy
1. สร้าง `AppShell.tsx` ก่อน — wrap ทุกหน้าที่ login แล้ว
2. Update `layout.tsx` ให้ใช้ AppShell เฉพาะ authenticated routes
3. Landing + Login ไม่ใช้ AppShell (standalone)
4. Migrate หน้าทีละหน้าตาม Priority (P0 → P3)
5. Delete inline styles เก่าเมื่อ migrate เสร็จแต่ละหน้า

### Token Migration
- Replace `--de-brand-*` → `--de-purple-*`
- Replace `--de-accent-*` → `--de-blue-*`
- Replace `--de-ink-*` → `--de-slate-*`
- เพิ่ม semantic aliases ใหม่ทั้งหมดใน `globals.css`

---

## 18. Design Handoff Checklist (for Claude Design / Canva)

- [ ] Color palette swatch (Purple + Blue + Slate + Semantic)
- [ ] Typography scale specimen
- [ ] Sidebar component (expanded + collapsed + dark + light)
- [ ] Top header component
- [ ] Landing page wireframe (all 6 sections)
- [ ] Login page (2-column layout)
- [ ] Dashboard layout (Template A)
- [ ] List page layout (Template B) 
- [ ] Form layout (Template C)
- [ ] Detail layout (Template D)
- [ ] Assessment form (Template E)
- [ ] Button states (all variants + all states)
- [ ] Card variants
- [ ] Input states
- [ ] Table design
- [ ] Stat Card (KPI)
- [ ] Spider Chart styling
- [ ] Mobile layouts (sidebar drawer, stacked content)
- [ ] Dark mode versions of key screens

---

*PRD Version 1.0 — Ready for Design Handoff*
*Logic / API / DB: ไม่เปลี่ยนแปลงทั้งสิ้น*
