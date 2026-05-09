# PRD — DE Design v2: UI Upgrade

> เอกสารนี้เป็น brief สำหรับส่งต่อให้ Claude (หรือ designer คนถัดไป) ทำงาน UI upgrade ต่อจาก PR #1 ของ repo `sooksun/doitung`

---

## 1. บริบทระบบ

| รายการ | รายละเอียด |
|--------|-----------|
| ชื่อระบบ | DE: Development Evaluation (DOITUNG) |
| Production | https://doitung.cnppai.com |
| Stack | Next.js 14 (App Router) + Prisma 5 + MySQL/MariaDB + Kanit (Thai) |
| Real-time | Polling ทุก 5 วินาที (ไม่มี WebSocket) |
| ผู้ใช้ | ครูผู้ประเมิน, ผู้บริหารโรงเรียน, ผู้ดูแลเครือข่าย/เขต, ADMIN |
| ภารกิจหลัก | ประเมินคุณภาพโรงเรียนด้วย **Q-Model 47 ตัวชี้วัด** ใน 4 มิติ (Q-Leadership, Q-PLC, Q-Learning, Q-Students) แสดงผลใน Live Dashboard |
| Auth | JWT bearer ใน header + localStorage(`token`, `user`) |

อ่าน `CLAUDE.md` กับ `context.md` ก่อนเสมอ — มี architecture quirk ที่ต้องระวัง (เช่น `schema.prisma` อยู่ root, `Indicator` ใช้ `textTh` ไม่ใช่ `nameTh`, ไม่มี `orderIndex`)

---

## 2. ปัญหา UI เดิม

