# DE: Development Evaluation DOITUNG — System Context

## ภาพรวมระบบ

ระบบ **DOITUNG** (Doitung School Quality Assessment & RBM) เป็นแพลตฟอร์มประเมินคุณภาพโรงเรียนด้วยโมเดล Q-Model และจัดการ OKR/RBM สำหรับหน่วยงานการศึกษา

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | MySQL 8.0 (Laragon local) |
| ORM | Prisma 5.19.0 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Charts | Recharts 3.4.1 |
| Font | Kanit (Google Fonts, Thai support) |
| Deployment | Laragon (localhost:3000) |

---

## Data Model (18 Tables)

### Authentication & Users
```
User ─────────── UserRole ─── Role
  (email, password_hash, name)    (ADMIN, SCHOOL_LEADER, TEACHER, SUPERVISOR)
```

### Academic Structure
```
School ─── SchoolNetworkMember ─── SchoolNetwork
AcademicYear ─── Term
Teacher (linked to User + School)
Student (linked to School)
```

### Assessment Instruments
```
Instrument (type: DERS | THAI_P1_3 | Q_MODEL | OTHER)
  └── InstrumentSection (nameEn ใช้เป็น dimension key: Q-Leadership | Q-PLC | Q-Learning | Q-Students)
        └── Indicator (textTh, textEn, code, minScore, maxScore, scaleType)
              — Q-Model: LIKERT_1_5 (1..5); THAI_P1_3: LIKERT_1_4 (1..4)
```

Q-Model (Q_MODEL) มี 4 sections, 47 indicators — dual-state (score+score2), LIKERT_1_5:
- Q-Leadership (L1-L12): 12 ตัวชี้วัด
- Q-PLC (PLC1-PLC10): 10 ตัวชี้วัด
- Q-Learning (T1-T12): 12 ตัวชี้วัด
- Q-Students (S1-S13): 13 ตัวชี้วัด

แบบประเมินตนเองภาษาไทย ป.1–3 (THAI_P1_3) — LIKERT_1_4 + เกณฑ์ 4 ระดับต่อข้อ (`levelDescriptors`: 4 ดีเยี่ยม → 1 ต้องปรับปรุง), **5 ด้าน**, 50 ตัวชี้วัด (ดูโหมด teacher-pair ด้านล่าง):
- ด้านห้องเรียน / Classroom (1.1.1–1.1.4, 1.2.1–1.2.2): 6
- ด้านผู้เรียน / Learners (2.1–2.6): 6
- ด้านผู้สอน (Facilitator) / Teacher as Facilitator (3.1–3.16): 16
- การจัดกระบวนการเรียนรู้ / Learning Process (4.1.1–4.1.14): 14
- การวัดประเมินผล / Assessment (4.2.1–4.2.8): 8

> เดิมด้านที่ 4 รวม "การจัดกระบวนการเรียนรู้และการวัดประเมินผล" (22) — แยกเป็น 2 ด้านตาม itemCode 4.1.x / 4.2.x. DB เดิม migrate ด้วย `scripts/migrate-thai-split-section.js` (one-off, idempotent, ย้าย sectionId ของ 4.2.x; responses ผูกกับ indicatorId จึงไม่หาย). seed (`scripts/data/thai-p1-3.js` + ทั้ง 2 seed) เป็น data-driven loop — fresh seed ได้ 5 ด้านเลย.

ข้อมูล canonical ของ THAI_P1_3 อยู่ที่ `scripts/data/thai-p1-3.js` (สกัดจาก `docs/Rubric_thai_12 Dec 2025.docx` ด้วย python-docx) — แก้ที่ไฟล์นี้ที่เดียว ใช้ร่วมทั้ง `prisma/seed.ts` และ `scripts/seed-production.js` (เหมือน q-model-rubrics.js)

⚠️ หน้า `/assessment/[id]` ปรับ scale + จำนวนคอลัมน์ตาม `instrument.type` อัตโนมัติ:
- `Q_MODEL` — dual 1–5: เป็นอยู่ (`score2`, ม่วง) + พึงประสงค์ (`score`, น้ำเงิน)
- `THAI_P1_3` — **ประเมินครูรายบุคคล แบบ 2 ผู้ประเมิน** (teacher-pair): *ครูประเมินตนเอง* + *ผอ.ประเมิน* แสดงรวมในฟอร์มเดียว แต่ละฝั่งมี ระดับการประเมิน (`score`, เหลือง) + ค่าเป้าหมาย (`score2`, เขียว) สเกล 1–4; ต้องกรอกทั้งสองจึงนับว่า "ตอบครบ"
- type อื่น (DERS ฯลฯ) — single (`score`) ตาม `minScore..maxScore` ของ indicator

### Evaluation Data
```
EvaluationSession (status: DRAFT → SUBMITTED → REVIEWED → ARCHIVED)
  └── EvaluationResponse
        ├── score  — สภาพที่พึงประสงค์ (Desired State) แสดงด้วยสีน้ำเงิน
        └── score2 — สภาพที่เป็นอยู่ (Current State) แสดงด้วยสีม่วง
```
⚠️ หมายเหตุ: score = พึงประสงค์ (เป้าหมาย), score2 = เป็นอยู่ (ปัจจุบัน) — อย่าสับสน

⚠️ ข้อยกเว้น `THAI_P1_3`: เก็บ **ระดับการประเมิน → `score`** (ข้อมูลเดิม คงไว้) และ **ค่าเป้าหมาย → `score2`** (เพิ่มใหม่) — กลับด้านจากความหมายของ Q-Model โดยตั้งใจ เพื่อไม่ย้าย/ทับ `score` เดิม. `saveResponse` จะ defer การ POST จนกว่าจะเลือก `score` (ระดับการประเมิน) ก่อน เพื่อกันค่าเป้าหมายไปทับ score. Dashboard/Live aggregate เฉพาะ Q-Model จึงไม่กระทบ.

