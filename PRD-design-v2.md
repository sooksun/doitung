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
- [ ] Dark/light surface สอดคล้องกับ context (`live-dashboard` = dark, ทั่วไป = light)
- [ ] Behavior identical: API call, auth check, polling, redirect, localStorage ทุกอย่างเหมือนเดิม
- [ ] `npm run build` ผ่าน, ไม่มี TypeScript error
- [ ] Bundle size ไม่ระเบิด (เพิ่มได้ ≤ +30% จากของเดิม)
- [ ] Accessibility:
  - `:focus-visible` ring ทุกปุ่ม/ลิงก์
  - `aria-label` ปุ่มที่มีแต่ icon
  - `aria-live="polite"` สำหรับข้อมูลที่อัปเดต real-time
  - keyboard nav ทำงานได้ (Tab, Enter, Space)
  - `prefers-reduced-motion` ตัด animation
- [ ] Thai font weights ครบ (300/400/500/600/700) — ไม่ override ด้วย system font

---

## 8. ลำดับงานที่แนะนำ

```
PR #2: /live-dashboard          ← ทำต่อจากนี้ก่อน (สำคัญสุด)
PR #3: /assessment/[id]          ← ครูใช้กรอกข้อมูลจริง
PR #4: /evaluations + sub-pages
PR #5: /instruments + sub-pages
PR #6: /reports
PR #7: /users + edit
PR #8: /admin/* (sar, schools, feature-flags)
PR #9: /sticky
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

## 10. Open questions (ผู้ใช้ตัดสินใจ)

- [ ] Color scheme ของ `/live-dashboard` ควรคงโทนเข้ม (projector) หรือเปลี่ยนเป็น light เหมือนหน้าอื่น?
- [ ] หน้า `/admin/*` ควรมี sidebar nav แยก (admin shell) หรือใช้ layout เดียวกับหน้าอื่น?
- [ ] ต้องการ dark mode toggle ทั้งระบบไหม (token พร้อมแล้ว แต่ยังไม่มี toggle)?
- [ ] Logo/brand mark — มีไฟล์จริงหรือใช้ text-only?

---

*PR #1 ที่อ้างอิง: https://github.com/sooksun/doitung/pull/1*
