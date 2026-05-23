# PRD — DE: ออกแบบ UI ใหม่ (Design Handoff สำหรับ Claude Design)

> Brief สำหรับส่งต่อให้ **Claude Design** ออกแบบหน้าตา (UI/UX) ของระบบ **DE (DOITUNG)** ใหม่จากระบบเดิม
> **หลักการสำคัญ:** เปลี่ยนเฉพาะ "รูปลักษณ์ + ประสบการณ์ใช้งาน" — **ห้ามเปลี่ยนตรรกะการทำงาน** โดยเฉพาะ **แบบประเมิน (`/assessment/[id]`)** ที่ต้องทำงานเหมือนเดิมทุกประการ
> เอกสารนี้ **สรุป/ปรับปรุงต่อจาก `PRD-design-v2.md`** ให้ตรงกับสถานะ ณ ปัจจุบัน (รวมงานแบบประเมินตนเองภาษาไทย ป.1–3 ที่เพิ่งทำเสร็จ — ดู §4.1)

---

## 0. TL;DR

- งานคือ **reskin + ปรับ UX** ของ **21 หน้า** ให้เป็น design system เดียวกัน — **ไม่ใช่ rebuild**
- **ห้ามแตะ:** ตรรกะ, API contract, auth, routing, การคำนวณ/บันทึกคะแนน, พฤติกรรม auto-save / polling
- โซนหวงห้ามที่สุดคือ **หน้ากรอกแบบประเมิน** — เปลี่ยนหน้าตาได้ แต่พฤติกรรมทุกอย่างต้องเหมือนเดิม (ดู §4.1 + §7)
- ผลลัพธ์ที่ต้องการ: สวย/สม่ำเสมอ, Thai-first, accessible, responsive, และ "ทุก behavior เหมือนเดิม"

---

## 1. บริบทระบบ

| รายการ | รายละเอียด |
|--------|-----------|
| ชื่อระบบ | **DE: Development Evaluation** (DOITUNG) — แพลตฟอร์มประเมินคุณภาพโรงเรียน |
| Production | https://doitung.cnppai.com (Docker บน Linux) |
| Stack | Next.js 14 (App Router) + Prisma + MySQL/MariaDB |
| ภาษา/ฟอนต์ | ไทยเป็นหลัก, ฟอนต์ **Kanit** (น้ำหนัก 300/400/500/600/700), `<html lang="th">` |
| Real-time | **Polling ทุก 5 วินาที** (ไม่มี WebSocket) |
| ผู้ใช้ | ครูผู้ประเมิน, ผู้บริหารโรงเรียน, ผู้ดูแลเครือข่าย/เขต, ADMIN |
| ภารกิจหลัก | กรอก **แบบประเมิน** → รวมผลแสดงบน **Dashboard / Live Dashboard** แบบ real-time |
| Auth | JWT bearer ใน header + `localStorage('token','user')` |
| เครื่องมือประเมิน | **Q-Model** (47 ตัวชี้วัด, 4 มิติ) และ **แบบประเมินตนเองภาษาไทย ป.1–3** (50 ตัวชี้วัด, 4 ด้าน) |

> อ่าน `CLAUDE.md` + `context.md` ก่อนเสมอ — มี architecture quirk ที่ทำพังง่าย (ดู §4.2)

---

## 2. สถานะ UI ปัจจุบัน (as-is) — สิ่งที่จะมาออกแบบใหม่