1. ทุกหน้าใช้ inline style — ไม่มี design system, สีกระจายทั่ว
2. Brand gradient เก่า `#667eea → #764ba2` ดูล้าสมัย ใช้ไม่กลมกลืนกับ KPI/ตัวชี้วัด
3. `/dashboard` กับ `/live-dashboard` เคยแสดงข้อมูลซ้ำกัน (เพิ่งแก้ใน PR #1)
4. ใช้ emoji 🔐📊📋✅📈 ทั่วเมนู — render ไม่สม่ำเสมอบน OS ต่างกัน
5. Label เมนูปนไทย/อังกฤษ ("Dashboard" / "Live Dashboard") ผู้ใช้สับสน
6. หน้าแรกมี "API Status" + "Quick Links" ที่เป็น dev-facing ผู้ใช้จริงไม่ต้องการ

---

## 3. สถานะปัจจุบัน (เสร็จไปแล้วใน PR #1)

### 3.1 Design tokens — `app/globals.css`

CSS variable ทั้งหมดขึ้นต้นด้วย `--de-*` — ใช้ผ่าน `var(--de-...)` เท่านั้น **ห้าม hardcode hex ในหน้าใหม่**

| หมวด | tokens สำคัญ |
|------|-------------|
| Brand | `--de-brand-50…900` (indigo), `--de-accent-500…700` (violet) |
| Gradient | `--de-gradient-brand` (indigo→violet→fuchsia), `--de-gradient-brand-soft` |
| Ink (neutral) | `--de-ink-50…900` (slate scale) |
| Semantic | `--de-success-500/600`, `--de-warning-500/600`, `--de-danger-500/600`, `--de-info-500` |
| Surface | `--de-surface`, `--de-surface-muted`, `--de-surface-sunken`, `--de-surface-glass` |
| Spacing | `--de-space-1…16` |
| Radius | `--de-radius-sm/md/lg/xl/2xl/pill` |
| Shadow | `--de-shadow-xs/sm/md/lg/xl/glow` |
| Motion | `--de-ease-out`, `--de-duration-fast/base/slow` |
| Font | `--de-font-sans` (Kanit) |

มี utility class:
- `.de-app-shell` — full-page background พร้อม radial accent
- `.de-container` — max-width wrapper
- `.de-focus-ring` — `:focus-visible` glow
- รองรับ `prefers-reduced-motion: reduce`

### 3.2 Primitives — `app/components/ui/`

```ts
import { Button, Card, Input, Badge, Container } from '@/app/components/ui';
```

| Component | Props ที่สำคัญ |
|-----------|---------------|
| `Button` | `variant: primary \| secondary \| ghost \| danger \| gradient`, `size: sm \| md \| lg`, `leftIcon`, `rightIcon`, `loading`, `fullWidth` |
| `Card` | `elevation: flat \| raised \| floating \| glass`, `interactive`, `accent: brand \| success \| warning \| danger \| info \| none`, `padding` |
| `Input` | `label`, `helper`, `error`, `leftIcon`, `rightSlot` (สำหรับปุ่ม show/hide), `forwardRef` รองรับ react-hook-form |
| `Badge` | `tone: brand \| success \| warning \| danger \| info \| neutral`, `variant: soft \| solid \| outline`, `dot`, `icon` |
| `Container` | `size: sm \| md \| lg \| xl` |

ทุกตัวเป็น 'use client', ไม่มี dep ภายนอก, รองรับ keyboard focus

### 3.3 หน้าที่ migrated เป็น v2 แล้ว

| Route | สถานะ |
|-------|------|
| `/` | redesign เสร็จ — hero + 4 nav cards + 3-step onboarding + status panel |
| `/login` | redesign เสร็จ — 2-column brand/form, show-password toggle, demo creds, responsive ≤960px |
| `/dashboard` | thin redirect → `/live-dashboard` (legacy URL ยังใช้งานได้) |

### 3.4 Routing decisions ที่ตกลงแล้ว

- `/live-dashboard` คือ **canonical dashboard** ที่หน้าหลักและ login flow ชี้มา
- ลิงก์ "← หน้าหลัก" ใน live-dashboard header ชี้ `/`
- Sub-page หลายหน้ายังมี "back to /dashboard" link — ปล่อยไว้ก็ได้เพราะ redirect ทำงาน

---

## 4. Scope งานต่อ — หน้าที่ยังไม่ migrate

### Priority 1 — end-user, traffic สูง
1. **`/live-dashboard`** ⭐ สำคัญสุด — UI ยังเป็นโทน `#0f172a → #1e1b4b` แบบเดิม
   - Components ในหน้า: `LiveSpiderChart`, `LiveIndicator`, `AnimatedNumber`, `ScopeSelector`
   - Layout: header (filter bar) + 3-column main + indicator tabs
   - ต้องคงไว้: polling ทุก 5s, fullscreen toggle, pause button, scope filter (school/network/district)
   - ปรับ visual ให้ใช้ tokens v2 — แต่โทนยังควรเข้มเพื่อใช้กับ projector
2. **`/assessment/[id]`** — หน้ากรอกแบบประเมิน
   - 47 indicators ใน 4 tab (L1-12, PLC1-10, T1-12, S1-13)
   - Likert 1–5 แบบ 2 คอลัมน์: `score` (พึงประสงค์, น้ำเงิน) + `score2` (เป็นอยู่, ม่วง) — **ห้ามสลับ!**
   - Auto-save ทันทีที่กรอก
   - มี collapsible "▶ ดูเกณฑ์" แสดง rubric 5 ระดับ
   - มี real-time school aggregate widget ด้านล่าง

### Priority 2 — power user
3. `/evaluations` (list), `/evaluations/[id]` (detail), `/evaluations/[id]/insights`, `/evaluations/new` (create)
4. `/instruments`, `/instruments/[id]`
5. `/reports`

### Priority 3 — admin
6. `/users`, `/users/[id]/edit`
7. `/admin/sar`, `/admin/sar/[id]`, `/admin/sar/[id]/review`, `/admin/sar/new`
8. `/admin/schools`
9. `/admin/settings/feature-flags`
10. `/sticky` — collaborative board (มี security model พิเศษ — ดู `README_STICKY_ICEBERG.md`)

---

## 5. ข้อจำกัด — สิ่งที่ห้ามแตก

| # | กฎ | ผลถ้าแตก |
|---|----|----------|
| 1 | API request/response shape ของทุก `/api/*` ต้องเหมือนเดิม | Frontend คุยกับ backend ไม่รู้เรื่อง |
| 2 | Auth flow: JWT bearer + `localStorage('token','user')` | Logout ทั้งระบบ |
| 3 | Route ทุกอันต้องคงอยู่ — รวม `/dashboard` (redirect) | ลิงก์ภายในแตก |
| 4 | Polling 5s ใน `/live-dashboard` กับ `/assessment/[id]` | Dashboard ค้าง, อาจ DDoS server ถ้าเร็วไป |
| 5 | `score` ≠ `score2` (สี/ความหมายต่างกัน) ดู §3 ใน CLAUDE.md | ข้อมูลคุณภาพโรงเรียนผิด |
| 6 | Indicator ใช้ `textTh`/`textEn` ไม่ใช่ `nameTh`/`nameEn`, ไม่มี `orderIndex` | Prisma error |
| 7 | Q-Model 4 dimensions: Q-Leadership / Q-PLC / Q-Learning / Q-Students (matched by `nameEn`) | Dimension หาย |
| 8 | `prisma/seed.ts` (dev) + `scripts/seed-production.js` (Docker) ต้อง edit ทั้งคู่ถ้าแก้ seed | Production missing data |
| 9 | OKR/RBM models (`OKRObjective`, `OKRKeyResult`, ...) เป็น orphan ใน schema — **ห้ามนำกลับมาใช้** | Re-introduce ฟีเจอร์ที่ลบไปแล้ว |
| 10 | Sticky board authorization (owner/author/shareKey) | Security regression |
| 11 | Toast ผ่าน `react-toastify` + `ToastProvider` ใน `layout.tsx` | Notification หาย |

---

## 6. แนวทางทำงาน (Working agreement)

1. **PR ละ 1 หน้า** (หรือกลุ่มหน้าที่เกี่ยวข้องใกล้ชิด เช่น list+detail+create) — review ง่าย, revert ง่าย
2. ใช้ primitives เดิมก่อน — ถ้าจำเป็นต้องเพิ่มตัวใหม่ ให้สร้างใน `app/components/ui/` แล้ว export จาก `index.ts`
3. ทุก style ต้องอ้าง tokens v2 ผ่าน `var(--de-*)` — ห้าม hex hardcoded
4. ก่อน commit รัน `npm run build` ทุกครั้ง (`npm run lint` ยังไม่ได้ setup ESLint)
5. Commit message สั้น action-style (ดู `git log` recent commits เป็นตัวอย่าง: "Use…", "Make…", "Extract…", "Collapse…", "Validate…")
6. PR body ต้องมี:
   - Summary (เปลี่ยนอะไร, ทำไม)
   - Behavior preserved (ลิสต์ฟีเจอร์ที่ไม่กระทบ)
   - Build output snippet
   - Test plan (checkbox list)
   - Rollout note (วิธี revert)
7. ใช้ภาษาไทยเป็นค่าเริ่มต้นในทุก response/comment/PR body — ตามกฎใน `CLAUDE.md`

---

## 7. Acceptance criteria ต่อหน้า

- [ ] ใช้ tokens v2 ผ่าน `var(--de-*)` 100% ไม่มี hex hardcoded
- [ ] Reuse primitives จาก `app/components/ui/` (ไม่สร้าง Button/Card/Input/Badge ของตัวเองใหม่)
- [ ] Responsive: ทดสอบที่ 320px, 768px, 1280px — ไม่ horizontal scroll
- [ ] **Render ถูกทั้ง light + dark theme** — toggle ทดสอบแล้วไม่มีสีหายหรือ contrast พัง
- [ ] **`/live-dashboard` มีปุ่ม theme toggle ของตัวเอง** + sync กับ global เมื่อไม่ override
- [ ] หน้า `/admin/*` ใช้ `app/admin/layout.tsx` shell ไม่ implement sidebar เอง
- [ ] Behavior identical: API call, auth check, polling, redirect, localStorage ทุกอย่างเหมือนเดิม
- [ ] `npm run build` ผ่าน, ไม่มี TypeScript error
- [ ] Bundle size ไม่ระเบิด (เพิ่มได้ ≤ +30% จากของเดิม)
- [ ] **ไม่มี FOUC (flash of unstyled content)** ตอน first paint ของ theme — ตรวจด้วย DevTools throttling 3G
- [ ] Accessibility:
  - `:focus-visible` ring ทุกปุ่ม/ลิงก์
  - `aria-label` ปุ่มที่มีแต่ icon (รวม ThemeToggle)
  - `aria-live="polite"` สำหรับข้อมูลที่อัปเดต real-time
  - keyboard nav ทำงานได้ (Tab, Enter, Space)
  - `prefers-reduced-motion` ตัด animation
  - ตัวอักษร contrast ratio ≥ 4.5:1 ทั้ง light และ dark (WCAG AA)
- [ ] Thai font weights ครบ (300/400/500/600/700) — ไม่ override ด้วย system font

---

## 8. ลำดับงานที่แนะนำ

```
PR #2: Foundation                ← ⭐ ทำก่อนเลย ปลดล็อก PR ถัดไป
        - dark mode tokens + ThemeProvider + ThemeToggle
        - BrandMark primitive
        - admin layout shell (sidebar)
PR #3: /live-dashboard           (ใช้ ThemeToggle + 2 mode)
PR #4: /assessment/[id]          (ครูใช้กรอกข้อมูลจริง — ระวัง score vs score2)
PR #5: /evaluations + sub-pages
PR #6: /instruments + sub-pages
PR #7: /reports
PR #8: /users + edit             (ใช้ admin shell)
PR #9: /admin/sar + /admin/schools + /admin/settings/feature-flags
PR #10: /sticky                  (ระวัง security model)
```

ทุก PR target branch `main` และ rebase บน main ล่าสุดก่อน push

---

## 9. Reference files

| ไฟล์ | ใช้ทำอะไร |
|------|-----------|
| `CLAUDE.md` | Convention + architecture quirks (อ่านก่อนทำงานเสมอ) |
| `context.md` | System overview + deployment + known issues |
| `app/globals.css` | Design tokens v2 |
| `app/components/ui/` | Primitives v2 |
| `app/page.tsx` | ตัวอย่างหน้าที่ migrate แล้ว (home) |
| `app/login/page.tsx` | ตัวอย่างหน้าที่มี form |
| `app/components/ToastProvider.tsx` | Notification system |
| `lib/api-utils.ts` | `successResponse` / `errorResponse` / `handleApiError` — ทุก API ใช้รูปแบบเดียวกัน |
| `middleware.ts` | Bearer token gate |

---

## 10. Product decisions (ตอบแล้ว)

### 10.1 `/live-dashboard` รองรับทั้ง 2 โทน
- **Light mode**: ใช้เมื่อนั่งดูบนเดสก์ท็อป/มือถือปกติ — surface สว่าง, ตัวอักษร ink-900
- **Dark mode (projector)**: คงโทนเข้ม `#0f172a → #1e1b4b` ที่มีอยู่ — เหมาะกับฉาย TV/projector
- มีปุ่ม toggle บน header ของ live-dashboard เอง + sync กับ global theme (เลือก override เฉพาะหน้านี้ได้)
- ค่า default เปิดด้วย:
  - ถ้ามาจาก fullscreen API → dark
  - ถ้าเปิดบนหน้าจอปกติ → ใช้ค่า global theme
- เก็บ preference ใน `localStorage('de-live-theme')` แยกจาก global toggle

### 10.2 `/admin/*` ใช้ admin shell + sidebar
- สร้าง `app/admin/layout.tsx` ครอบทุกหน้า admin (Next.js layout segment)
- โครงสร้าง:
  ```
  ┌──────────────────────────────────────────┐
  │ Top bar: Brand + ปุ่ม theme + user menu │
  ├──────────┬───────────────────────────────┤
  │ Sidebar  │ Page content                  │
  │ - SAR    │                               │
  │ - Schools│                               │
  │ - Users  │                               │
  │ - Flags  │                               │
  │ - ระดมฯ  │                               │
  └──────────┴───────────────────────────────┘
  ```
- Sidebar collapse ได้ที่ ≤960px (hamburger menu)
- Active link state ใช้ `--de-brand-50` background
- สร้าง primitive `<AdminShell>` ใหม่ใน `app/components/ui/` หรือ `app/admin/_components/AdminShell.tsx`

### 10.3 Dark mode toggle ทั้งระบบ
- เพิ่ม `[data-theme="dark"]` selector ใน `globals.css` override `--de-*` tokens
- กลยุทธ์ token: keep semantic names เดิม (`--de-surface`, `--de-ink-900`) แต่ค่าเปลี่ยนตาม theme — หน้าอื่นไม่ต้องแก้โค้ด ยกเว้นที่ hardcode สีไว้
- Detection order:
  1. `localStorage('de-theme')` → 'light' | 'dark'
  2. ถ้าไม่มี → `prefers-color-scheme` media query
  3. fallback → 'light'
- ป้องกัน FOUC: inline script ใน `<head>` ตั้ง `data-theme` ก่อน hydrate (Next.js: ใช้ inline `<script>` ใน `app/layout.tsx`)
- สร้าง primitive `<ThemeToggle>` (icon button: ☀️/🌙) วางไว้ที่:
  - Header ของ admin shell
  - Header ของ `/live-dashboard`
  - Future: header กลางทุกหน้า (ถ้าทำ app shell)
- React context `ThemeProvider` ห่อทั้ง app ใน `app/layout.tsx`

### 10.4 Brand mark = text only
- ไม่ต้องสร้างไฟล์ logo (.svg, .png)
- รูปแบบ:
  - Wordmark: **DE** ใน badge gradient + text "Development Evaluation" หรือ "DOITUNG"
  - หรือ: text "DE" weight 700 + accent dot สี `--de-brand-600`
- ตัวอย่างที่ทำได้:
  ```tsx
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
    <span style={{
      padding: '0.2rem 0.5rem',
      background: 'var(--de-gradient-brand)',
      color: '#fff',
      borderRadius: 'var(--de-radius-sm)',
      fontWeight: 800,
      letterSpacing: '0.05em',
    }}>DE</span>
    <span style={{ fontWeight: 600, color: 'var(--de-ink-900)' }}>Doitung</span>
  </span>
  ```
- สร้างเป็น primitive `<BrandMark>` ใช้ซ้ำได้ทุกหน้า

---

## 11. Foundation tasks ที่ต้องทำก่อน Priority 1

จากคำตอบข้อ 10 — มี **prerequisite work** ที่ควรทำใน PR แยกก่อนเริ่ม redesign หน้าใหญ่ ๆ:

### PR #2 (Foundation): Dark mode + Admin shell + BrandMark

1. **`globals.css`** — เพิ่ม `[data-theme="dark"]` override
2. **`app/layout.tsx`** — เพิ่ม ThemeProvider + inline FOUC-prevention script
3. **`app/components/ui/ThemeToggle.tsx`** — primitive ปุ่ม toggle
4. **`app/components/ui/BrandMark.tsx`** — text wordmark
5. **`app/components/ui/useTheme.ts`** — hook สำหรับอ่าน/เปลี่ยน theme
6. **`app/admin/layout.tsx`** — admin shell (sidebar + top bar) ครอบทุกหน้า admin
7. ทดสอบบนหน้า `/` กับ `/login` ที่ migrate แล้ว — ต้อง render ถูกทั้ง 2 theme

หลังจาก PR #2 ผ่าน แล้วค่อยเริ่ม Priority 1 (live-dashboard, assessment) ใน PR ถัด ๆ ไป

---

*PR #1 ที่อ้างอิง: https://github.com/sooksun/doitung/pull/1*