### Teacher-pair (THAI_P1_3) — ครูประเมินตนเอง + ผอ.ประเมิน

ครู 1 คนถูกประเมินโดย **2 EvaluationSession** ที่ share `targetTeacherId` (FK→`Teacher`) + `instrument/year/term` เดียวกัน แยกด้วย enum **`EvaluatorKind { SELF, DIRECTOR }`** (`EvaluationSession.evaluatorKind`, nullable; `null` = legacy single):
- **SELF** — `evaluatorId = teacher.userId` (ครูเป็นเจ้าของ/แก้ได้)
- **DIRECTOR** — `evaluatorId =` ผอ. (SCHOOL_LEADER) ของโรงเรียน
- ระบบสิทธิ์เดิม "เจ้าของ session แก้ได้" จึงทำงานต่อ: แต่ละฝั่งแก้เฉพาะของตน; ADMIN แก้ได้ทั้งคู่ (`editable: SELF|DIRECTOR|BOTH|NONE`)

Endpoints:
- `POST /api/evaluations/teacher-pair` — ADMIN/SCHOOL_LEADER สร้าง 2 ฝั่งทีเดียว (idempotent), evaluator แต่ละฝั่งกำหนดชัด (ทำใน endpoint นี้เพราะ `POST /api/evaluations` บังคับ `evaluatorId = me.id`)
- `GET /api/evaluations/[id]/teacher-pair` — คืน self + director + responses + `editable` ให้ฟอร์มแสดงรวม
- `GET /api/schools/[schoolId]/teachers` — รายชื่อครู + ผอ. สำหรับ picker ในหน้า `/evaluations/new`

Migration ข้อมูลเดิม: `scripts/migrate-thai-teacher-pairs.js` (one-off, idempotent, รันมือหลัง backup; **ไม่อยู่ใน docker-entrypoint**) — mark THAI session เดิมเป็น SELF + backfill `targetTeacherId` จาก evaluator's Teacher + สร้างฝั่ง DIRECTOR ให้.

### Evidence + Reflection (ปลายภาคเรียน) — หน้า `/evaluations/[id]`

หน้านี้ = ครูเจ้าของแนบ **หลักฐาน** (รูป/เอกสาร/ลิงก์วิดีโอ) + เขียน **การสะท้อนคิด** **แยกตามรายด้าน (section)** ตอนปลายภาคเรียน (คะแนนกรอกที่ `/assessment/[id]`). แต่ละด้านเลือกตัวชี้วัด ≥1 ข้อ + สะท้อนคิด + แนบหลักฐาน; ต้องทำครบทุกด้าน (ป.1–3 = 5 ด้าน):
- **Reflection เก็บเป็น JSON ในฟิลด์ `EvaluationSession.reflection`** (String? @db.Text): `{ "<sectionId>": { "indicatorIds": number[], "text": string } }` — แก้ผ่าน `PATCH /api/evaluations/[id]` (ส่ง string ทั้งก้อน; owner/ADMIN). "ด้านนั้นครบ" = มี indicator ≥1 + text ไม่ว่าง; หน้าโชว์ progress "ครบ X/N ด้าน"
- หลักฐานเก็บใน model **`Evidence`** เดิม + เพิ่ม **`Evidence.sectionId Int?`** (additive, scalar) เพื่อจัดกลุ่มตามด้าน; ชนิด (image/document/link) infer จากนามสกุล/URL
- Endpoints: `GET|POST /api/evaluations/[id]/evidence` (POST multipart: `file` หรือ `url` + `description` + `sectionId`; owner/ADMIN), `DELETE /api/evaluations/[id]/evidence/[evidenceId]`
- ไฟล์อัปโหลดเขียนที่ `public/uploads/evidence/<sessionId>/` (เสิร์ฟ static; gitignored เหมือน SAR) — pattern เดียวกับ `app/api/admin/sar-documents/route.ts`
- หน้าดึง `GET /api/instruments/[id]` (sections+indicators) มา render บล็อกรายด้าน
- สิทธิ์: owner (`evaluatorId`) หรือ ADMIN เพิ่ม/ลบ/แก้ได้ (แม้สถานะ SUBMITTED); คนอื่นดูอย่างเดียว. "ปลายภาคเรียน ปีละ 2 ครั้ง" เป็นข้อความแนะนำ (ไม่ได้ lock ด้วยวันที่)

### Configuration
```
DashboardConfig (per-school JSON customization)
Evidence (attachments for EvaluationSession)
```

---

## API Endpoints (ทั้งหมด)

### Authentication
```
POST /api/auth/login          — Login, returns JWT token
GET  /api/auth/me             — Get current user from token
```

### Instruments
```
GET  /api/instruments                        — List (paginated)
POST /api/instruments                        — Create
GET  /api/instruments/:id                    — Detail
GET  /api/instruments/:id/sections           — Sections list
GET  /api/instruments/:id/sections/:sId      — Section detail
GET  /api/instruments/:id/indicators         — All indicators
```

### Evaluations
```
GET  /api/evaluations                 — List (filter: school, network, year, term)
POST /api/evaluations                 — Create session
GET  /api/evaluations/:id             — Detail
POST /api/evaluations/:id/responses   — Save/update responses
GET  /api/evaluations/:id/responses   — Get responses
```

### Networks & Reference
```
GET  /api/networks              — List networks
POST /api/networks              — Create network
GET  /api/networks/:id          — Network detail
GET  /api/networks/:id/schools  — Schools in network
GET  /api/schools               — List schools
GET  /api/academic-years        — List years
GET  /api/academic-years/:id/terms — Terms for year
GET  /api/terms                 — All terms
```