- **ทุกหน้าใช้ inline style** — ไม่มี design system, สี/ระยะ/เงา กระจายทั่ว ซ้ำซ้อน
- **Global shell (`app/layout.tsx`) มีแค่** ฟอนต์ Kanit + `ToastProvider` — **ไม่มี navigation ส่วนกลาง**; แต่ละหน้าทำ header / ปุ่ม "← กลับ" ของตัวเอง (โอกาสออกแบบ app shell + เมนูรวม)
- Brand gradient เดิม `#667eea → #764ba2` ดูล้าสมัย; หน้า `/assessment` ใช้คู่สี **ม่วง/น้ำเงิน**; `/live-dashboard` ใช้โทนเข้ม (`#0f172a → #1e1b4b`) สำหรับ projector
- ใช้ **emoji** เป็นไอคอน (🔐📊📋✅🌙☀️🗑️👤) — render ไม่สม่ำเสมอข้าม OS
- Label เมนู **ปนไทย/อังกฤษ** ("Dashboard" / "Live Dashboard")
- หน้าแรกมี panel แนว dev (API status / quick links) ที่ผู้ใช้จริงไม่ต้องการ

> ⚠️ **ข้อควรทราบเรื่อง design tokens:** `PRD-design-v2.md` อธิบาย design system (`--de-*` tokens ใน `globals.css` + primitives ใน `app/components/ui/`) ว่าเสร็จใน "PR #1" — แต่ **ยังไม่ปรากฏใน branch ปัจจุบัน** (`globals.css` ยัง minimal, ไม่มีโฟลเดอร์ `app/components/ui/`). ให้ถือว่านี่คือ **ทิศทางที่ตั้งใจไว้** ที่งานออกแบบใหม่ควรสานต่อ — เริ่มงานด้วยการ **สถาปนา design tokens + primitives ชุดนี้** (หรือ merge PR #1 เข้ามาก่อน) แล้วค่อย migrate ทีละหน้า

---

## 3. รายการหน้าจอทั้งหมด (21 หน้า) + ลำดับความสำคัญ

| Route | หน้าที่ | Priority | หมายเหตุ |
|-------|--------|:--------:|----------|
| `/` | หน้าแรก / landing | P1 | ตัดส่วน dev-facing ออก, ทำ entry ที่ชัด |
| `/login` | เข้าสู่ระบบ (JWT) | P1 | เก็บ token ลง localStorage |
| `/live-dashboard` | จอ Live แบบ projector (Spider chart ใหญ่, real-time) | **P1 ⭐** | **โทนเข้ม**, polling 5s, fullscreen, pause, scope filter |
| `/assessment/[id]` | **หน้ากรอกแบบประเมิน** | **P1 ⭐⭐ (หวงห้าม)** | ดู §4.1 — พฤติกรรมห้ามเปลี่ยน |
| `/dashboard` | Dashboard หลัก (real-time, polls 5s) | P1 | (มีแผนรวมกับ live-dashboard — ดู §10) |
| `/evaluations` | รายการการประเมิน | P2 | list + filter |
| `/evaluations/[id]` | รายละเอียดการประเมิน (อ่านอย่างเดียว) | P2 | ปลายทาง redirect ของ non-owner |
| `/evaluations/[id]/insights` | Insight/วิเคราะห์ผล | P2 | |
| `/evaluations/new` | สร้างการประเมินใหม่ | P2 | เลือกเครื่องมือ + โรงเรียน + ปี/เทอม |
| `/instruments`, `/instruments/[id]` | เครื่องมือประเมิน list/detail | P2 | |
| `/reports` | รายงาน | P2 | |
| `/users`, `/users/[id]/edit` | จัดการผู้ใช้ | P3 (admin) | |
| `/admin/sar`, `/admin/sar/[id]`, `/admin/sar/[id]/review`, `/admin/sar/new` | งาน SAR/SOAR (เอกสาร/AI) | P3 (admin) | |
| `/admin/schools` | จัดการโรงเรียน | P3 (admin) | |
| `/admin/settings/feature-flags` | feature flags ต่อโรงเรียน | P3 (admin) | |
| `/sticky` | กระดานระดมสมอง (collaborative) | P3 | มี security model พิเศษ (ดู `README_STICKY_ICEBERG.md`) |

ลำดับแนะนำ: เริ่ม design system → `/` + `/login` → `/live-dashboard` → `/assessment/[id]` → กลุ่ม evaluations → instruments/reports → admin → sticky (ทำ **PR ละ 1 หน้า/กลุ่มหน้าใกล้กัน**)

---

## 4. ⭐ สัญญาที่ห้ามแตก (Frozen Contract) — สำคัญสุด

### 4.1 หน้าแบบประเมิน `/assessment/[id]` (โซนหวงห้าม)

หน้านี้ **ปรับรูปแบบการแสดงผลตามชนิดเครื่องมือ (`session.instrument.type`) อัตโนมัติ** — มี 2 โหมด ห้ามรวบให้เหลือโหมดเดียว:

**โหมด A — Q-Model (`type === 'Q_MODEL'`) — แบบ 2 สถานะ (dual-state):**
- 2 กลุ่มคอลัมน์ต่อ 1 ตัวชี้วัด: **"ประเมินสภาพที่เป็นอยู่"** = `score2` (สีม่วง) + **"ประเมินสภาพที่พึงประสงค์"** = `score` (สีน้ำเงิน)
- สเกล **Likert 1–5**
- "ตอบแล้ว" = ต้องกรอก **ทั้ง** `score` และ `score2`
- **47 ตัวชี้วัด / 4 แท็บ**: Q-Leadership (L1–12), Q-PLC (PLC1–10), Q-Learning (T1–12), Q-Students (S1–13)
- เกณฑ์ rubric **5 ระดับ**
- ⚠️ **`score` ≠ `score2` — สี/ความหมายห้ามสลับ** (สลับ = ข้อมูลคุณภาพโรงเรียนผิด)

**โหมด B — แบบประเมินภาษาไทย ป.1–3 (`type === 'THAI_P1_3'`) — แบบให้คะแนนเดี่ยว (single-rating):**
- **คอลัมน์เดียว** หัวว่า **"ระดับการประเมิน"** = `score` เท่านั้น (`score2 = null`)
- สเกล **1–4** (1 ต้องปรับปรุง / 2 พอใช้ / 3 ดี / 4 ดีเยี่ยม)
- "ตอบแล้ว" = กรอก `score` พอ
- **50 ตัวชี้วัด / 4 แท็บ**: ด้านห้องเรียน (6), ด้านผู้เรียน (6), ด้านผู้สอน Facilitator (16), การจัดกระบวนการเรียนรู้และการวัดประเมินผล (22)
- เกณฑ์ rubric **4 ระดับ**

> **กลไก:** จำนวนช่องคะแนนมาจาก `indicator.minScore..maxScore`; โหมด dual/single ตัดสินจาก `instrument.type === 'Q_MODEL'`. การออกแบบต้องรองรับทั้งสองโหมด (และเครื่องมือชนิดอื่นในอนาคต) โดยอ่านค่าเหล่านี้ — **ห้าม hardcode 1–5 หรือ 2 คอลัมน์**

**พฤติกรรมที่ต้องคงไว้ทุกอย่าง:**
1. **Auto-save** — คลิก radio บันทึกทันที (optimistic update + POST) ไม่มีปุ่ม save รายข้อ
2. **แถว rubric แบบ Foldable** — ปุ่ม **"▶ ดูเกณฑ์ / ▼ ซ่อนเกณฑ์"** ใต้แต่ละข้อ กางแสดงเกณฑ์เรียงระดับมาก→น้อย พร้อม highlight ระดับที่เลือก (แสดงเฉพาะข้อที่มี `levelDescriptors`)
3. **แท็บ** — "ทั้งหมด (N)" + แท็บรายหมวด (มีตัวเลขนับ) กรองตัวชี้วัดตามแท็บ
4. **ความคืบหน้า** — progress bar บน header (ตอบแล้ว/ทั้งหมด %) + แถบล่างติดหน้าจอ (ตอบแล้ว X/Y, เหลือ Z)
5. **Header ติดบน** — ชื่อโรงเรียน, ปี/เทอม, ชิปผู้ประเมิน, ปุ่มสลับ **dark mode** (☀️/🌙), ปุ่ม "ส่งแบบประเมิน"
6. **แถบล่างติดหน้าจอ** — ปุ่ม "เคลียร์คะแนน" (อันตราย, ยืนยันด้วย toast → ลบคำตอบ, สถานะกลับ DRAFT) + "ส่งแบบประเมิน" (ยืนยันถ้ายังไม่ครบ → สถานะ SUBMITTED)
7. **Dark mode** — toggle ในหน้า (มีชุดสีโทนมืดของตัวเอง)
8. **Widget ภาพรวมทั้งโรงเรียน (real-time)** — ใต้ progress; ดึง `/api/live-dashboard?scope=school` ทุก 5s; แสดง 4 มิติ Q-Model + จำนวนครู + % ส่ง + ดัชนีคุณภาพ (เป็น Q-Model-only โดยตั้งใจ)
9. **Ownership gate** — ผู้ที่ไม่ใช่เจ้าของ/ADMIN ถูก redirect ไป `/evaluations/[id]` (อ่านอย่างเดียว)
10. **การโหลดข้อมูล** — ดึง session / responses / me / sections / indicators จาก endpoint เดิม; map คำตอบเดิมกลับเข้า radio

### 4.2 ทั้งระบบ (กฎที่ห้ามทำพัง)

| # | กฎ | ผลถ้าแตก |
|---|----|----------|
| 1 | API request/response shape ของทุก `/api/*` เหมือนเดิม — รูปแบบ `{ success, data, error?, message? }` | Frontend คุย backend ไม่รู้เรื่อง |
| 2 | Auth: JWT bearer + `localStorage('token','user')` | ผู้ใช้หลุด login ทั้งระบบ |
| 3 | ทุก route ต้องคงอยู่ (รวม `/dashboard`) | ลิงก์ภายในแตก |
| 4 | Polling **5s** ใน `/live-dashboard`, `/dashboard`, และ widget ใน `/assessment` | Dashboard ค้าง / ยิง server ถี่ไปถ้าเร่ง |
| 5 | `score` (พึงประสงค์/น้ำเงิน) ≠ `score2` (เป็นอยู่/ม่วง) | ข้อมูลคุณภาพผิด |
| 6 | `Indicator` ใช้ `textTh`/`textEn` (ไม่ใช่ `nameTh`), ไม่มี `orderIndex` (เรียงด้วย `id`) | Prisma error |
| 7 | Q-Model 4 มิติ match จาก `InstrumentSection.nameEn`: Q-Leadership / Q-PLC / Q-Learning / Q-Students | มิติหาย |
| 8 | Dashboard/Live aggregate **เฉพาะ Q-Model** — คำตอบภาษาไทยจะไม่ขึ้น dashboard (by design) | เข้าใจผิดว่าข้อมูลหาย |
| 9 | Toast ผ่าน `react-toastify` + `ToastProvider` ใน `layout.tsx` | Notification หาย |
| 10 | Sticky board authorization (owner / author / shareKey) | Security regression |
| 11 | OKR/RBM models เป็น orphan ใน schema — **ห้ามนำกลับมาใช้** | คืนชีพฟีเจอร์ที่ลบไปแล้ว |

---

## 5. เป้าหมายการออกแบบใหม่ (Design Goals)

1. **Design system เดียว** — tokens (สี/ระยะ/รัศมี/เงา/motion) + primitives (Button, Card, Input, Badge, Container) แทน inline style
2. **ความสม่ำเสมอ** — หน้าตา/การจัดวาง/พฤติกรรม component เหมือนกันทุกหน้า
3. **Thai-first** — label ไทยสม่ำเสมอ ลดการปนอังกฤษในจุดที่ผู้ใช้เห็น
4. **เลิกใช้ emoji เป็นไอคอน** — ใช้ icon set ชุดเดียวที่ render สม่ำเสมอ
5. **App shell + navigation รวม** — แทนการที่แต่ละหน้าทำ header เอง (พิจารณา sidebar/topbar)
6. **ตัด dev-facing clutter** ออกจากหน้าผู้ใช้จริง (เช่น API status บนหน้าแรก)
7. **Accessibility** — `:focus-visible`, `aria-label` ปุ่มไอคอน, `aria-live="polite"` ข้อมูล real-time, keyboard nav, รองรับ `prefers-reduced-motion`
8. **Responsive** — 320 / 768 / 1280 px ไม่มี horizontal scroll
9. **คงโทนเข้มของ `/live-dashboard`** ให้เหมาะกับ projector

---

## 6. ทิศทางดีไซน์ & แบรนด์

- **ฟอนต์:** Kanit (คงไว้ ครบทุกน้ำหนัก) — ห้าม override ด้วย system font
- **โทนสี:** indigo/violet เป็น brand (ต่อยอด token `--de-brand-*` / `--de-accent-*` จาก v2), semantic = success/warning/danger/info; ปรับ brand gradient ให้ทันสมัยขึ้น
- **Surface:** หน้าทั่วไป = light; `/live-dashboard` = dark (projector); เตรียมรองรับ dark mode (มี toggle ในหน้า assessment อยู่แล้ว)
- **สี assessment:** คงความหมาย **ม่วง = สภาพที่เป็นอยู่ (score2)**, **น้ำเงิน = สภาพที่พึงประสงค์ (score)** — ปรับเฉด/ความสวยได้ แต่ห้ามสลับความหมาย
- **อ้างอิง token/utility ใน `PRD-design-v2.md §3.1–3.2`** เป็นจุดตั้งต้น (`--de-*`, `.de-app-shell`, `.de-container`, `.de-focus-ring`)

---

## 7. หน้า assessment — เปลี่ยนได้ vs ห้ามเปลี่ยน (ชัดเจนสำหรับ designer)

| เปลี่ยนได้ (อิสระในการออกแบบ) | ห้ามเปลี่ยน (พฤติกรรม/ข้อมูล) |
|------------------------------|------------------------------|
| รูปแบบ/สไตล์ของตาราง, การ์ด, ปุ่ม, radio, สีเฉด, spacing, typography | จำนวน/ความหมายช่องคะแนน (1–5 dual หรือ 1–4 single ตาม instrument) |
| ตำแหน่ง/หน้าตาแถบ progress, แท็บ, ปุ่ม submit/clear | การ auto-save ทันทีที่เลือก, การยืนยันด้วย toast |
| ดีไซน์แถว rubric (เปิด/ปิด), animation การกาง | เงื่อนไขแสดง rubric (เฉพาะข้อที่มี `levelDescriptors`) + เรียงระดับมาก→น้อย |
| รูปแบบ widget ภาพรวมโรงเรียน, dark mode | การ poll 5s, endpoint ที่เรียก, scope=school |
| Layout ขณะ mobile/desktop | ข้อความตัวชี้วัด/เกณฑ์ (มาจาก DB — ห้ามแก้ใน UI) |

> แนะนำให้ดีไซน์ทั้ง 2 โหมด (Q-Model 1–5 dual, Thai 1–4 single) เป็น state เดียวกันที่ปรับตามข้อมูล — ไม่ใช่ 2 หน้าแยก

---

## 8. Acceptance Criteria (ต่อหน้า)

- [ ] ใช้ design tokens ผ่านตัวแปร (เช่น `var(--de-*)`) — **ไม่มี hex hardcoded**
- [ ] Reuse primitives ร่วม (Button/Card/Input/Badge/Container) ไม่สร้างซ้ำ
- [ ] **Behavior identical** — API call, auth check, polling, redirect, localStorage, auto-save, การคำนวณ progress เหมือนเดิม 100%
- [ ] Responsive ที่ 320 / 768 / 1280 px — ไม่มี horizontal scroll
- [ ] Surface ตรง context (`live-dashboard` = dark, ทั่วไป = light)
- [ ] Accessibility: focus ring, aria-label ปุ่มไอคอน, aria-live ข้อมูล real-time, keyboard nav, reduced-motion
- [ ] Thai font ครบ 5 น้ำหนัก, ไม่ถูก override
- [ ] `npm run build` ผ่าน, ไม่มี TypeScript error (หมายเหตุ: ESLint ยังไม่ได้ setup)
- [ ] Bundle size ไม่บวมเกิน (+30% จากเดิมโดยประมาณ)
- [ ] เฉพาะ `/assessment/[id]`: ทดสอบจริง 2 เครื่องมือ (Q-Model 47 ข้อ dual 1–5 / Thai 50 ข้อ single 1–4) — กรอก, auto-save, กางเกณฑ์, ส่ง, เคลียร์ ทำงานครบ

---

## 9. Non-goals (อยู่นอกขอบเขตงานออกแบบนี้)

- ไม่เปลี่ยน data model / schema / API
- ไม่เพิ่ม/ลบฟีเจอร์เชิงตรรกะ (เป็นงาน reskin + UX)
- ไม่นำ OKR/RBM กลับมา
- ไม่เปลี่ยนสถาปัตยกรรม real-time (ยังเป็น polling 5s ไม่ทำ WebSocket)
- ไม่ทำ dashboard ให้รวมผลภาษาไทย (เป็นงานแยกถ้าต้องการภายหลัง)

---

## 10. คำถามที่ต้องให้ผู้ใช้ตัดสินใจ (Open Questions)

- [ ] `/dashboard` กับ `/live-dashboard` — รวมเป็นหน้าเดียว (canonical) หรือคงแยก? (`PRD-design-v2.md` เสนอให้ `/dashboard` redirect → `/live-dashboard` แต่ยังไม่ merge ใน branch นี้)
- [ ] `/live-dashboard` คงโทนเข้ม (projector) หรือเปลี่ยนเป็น light เหมือนหน้าอื่น?
- [ ] หน้า `/admin/*` ใช้ sidebar shell แยก หรือ layout เดียวกับหน้าอื่น?
- [ ] ต้องการ dark mode toggle ทั้งระบบไหม (ตอนนี้มีเฉพาะหน้า assessment)?
- [ ] Logo/brand mark — มีไฟล์จริงหรือใช้ text-only?
- [ ] รวม navigation เป็น app shell เดียวเลยไหม (ปัจจุบันไม่มี nav ส่วนกลาง)?

---

## 11. ไฟล์อ้างอิง

| ไฟล์ | ใช้ทำอะไร |
|------|-----------|
| `CLAUDE.md` | Convention + architecture quirks (อ่านก่อนเสมอ) |
| `context.md` | System overview + data model + deployment + known issues |
| `PRD-design-v2.md` | Brief design system v2 เดิม (tokens/primitives) — เอกสารนี้สรุป/อัปเดตต่อจากนั้น |
| `app/layout.tsx` | Global shell (Kanit + ToastProvider) — จุดเริ่ม app shell ใหม่ |
| `app/globals.css` | จุดวาง design tokens (ปัจจุบันยัง minimal) |
| `app/assessment/[id]/page.tsx` | หน้าหวงห้าม — อ่านพฤติกรรมก่อนออกแบบ (§4.1) |
| `app/login/page.tsx`, `app/evaluations/new/page.tsx` | ตัวอย่างหน้า form |
| `scripts/data/thai-p1-3.js`, `scripts/data/q-model-rubrics.js` | แหล่งข้อความตัวชี้วัด + เกณฑ์ (มาจาก DB — UI ไม่แก้) |
| `lib/api-utils.ts` | รูปแบบ response มาตรฐานของทุก API |
| `middleware.ts` | Bearer token gate |
| `README_STICKY_ICEBERG.md` | Security model ของ `/sticky` |

---

*สรุปจาก/อัปเดตต่อ `PRD-design-v2.md` — โดยปรับให้ตรงสถานะปัจจุบัน (แบบประเมินเป็น adaptive 2 โหมด, ภาษาไทย 50 ตัวชี้วัด + rubric 4 ระดับ) และเน้นกฎ "ไม่กระทบการทำงานของแบบประเมิน"*