### Live Dashboard (ใหม่)
```
GET /api/live-dashboard
  Params:
    scope          = school | network | district
    schoolId       = ID โรงเรียน (scope=school)
    networkId      = ID กลุ่มโรงเรียน (scope=network)
    academicYearId = ปีการศึกษา
    termId         = เทอม
    instrumentId   = เครื่องมือประเมิน (เลือกได้; ไม่ใส่ = ค่าเริ่มต้น Q-Model)
```

> **สิทธิ์การเข้าถึง (บังคับที่ route — เดิม API เปิด public):** `GET /api/live-dashboard` เรียก `getCurrentUser` → ไม่มี token = 401. ผู้ใช้ที่ผูกกับโรงเรียน (non-admin มี `Teacher.schoolId` — SCHOOL_LEADER/SCHOOL_ADMIN/TEACHER) ถูก **clamp เป็น scope=school + schoolId ของตน** เสมอ ไม่ว่าจะส่ง param อะไรมา. ADMIN และผู้ใช้ที่ไม่ผูกโรงเรียน (เช่น SUPERVISOR) เห็นได้ทุก scope. ฝั่ง UI ([ScopeSelector](app/live-dashboard/components/ScopeSelector.tsx)) ซ่อนแท็บ scope + ตัวเลือกโรงเรียน/เครือข่าย แสดงป้าย 🔒 โรงเรียนตนเองสำหรับ user ที่ถูกล็อก (ยังเลือกปี/เทอมได้).

> **เลือกเครื่องมือได้**: `/live-dashboard` มี dropdown เลือก instrument. มิติ (dimensions) มาจาก section ของเครื่องมือที่เลือก — Q-Model คง 4 มิติ (match `nameEn`, current=`score2`/target=`score`); เครื่องมืออื่น (ป.1–3 5 ด้าน, DERS ฯลฯ) ใช้ section ของตัวเอง (current=`score`/target=`score2`). KPI/completion/spider/indicator health คำนวณตามเครื่องมือที่เลือก. `maxScale` มาจาก indicator max (5 สำหรับ Q-Model, 4 สำหรับ ป.1–3) ใช้กำหนด domain ของ spider. การรวมผล ป.1–3 รวมทั้งฝั่งครูประเมินตนเอง + ผอ.

### AI Summary (THAI ป.1–3) — บทสรุปด้วย AI
```
POST/GET /api/admin/thai-p13-summary   — สร้าง/อ่านบทสรุปด้วย AI (admin/ผอ.)
  Body/Params: scope, scopeId, academicYearId
  scope (leadership): individual (scopeId=teacherId) | school (schoolId)
                      | network (networkId) | project (scopeId=0)
  scope (supervision): supervision-t1 | supervision-t2 (scopeId=teacherId, รายรอบ)
```
- หน้า UI: `/admin/thai-summary` (tab เลือก scope) → ผล render ผ่าน `lib/thai-summary-sections.ts` ใช้ร่วมกับ export Excel/Word + หน้า print PDF (`/admin/thai-summary/[id]/print`).
- Job: `lib/jobs/run-thai-p13-summary.ts` (leadership) / `run-thai-p13-supervision.ts` (นิเทศ, hard-gate ต้องประเมินรอบนั้นเสร็จก่อน). เก็บผลใน `ThaiP13Summary` (unique `[scope, scopeId, academicYearId]`, `scope` เป็น String จึงเพิ่ม scope ใหม่ได้โดยไม่ต้อง migrate).
- **scope=network**: resolve `networkId → schoolIds` ผ่าน `SchoolNetworkMember` (pattern เดียวกับ `/api/dashboard/summary`) แล้วรวมทุกโรงเรียนในเครือข่าย. **project + network = admin เท่านั้น** (บังคับใน `lib/thai-summary-access.ts`); school/individual/supervision → ผอ. ทำได้เฉพาะโรงเรียน/ครูในสังกัด.
- ครอบคลุมระดับการสรุป: รายคน / รายโรงเรียน / **รายกลุ่มเครือข่าย** / ทั้งโครงการ. (Q-Model exec-summary ยังเป็น per-SAR ระดับโรงเรียนเท่านั้น — ดู SAR module)

### AI Prompt config (Admin) — แก้ system prompt ได้จากหน้าเว็บ
```
GET    /api/admin/ai-prompts          — list 5 prompt (default + override + active)
PATCH  /api/admin/ai-prompts/[key]    — บันทึก override (systemPrompt / enabled)
DELETE /api/admin/ai-prompts/[key]    — คืนค่าเริ่มต้น (ลบ override)
```
- หน้า UI: `/admin/settings/ai-prompts` (ADMIN เท่านั้น) — ลิงก์จาก header หน้า `/admin/thai-summary`.
- **เฉพาะ system prompt** ของ 5 ฟีเจอร์ AI แก้ได้: `thai-p13-summary`, `thai-p13-supervision`, `exec-summary`, `soar`, `sar-extract`. ระดับ **global** (ชุดเดียวทั้งโครงการ). user-prompt template (มีตัวแปร interpolate) ยังคงอยู่ในโค้ด ไม่เปิดให้แก้.
- โครงสร้าง: code const ใน `lib/ai/prompts/*` = **default** เสมอ; `AiPromptConfig` (PK=`key`, String, no migrate needed) เก็บเฉพาะ override. Resolver = [`getSystemPrompt(key)`](lib/ai/prompt-config.ts) คืน override เมื่อมี row && `enabled` && ไม่ว่าง ไม่งั้น default. รายการ prompt ที่แก้ได้คุมด้วย `PROMPT_REGISTRY` ในโค้ด.
- jobs ทั้ง 5 (`run-exec-summary`, `run-thai-p13-summary`, `run-thai-p13-supervision`, `run-soar`, `extract-or-ocr`) เรียก `getSystemPrompt(key)` แทน const โดยตรง. `promptVersion` ที่เก็บลง DB คงเป็นเวอร์ชันเทมเพลตเดิม; การแก้ของ admin ตามรอยด้วย `AiPromptConfig.updatedAt` + `AuditLog` (`AI_PROMPT_UPDATE`/`AI_PROMPT_RESET`).

### AI Chatbot — ผู้ช่วยตอบคำถามในระบบ
```
POST   /api/ai/chat                          — ส่งข้อความ { conversationId?, message } → { conversationId, answer }
GET    /api/ai/chat/conversations            — list ห้องแชตของผู้ใช้
GET/DELETE /api/ai/chat/conversations/[id]   — ข้อความในห้อง / ลบห้อง (owner-scoped)
```
- **Floating widget ทุกหน้าหลัง login**: [`app/components/chat/ChatWidget.tsx`](app/components/chat/ChatWidget.tsx) mount ใน [`AppShell`](app/components/shell/AppShell.tsx) (ConditionalShell กัน `/`, `/login`, `/print`). ปุ่มลอยมุมขวาล่าง + panel (createPortal). **ตอบทีเดียว** (ไม่ streaming) + typing indicator.
- **Ground ความรู้**: [`lib/ai/chat-knowledge.ts`](lib/ai/chat-knowledge.ts) `getKnowledgeBase()` สร้างฐานความรู้จาก **ตัวชี้วัดจริงใน DB** (Q-Model + THAI ป.1–3 ทุกตัว + level descriptors) + กรอบทฤษฎีย่อ (Q-Model/THAI/SOAR/Iceberg) — cache ใน module memory (เรียก `invalidateKnowledgeBase()` ถ้าตัวชี้วัดเปลี่ยน).
- **AI call**: `generateText()` ใน [`lib/ai/client.ts`](lib/ai/client.ts) (plain text, ไม่ใช่ JSON, reuse `aiClient`/`withBackoff`/`MODEL`). system = `getSystemPrompt('chatbot')` + KB; ส่งประวัติล่าสุด ~10 ข้อความ.
- **System prompt แก้ได้จากหน้า admin**: key `'chatbot'` อยู่ใน `PROMPT_REGISTRY` → [/admin/settings/ai-prompts](app/admin/settings/ai-prompts/page.tsx) ปรับ persona/กฎได้.
- **เก็บประวัติ DB**: models `ChatConversation` + `ChatMessage` (cascade ลบ). เส้นทางอยู่ใต้ `/api/ai` จึงผ่าน middleware gate อยู่แล้ว; owner-scoped ด้วย `requireAuth`. ต้องมี `OPENROUTER_API_KEY`.

---

## Core Calculation Logic (Live Dashboard)

### Indicator Percentage
```
percent = ((avgScore - minScore) / (maxScore - minScore)) * 100
Clipped to [0, 100]
```

### Traffic Light Status
```
Green  → percent >= 90%
Yellow → percent >= 70%
Red    → percent < 70%
```

### Q-Model Dimension Score (Live Dashboard)
- ดึง Q_MODEL instrument → sections (match by nameEn) → indicators
- Aggregate avgScore per indicator จาก EvaluationResponse (SUBMITTED sessions)
- normalize → AVG per dimension = percent score
- overallQualityIndex = AVG ของทุก dimension

---

## Assessment Flow (End-to-End)

```
1. Setup
   Admin → สร้าง Instrument + Sections + Indicators
   Admin → สร้าง School, Network, AcademicYear, Term

2. Create Session
   User → POST /api/evaluations
   Fields: schoolId, instrumentId, evaluatorId, academicYearId, termId

3. Enter Responses
   User → POST /api/evaluations/:id/responses
   Fields: indicatorId, score (current), score2 (desired, Q-Model only)
   Status: DRAFT → SUBMITTED

4. Review
   Reviewer → Update status to REVIEWED
   Evidence can be attached

5. Dashboard Calculation
   GET /api/dashboard/* → Aggregates submitted sessions
   rbm-calculator normalizes & calculates KR/Objective progress

6. Display
   Dashboard shows: KPI cards, Spider chart, Progress bars
   Live Dashboard shows: Real-time updates every 5 seconds
```

---

## Design System (v2)

Reskin ของ 21 หน้าให้ใช้ design system เดียว (ทิศทางอนุมัติแล้วใน `PRD-redesign-handoff.md` / `PRD-design-v2.md`). **Frontend-only — ไม่แตะ API/schema/data.** เริ่มลงโค้ดจริงแล้วที่ **PR #1 (รากฐาน) + reskin `/login`**.

- **Design tokens** อยู่ใน `app/globals.css` ทั้งหมดขึ้นต้น `--de-*` (brand=indigo, accent=violet, ink=slate, semantic, surface, spacing, radius, shadow, motion, font). ใช้ผ่าน `var(--de-*)` เท่านั้น — **ห้าม hardcode hex ในหน้าใหม่**. มี utility: `.de-app-shell`, `.de-container`, `.de-focus-ring`, `.de-link`, `.de-mono` + รองรับ `prefers-reduced-motion`.
- **Primitives** อยู่ใน `app/components/ui/` — `import { Button, Card, Input, Badge, Container } from '@/app/components/ui'`. ทุกตัวเป็น `'use client'`, ไม่มี external dep, accessible. ก่อนสร้าง component ใหม่ให้ reuse ของเดิมก่อน (props spec อยู่ใน `PRD-design-v2.md §3.2`). ไอคอนใช้ inline SVG จาก `app/components/ui/icons.tsx` แทน emoji.
- **Theme/Dark mode**: `ThemeProvider` (จาก `app/components/ui`) ครอบใน `app/layout.tsx`, ตั้ง `data-theme` บน `<html>`, persist ที่ `localStorage['de-theme']` (**ห้ามชนกับ `token`/`user` ของ auth**). มี anti-FOUC inline script ใน layout + `<ThemeToggle/>` พร้อมใช้. dark mode override เฉพาะ token `--de-*` — หน้าที่ยังไม่ migrate (ใช้ inline style ของตัวเอง) จึงไม่กระทบ.
- **Fonts**: Kanit (sans) + JetBrains Mono (mono) โหลดผ่าน `next/font` → `var(--de-font-sans)` / `var(--de-font-mono)`.
- **สถานะ migrate**: `/login` ✅ (รากฐาน + proof). หน้าที่เหลือยังเป็น inline style เดิม — ทยอย migrate ทีละ PR ตามลำดับใน `PRD-redesign-handoff.md` (`/assessment/[id]` ทำท้ายสุด: หวงห้าม, ต้อง feature flag + pilot + mysqldump).

---

## Frontend Pages

| Route | Description |
|-------|-------------|
| `/` | Home with navigation cards |
| `/login` | JWT authentication — **reskin แล้ว (Design System v2)**: 2-column brand/form, show/hide password, theme toggle, responsive ≤860px |
| `/dashboard` | Main dashboard (KPIs, Spider chart, Q-Model) |
| `/live-dashboard` | Real-time display screen. **อยู่ใน AppShell แล้ว** (sidebar + header + breadcrumb เหมือนหน้าอื่น) และ **รองรับ light/dark ตาม global theme** — `.ld-embed` bind `data-de-theme={theme}` เพื่อให้ legacy `--de-*` token พลิกตามธีม, accent ใช้ purple ของระบบ. ปุ่ม Pause/Fullscreen ย้ายมาอยู่หัวหน้า. (เดิมเป็น standalone projector ที่บังคับ dark) |
| `/evaluations` | List evaluation sessions |
| `/evaluations/new` | Create new evaluation session |
| `/evaluations/:id` | **เพิ่มหลักฐาน (รูป/เอกสาร/ลิงก์วิดีโอ) + บันทึกการสะท้อนคิด** ของครูเจ้าของ ตอนปลายภาคเรียน (ปีละ 2 ครั้ง). คะแนนกรอกที่ /assessment/:id |
| `/assessment/:id` | **[ใหม่]** กรอกแบบประเมิน Q-Model (Likert 1-5, tabs per section, auto-save) |
| `/instruments` | List assessment instruments |
| `/instruments/:id` | Instrument detail with sections/indicators |

---

## Real-Time Architecture (Live Dashboard)

### Strategy: Short-interval Polling (5 seconds)
- Frontend `setInterval` เรียก `/api/live-dashboard` ทุก 5 วินาที
- ไม่ต้องการ WebSocket หรือ infra เพิ่มเติม
- เหมาะสำหรับ projector/TV display screen

### Live Dashboard Layout
```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER: ชื่อโรงเรียน/กลุ่ม | ปีการศึกษา | ● LIVE | เวลา      │
│  [Filter: School ▼] [Network ▼] [District] [Year ▼] [Term ▼]   │
├──────────────┬──────────────────────────────┬───────────────────┤
│  LEFT PANEL  │      SPIDER CHART (CENTER)   │   RIGHT PANEL     │
│              │                              │                   │
│ Completion   │   Spider/Radar Chart ใหญ่    │  Indicator Health │
│   94.2%      │   (current vs target)        │  ● Curriculum 84% │
│              │                              │  ● Teacher Syn 72%│
│ Active       │                              │  ● Student W. 91% │
│ Evaluators   │                              │  ● Digital R. 65% │
│    12        │                              │                   │
│              │                              │                   │
│ Schools: 8   │                              │                   │
├──────────────┴──────────────────────────────┴───────────────────┤
│  Q-Leadership [██████████████████░░] 82%  +2% ▲                 │
│  Q-PLC        [████████████████░░░░] 74%  +1% ▲                 │
│  Q-Learning   [████████████████████] 88%  +3% ▲                 │
│  Q-Students   [████████████████████] 91%  +0% →                 │
└─────────────────────────────────────────────────────────────────┘
```

### Filter Scopes
- **school**: แสดงข้อมูลเฉพาะโรงเรียนที่เลือก
- **network**: รวมทุกโรงเรียนในกลุ่ม (SchoolNetwork)
- **district**: รวมทุกโรงเรียนในระบบ

---

## Environment Variables

```env
DATABASE_URL="mysql://root:@localhost:3306/okrsdoitung"
JWT_SECRET="school-qa-rbm-secret-key-change-in-production-2024"
JWT_EXPIRES_IN="7d"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

---

## Seeded Users (Development)

| Email | Password | Role |
|-------|----------|------|
| admin@local | Admin123 | ADMIN |
| leader@example.com | Leader123 | SCHOOL_LEADER, TEACHER |
| teacher@example.com | Teacher123 | TEACHER |

---

## Development Notes

- ไม่มี real-time ในระบบเดิม — ต้อง refresh ด้วยตนเอง
- Batch queries ถูก implement ใน q-model endpoint เพื่อลด N+1
- Inline CSS ใช้ทั่วทั้งระบบ (ไม่มี CSS files แยก)
- Thai font: Kanit (Google Fonts) ใช้ใน layout.tsx
- Spider chart domain: [0, 5] (คะแนน 1-5)
- Q-Model Dimensions (ที่ใช้จริง 4 มิติ): Q-Leadership, Q-PLC, Q-Learning, Q-Students
  (Q-Goal, Q-Info, Q-Network เป็นมิติเก่าที่ไม่ใช้แล้ว — ลบออกจาก instrument แล้ว)
- **schema.prisma อยู่ที่ root level** ไม่ใช่ `prisma/schema.prisma` — ต้องระบุ `--schema /app/schema.prisma` เสมอเมื่อรัน prisma commands ใน Docker
- Indicator model ใช้ field `textTh` / `textEn` (ไม่ใช่ `nameTh` / `nameEn`)
- Indicator model ไม่มี field `orderIndex` — ใช้ `id` แทนเมื่อ orderBy

---

## Production Server

| รายละเอียด | ค่า |
|-----------|-----|
| OS | Linux Ubuntu |
| Server IP | 203.172.184.47 |
| App Path | `/DATA/AppData/www/doitung` |
| Public URL | https://doitung.cnppai.com |
| Alt URL | http://203.172.184.47:9901 |
| Port | 9901 |

---

## Docker Deployment

### Containers
| Container | Image | Port | Status |
|-----------|-------|------|--------|
| `eqap_app` | `doitung-app` | 9901 | Next.js app |
| `eqap_db` | `mariadb:11.4` | 3306 (internal) | Database |

### Database Credentials (Production)
```
Host:     eqap_db (Docker internal hostname)
Database: okrsdoitung
User:     doitung_user
Password: doitung_pass
Root PW:  l6-lyo9N  ← รหัสจริงบน server (ไม่ใช่ rootpassword)
DATABASE_URL: mysql://doitung_user:doitung_pass@eqap_db:3306/okrsdoitung
```

> **สำคัญ:** ใช้ `mariadb` ไม่ใช่ `mysql` (Alpine-based container)
> ```bash
> docker exec eqap_db mariadb -u root -pl6-lyo9N okrsdoitung -e "SHOW TABLES;"
> ```

### Network
```
Network name: doitung_eqap_network
Driver: bridge
```

### Volumes
```
doitung_mysql_data   — MariaDB data
doitung_uploads_data — App file uploads (/app/public/uploads)
```

### Deploy Script
```bash
cd /DATA/AppData/www/doitung
git checkout -- docker-entrypoint.sh   # reset local changes
git pull origin main
bash deploy.sh
```

### ไฟล์ Docker
| ไฟล์ | หน้าที่ |
|------|---------|
| `Dockerfile` | Multi-stage build: deps → builder → runner (node:20-alpine) |
| `docker-entrypoint.sh` | Startup: TCP DB check → prisma db push → seed → node server.js |
| `docker-compose.yml` | Services: app + MariaDB + networks + volumes |
| `deploy.sh` | One-command: git pull → stop → remove image → build → up |
| `update-db.sh` | One-shot DB updater (รันบน host หลัง deploy): backup → `prisma db push` → seed THAI_P1_3 → verify. Fail-loud (ต่างจาก entrypoint ที่กลบ error). One-off migration เป็น opt-in (`RUN_THAI_MIGRATION=1`) |
| `.dockerignore` | Exclude node_modules/.next/.env (ลด context จาก 700MB → <10MB) |

### Known Issues & Fixes ที่เคยพบ
| ปัญหา | สาเหตุ | วิธีแก้ |
|-------|--------|---------|
| Build context 700MB | ไม่มี `.dockerignore` | เพิ่ม `.dockerignore` exclude node_modules |
| `orderIndex does not exist` | field ไม่มีใน Indicator schema | ใช้ `id` แทน |
| `nameTh does not exist` | field ชื่อผิด | ใช้ `textTh`/`textEn` |
| `syntax error: unexpected redirection` | `<<<` ใช้ไม่ได้ใน Alpine sh | ใช้ `echo \| pipe` แทน |
| `Cannot connect to database` | Prisma `db execute` ใช้เป็น health check ไม่ดี | ใช้ Node.js TCP socket check แทน |
| `Authentication failed` | Volume เก่ายังอยู่ ไม่มี user ใหม่ | รัน `CREATE USER` / `GRANT` ผ่าน mariadb CLI |
| `Access denied for root@localhost` | Unix socket auth | ใช้ `-h 127.0.0.1` (TCP) |
| `schema.prisma: file not found` | schema อยู่ที่ root ไม่ใช่ prisma/ | copy ใน Dockerfile + `--schema /app/schema.prisma` |
| 103 indicators (ซ้ำ) | seed รันหลายครั้ง + code เปลี่ยน (Q-Leadership-01 → L1) ทำให้ findFirst ไม่เจอ | SQL cleanup ตรงๆ แล้ว re-seed: ดู "SQL Cleanup" ด้านล่าง |
| `mysql: command not found` | Container ใช้ MariaDB ไม่ใช่ MySQL | ใช้ `mariadb` แทน `mysql` |
| `Table 'eqap_db.Instrument' does not exist` | Database จริงชื่อ `okrsdoitung` ไม่ใช่ `eqap_db` | ระบุ `okrsdoitung` ใน SQL command |
| dropdown สร้างการประเมินบน prod ขึ้นแค่ Q-Model | `seed-production.js` สร้างแค่ Q-Model; DERS/THAI_P1_3 มีเฉพาะ DB local | เพิ่ม THAI_P1_3 (4 ด้าน/50 ตัวชี้วัด + เกณฑ์ 4 ระดับ, LIKERT_1_4) ลง `seed-production.js` + `prisma/seed.ts` แบบ idempotent แล้ว re-deploy/seed |
| THAI_P1_3 ใน local ซ้ำ (54 indicator / 18 section แทน 16/4) | ถูกสร้างผ่าน UI/สคริปต์ซ้ำหลายรอบแบบไม่ idempotent | เก็บชุดล่าสุดที่ถูกต้อง (section 41–44) ลบที่เหลือ — 0 EvaluationResponse อ้างถึงจึงปลอดภัย |

### SQL Cleanup (กรณี indicators ซ้ำ)
```bash
# ลบ instrument Q_MODEL ทั้งหมดพร้อม cascade
docker exec eqap_db mariadb -u root -pl6-lyo9N okrsdoitung -e "
SET FOREIGN_KEY_CHECKS=0;
DELETE er FROM EvaluationResponse er
  JOIN EvaluationSession es ON er.evaluationSessionId = es.id
  WHERE es.instrumentId IN (SELECT id FROM Instrument WHERE type='Q_MODEL');
DELETE FROM EvaluationSession WHERE instrumentId IN (SELECT id FROM Instrument WHERE type='Q_MODEL');
DELETE FROM Indicator WHERE instrumentId IN (SELECT id FROM Instrument WHERE type='Q_MODEL');
DELETE FROM InstrumentSection WHERE instrumentId IN (SELECT id FROM Instrument WHERE type='Q_MODEL');
DELETE FROM Instrument WHERE type='Q_MODEL';
SET FOREIGN_KEY_CHECKS=1;
"
# แล้ว re-seed
docker exec eqap_app node scripts/seed-production.js
```

---

## แผนพัฒนาต่อ (Roadmap)

### Phase ปัจจุบัน: Assessment + Live Dashboard ✅ Deploy แล้ว
- [x] วิเคราะห์ระบบและเขียน context.md
- [x] สร้าง `/api/live-dashboard` endpoint (รองรับ scope filter)
- [x] สร้าง `/live-dashboard` page (Spider chart ใหญ่ + real-time polling)
- [x] Components: LiveSpiderChart, ScopeSelector, AnimatedNumber, LiveIndicator
- [x] Deploy บน production server (https://doitung.cnppai.com)
- [x] สร้าง `/assessment/[id]` page — กรอกแบบประเมิน Q-Model (Likert 1-5, auto-save, tabs per section)
- [x] Seed script ใช้ 47 indicators จริงจาก SQL dump (4 groups: L1-L12, PLC1-PLC10, T1-T12, S1-S13)
- [x] แก้ปัญหา 103 indicators ซ้ำด้วย SQL cleanup + force-clean ใน seed script

### Phase ปัจจุบัน: Sticky Notes / Collaborative Board ✅ Deploy แล้ว
ระบบระดมสมองแบบ Post-it บนช่อง Iceberg ของ `/admin/sar/new` แชร์ลิงก์ให้คนอื่น
ร่วมระดมสมองได้ ทั้ง user ที่ login และ guest โดยไม่ต้องลงทะเบียน

- [x] เพิ่ม `StickyBoard` + ขยาย `StickyNote` ใน `schema.prisma`
  (เพิ่ม `boardId`, `authorToken`, `authorName`)
- [x] เพิ่ม `@@unique([contextType, contextId])` บน `StickyBoard` —
  เอกลักษณ์ของบอร์ดต่อหนึ่ง context, race-free
- [x] `scripts/dedupe-sticky-boards.js` — รวม StickyBoard ที่ซ้ำให้เหลือใบเดียว
  ก่อน push schema ใหม่ (ปลอดภัยรันซ้ำ)
- [x] API endpoints
  - `POST /api/sticky-boards/get-or-create` — ใช้ `prisma.upsert` กับ
    compound unique key `(contextType, contextId)` แทน findFirst+create
    เพื่อไม่ให้สร้างซ้ำเวลามีคนเปิดพร้อมกัน
  - `GET /api/sticky-boards/by-key/:shareKey` — public lookup สำหรับ /sticky page
  - `POST /api/sticky-boards/:id/close` — เก็บบอร์ด (status=ARCHIVED), reversible
  - `POST /api/sticky-boards/:id/clear` — owner-only, soft-archive ทุก note
  - `GET /api/sticky-notes?boardKey=...` — public read (board ต้อง ACTIVE)
  - `POST/PATCH/DELETE /api/sticky-notes[/:id]` — รับ Bearer หรือ guest token
- [x] Client: `useStickyNotes` hook (5s polling), `StickyNoteCard` (draft +
  Save/Cancel ต่อ note), `StickyBoardSurface` (toolbar + corkboard +
  fullscreen), `StickyNoteModal` (portal เพื่อหลุด stacking context),
  `/sticky?key=...` standalone page
- [x] Authorization model — see `README_STICKY_ICEBERG.md`:
  - **Owner** (เจ้าของ): clear, archive board, มองเห็นปุ่มทั้งหมด
  - **Author**: edit content/delete ของ note ตัวเอง
  - **ใครก็ตามที่มี shareKey**: ดู, เพิ่ม note, ลาก/เปลี่ยนสีของใครก็ได้
- [x] shareKey + guest token มี security trade-off ที่ documented แล้ว
  (URL-leakage, localStorage XSS exposure)
- [ ] **Future**: แทน in-memory rate limit ด้วย Redis ถ้า scale > 1 instance
- [ ] **Future**: เพิ่ม automated test framework (Vitest) — ดู `tasks.md`
- [ ] **Future**: ผูกบอร์ดกับ LINE OA notification ตอนมี note ใหม่

### Phase ปัจจุบัน: Q-Model Rubric บนหน้า Assessment ✅ Deploy แล้ว
ในแต่ละแถวของ `/assessment/[id]` มีปุ่ม "▶ ดูเกณฑ์" ที่กางแสดงเกณฑ์
การให้คะแนน 5 ระดับ (รับจาก
`2025_12_03แบบประเมินโรงเรียน_editedV.2(2).pdf`) พร้อม highlight ระดับที่
rater กำลังเลือก — ม่วงสำหรับ score2 (สภาพที่เป็นอยู่), น้ำเงินสำหรับ
score (สภาพที่พึงประสงค์)

- [x] `scripts/data/q-model-rubrics.js` — ที่เก็บ rubric ทั้ง 47 ตัวชี้วัด
  (L1–12, PLC1–10, T1–12, S1–13) ใช้ร่วมโดย dev seed (`prisma/seed.ts`)
  และ prod seed (`scripts/seed-production.js`)
- [x] `Indicator.levelDescriptors` (Json?) เก็บ rubric ของแต่ละข้อใน DB
- [x] หน้า Assessment เพิ่ม `openRubricIds: Set<number>` state +
  collapsible row (`colSpan=11`) ที่ render เกณฑ์ลงไปใต้ตัวชี้วัด
- [x] `seed-production.js` ทำ idempotent update — เปรียบเทียบ
  `JSON.stringify(levelDescriptors)` ก่อน emit UPDATE เพื่อไม่ churn
  `updatedAt` ทุก boot

### Phase ปัจจุบัน: เปิดใช้แบบประเมินตนเองภาษาไทย ป.1–3 (THAI_P1_3) ✅ เสร็จ local / ⏳ รอ deploy
แบบประเมินตนเองภาษาไทย ป.1–3 เป็น single-rating LIKERT_1_4 + เกณฑ์ 4 ระดับต่อข้อ (**4 ด้าน / 50 ตัวชี้วัด** ตาม `docs/Rubric_thai_12 Dec 2025.docx`) เดิมมีเฉพาะใน DB local เป็นเวอร์ชันย่อ 16 ข้อที่ไม่มีเกณฑ์ และฟอร์มประเมิน hardcode เป็น Q-Model (1–5 + dual state) จึงใช้งานจริงไม่ได้

- [x] หน้า `/assessment/[id]` ปรับ scale + คอลัมน์ตาม `instrument.type` (dual เฉพาะ `Q_MODEL`) และ `minScore..maxScore` ของ indicator; ป้ายระดับ 1–4 = ต้องปรับปรุง/พอใช้/ดี/ดีเยี่ยม
- [x] สกัด rubric เต็มจาก docx → `scripts/data/thai-p1-3.js` (4 ด้าน/50 ตัวชี้วัด + เกณฑ์ 4 ระดับ) เป็น single source ใช้ร่วมทั้ง dev/prod seed
- [x] refactor `scripts/seed-production.js` + `prisma/seed.ts` ให้ `require('./data/thai-p1-3')` แบบ idempotent + sync `levelDescriptors`
- [x] reseed local DB: ล้างของเดิมแล้วสร้างใหม่ → 4 ด้าน (6/6/16/22) / 50 ตัวชี้วัด ทุกข้อมี rubric
- [x] ทดสอบ local (Preview): ฟอร์ม 50 ข้อ 4 แท็บ, "ดูเกณฑ์" กางเกณฑ์ 4 ระดับได้, save score เดี่ยว (1–4) progress นับถูก; Q-Model ยัง dual 1–5 (47 ข้อ) ไม่ regress
- [ ] **Deploy prod**: `git pull origin main && bash deploy.sh` → `docker-entrypoint.sh` รัน `seed-production.js` สร้าง instrument บน prod (additive, ไม่แตะข้อมูลเดิม)
- [ ] **หมายเหตุ**: `/api/dashboard/*` (summary/q-model/spider-graph) ยัง aggregate เฉพาะ 4 มิติ Q-Model. **`/live-dashboard` เลือก instrument ได้แล้ว** — ดู THAI ป.1–3 / DERS ได้ (มิติ = section ของเครื่องมือนั้น)

### One-shot: Q-Model instrument migration (ทำครั้งเดียวต่อ env)
DB เก่าก่อน May 2026 cleanup เคยมี Q-Model instrument 2 ตัว (legacy
`Q_MODEL` กับ duplicate `Q-MODEL-2568`) + section ซ้ำ + indicators
รหัสเก่า (Q-L-01 ฯลฯ) → `/assessment/[id]` แสดง 72 ตัว แทนที่จะเป็น 47

**Run-book** (ทำครั้งเดียวต่อ environment ที่ยังไม่ได้ converge):
```bash
docker exec eqap_app node /app/scripts/migrate-q-model-instrument.js
```

`scripts/migrate-q-model-instrument.js`:
- เลือก canonical instrument (most sessions → smallest id)
- ลบ duplicate Q-Model rows (เฉพาะที่ session=0)
- Rename canonical → code='Q-MODEL-2568'
- Wipe legacy/duplicate sections + indicators (และ EvaluationResponse
  ที่อ้างถึง — โดย default จะลบ smoke-test data ของรหัสเก่า)
- ทุกอย่างอยู่ใน `prisma.$transaction` — ถ้าตัดกลางคันจะ rollback
- มี idempotent fast-path: ถ้า DB อยู่ในสภาพ canonical อยู่แล้ว, exit ภายใน ms

**ไม่ได้รวมไว้ใน docker-entrypoint** เพราะเป็น destructive script ที่ถ้า
ทำงานบน DB ที่มีคน custom indicator เพิ่มเข้ามาเอง อาจลบโดยไม่ได้ตั้งใจ —
รันด้วยตัวเองครั้งเดียวต่อ env แล้วปล่อยไว้

- [ ] **Future**: เมื่อ converge ครบทุก env แล้ว (dev / staging / prod)
  สามารถลบ `scripts/migrate-q-model-instrument.js` ทิ้งได้

