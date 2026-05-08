# tasks.md
## Development Tasks Checklist

รายการงานพัฒนาระบบ School QA + RBM Dashboard แบ่งตาม Phase

---

## ✅ Phase 1: Foundation & Schema

### Database Schema
- [x] ออกแบบ Prisma Schema พื้นฐาน (User, Role, School, AcademicYear, Term)
- [x] ออกแบบ Instrument Models (Instrument, InstrumentSection, Indicator)
- [x] ออกแบบ Evaluation Models (EvaluationSession, EvaluationResponse)
- [x] ออกแบบ OKR Models (OKRObjective, OKRKeyResult, OKRAction)
- [x] ออกแบบ Evidence & DashboardConfig Models
- [x] เพิ่ม SchoolNetwork และ SchoolNetworkMember (multi-network support)
- [x] เพิ่ม ActionStatus และ OKRStatus enums
- [x] เพิ่ม Action Plan fields ใน OKRAction (resources, risks, mitigation, outputs, outcomes, evidence)
- [x] เพิ่ม Indexes สำหรับ Performance

### Seed Data
- [ ] สร้าง `prisma/seed.ts`
- [ ] Seed Roles (ADMIN, SCHOOL_LEADER, TEACHER, SUPERVISOR)
- [ ] Seed Users (admin, leader, teacher)
- [ ] Seed Schools (1–2 โรงเรียนตัวอย่าง)
- [ ] Seed SchoolNetworks (1–2 เครือข่ายตัวอย่าง)
- [ ] Seed AcademicYears & Terms (ปี 2568, เทอม 1/2568)
- [ ] Seed Instruments (DERS, THAI_P1_3, Q_MODEL)
- [ ] Seed InstrumentSections สำหรับ DERS
- [ ] Seed Indicators สำหรับ DERS (จากข้อมูลจริง)
- [ ] Seed InstrumentSections สำหรับ THAI_P1_3
- [ ] Seed Indicators สำหรับ THAI_P1_3 (จากข้อมูลจริง)
- [ ] Seed InstrumentSections สำหรับ Q_MODEL (6 มิติ: Q-Leadership, Q-PLC, Q-Learning, Q-Goal, Q-Info, Q-Network)
- [ ] Seed Indicators สำหรับ Q_MODEL (จากข้อมูลจริง)
- [ ] Seed Sample EvaluationSessions (1–2 sessions)
- [ ] Seed Sample EvaluationResponses (คำตอบตาม Indicators)
- [ ] Seed Sample OKRObjectives (1–2 objectives เชื่อม Q-Model)
- [ ] Seed Sample OKRKeyResults (3–5 KRs per objective)
- [ ] Seed Sample OKRKeyResultIndicators (เชื่อม KR กับ Indicators)
- [ ] Seed Sample OKRActions (2–3 actions per KR)
- [ ] Seed Sample Evidence (ไฟล์/URL ตัวอย่าง)

### Database Migration
- [ ] รัน `prisma generate` เพื่อสร้าง Prisma Client
- [ ] รัน `prisma migrate dev --name init` เพื่อสร้างตาราง
- [ ] รัน `prisma db seed` เพื่อใส่ข้อมูลเริ่มต้น
- [ ] ทดสอบ Query ข้อมูลพื้นฐาน (GET users, schools, instruments)

---

## Phase 2: Backend API

### Setup Project Structure
- [ ] สร้าง Next.js Project (TypeScript, App Router)
- [ ] ติดตั้ง Dependencies
  - [ ] `@prisma/client`
  - [ ] `prisma`
  - [ ] `next`
  - [ ] `react`
  - [ ] `react-dom`
  - [ ] `typescript`
  - [ ] `tailwindcss`
- [ ] สร้าง `lib/prisma.ts` - Prisma Client Singleton
- [ ] สร้าง `types/` folder - TypeScript types
- [ ] สร้าง `utils/` folder - Utility functions

### Authentication & Authorization (Stub)
- [ ] สร้าง `lib/auth.ts` - Mock authentication
- [ ] สร้าง `middleware/auth.ts` - Auth middleware
- [ ] ออกแบบ JWT/Session structure (for future)

### API Routes: Instruments & Indicators
- [ ] `GET /api/instruments` - List all instruments
  - [ ] Query params: type?, isActive?
  - [ ] Response: { instruments: Instrument[] }
- [ ] `GET /api/instruments/:id` - Get instrument details
  - [ ] Include: sections, indicators count
- [ ] `GET /api/instruments/:id/sections` - Get sections
  - [ ] Response: { sections: InstrumentSection[] }
- [ ] `GET /api/instruments/:id/indicators` - Get indicators
  - [ ] Query params: sectionId?
  - [ ] Response: { indicators: Indicator[] }
- [ ] `POST /api/instruments` - Create instrument (admin only)
  - [ ] Body: { code, nameTh, nameEn, type, description?, version? }
  - [ ] Validation
- [ ] `PATCH /api/instruments/:id` - Update instrument
- [ ] `GET /api/indicators/:id` - Get indicator details

### API Routes: Evaluations
- [ ] `GET /api/evaluations` - List evaluations
  - [ ] Query params: instrumentId?, schoolId?, networkId?, academicYearId?, termId?, status?, evaluatorId?
  - [ ] Response: { evaluations: EvaluationSession[], total, page, limit }
- [ ] `GET /api/evaluations/:id` - Get evaluation details
  - [ ] Include: instrument, school, academicYear, term, evaluator, targetTeacher, responses
- [ ] `POST /api/evaluations` - Create evaluation session
  - [ ] Body: { instrumentId, schoolId, academicYearId, termId?, evaluatorId, targetTeacherId?, targetSchoolId?, note? }
  - [ ] Validation
- [ ] `PATCH /api/evaluations/:id` - Update evaluation
  - [ ] Body: { status?, note? }
- [ ] `POST /api/evaluations/:id/responses` - Save responses (batch)
  - [ ] Body: { responses: [{ indicatorId, score, comment?, evidenceUrl? }] }
  - [ ] Validation (score within min/max)
- [ ] `PATCH /api/evaluations/:id/responses/:responseId` - Update single response
- [ ] `DELETE /api/evaluations/:id` - Delete evaluation
  - [ ] Cascade delete responses, evidence

### API Routes: OKRs
- [ ] `GET /api/okrs/objectives` - List objectives
  - [ ] Query params: schoolId?, networkId?, academicYearId?, dimension?, status?, ownerId?
  - [ ] Include: keyResults (with progress)
- [ ] `GET /api/okrs/objectives/:id` - Get objective details
  - [ ] Include: school, network, academicYear, owner, keyResults (with indicators, actions)
- [ ] `POST /api/okrs/objectives` - Create objective
  - [ ] Body: { code?, title, description?, dimension?, schoolId?, networkId?, academicYearId?, ownerId?, quarter? }
- [ ] `PATCH /api/okrs/objectives/:id` - Update objective
- [ ] `DELETE /api/okrs/objectives/:id` - Delete objective (cascade KRs)
- [ ] `GET /api/okrs/objectives/:id/key-results` - Get KRs
- [ ] `POST /api/okrs/objectives/:id/key-results` - Create KR
  - [ ] Body: { title, description?, baseline?, target?, unit?, quarter?, ownerId? }
- [ ] `PATCH /api/okrs/key-results/:id` - Update KR
- [ ] `DELETE /api/okrs/key-results/:id` - Delete KR
- [ ] `POST /api/okrs/key-results/:id/actions` - Create action
  - [ ] Body: { title, description?, order?, ownerId?, startDate?, endDate?, requiredResources?, risks?, mitigation?, expectedOutputs?, expectedOutcomes?, evidenceOfSuccess? }
- [ ] `PATCH /api/okrs/actions/:id` - Update action
- [ ] `POST /api/okrs/key-results/:id/indicators` - Link indicator to KR
  - [ ] Body: { indicatorId, weight? }
- [ ] `DELETE /api/okrs/key-results/:id/indicators/:indicatorId` - Unlink indicator

### API Routes: Dashboard & Aggregation
- [ ] `GET /api/dashboard/summary` - Overall summary
  - [ ] Query params: schoolId?, networkId?, academicYearId?, termId?
  - [ ] Response: { completionRate, overallQualityIndex, kpiCards: [...] }
- [ ] `GET /api/dashboard/q-model` - Q-Model progress
  - [ ] Query params: schoolId?, networkId?, academicYearId?, termId?
  - [ ] Response: { dimensionProgress: [{ dimension, current, target }] }
- [ ] `GET /api/dashboard/instrument/:instrumentId` - Instrument summary
  - [ ] Query params: schoolId?, networkId?, academicYearId?, termId?
  - [ ] Response: { averages: [{ section, indicator, avgScore, maxScore }] }
- [ ] `GET /api/dashboard/okr-progress` - OKR progress
  - [ ] Query params: schoolId?, networkId?, academicYearId?, objectiveId?
  - [ ] Response: { objectives: [{ id, title, progress, keyResults: [...] }] }
- [ ] `GET /api/dashboard/kr/:id/detail` - KR indicator map
  - [ ] Response: { kr: {...}, indicators: [{ id, itemCode, textTh, current, baseline, target }] }
- [ ] `GET /api/dashboard/comparison` - Compare schools/networks
  - [ ] Query params: type (school|network|year), ids[], academicYearId?, termId?
  - [ ] Response: { comparisons: [{ id, name, data: [...] }] }
- [ ] `GET /api/networks` - List networks
- [ ] `GET /api/networks/:id` - Network details
- [ ] `GET /api/networks/:id/schools` - Schools in network
- [ ] `GET /api/networks/:id/aggregate` - Network-level aggregation

### RBM Calculation Logic
- [ ] สร้าง Service: `lib/rbm/calculateIndicatorPercent(indicatorId, filters)`
  - [ ] Query EvaluationResponses with filters
  - [ ] Calculate average score
  - [ ] Normalize to 0–100%
- [ ] สร้าง Service: `lib/rbm/calculateKRCurrent(keyResultId, filters)`
  - [ ] Get linked indicators via OKRKeyResultIndicator
  - [ ] Calculate indicator percentages
  - [ ] Weighted average (consider weight in OKRKeyResultIndicator)
- [ ] สร้าง Service: `lib/rbm/calculateKRProgress(keyResultId)`
  - [ ] Get KR baseline, target, current
  - [ ] Calculate progress % = (current - baseline) / (target - baseline) * 100
  - [ ] Clip to 0–120%
- [ ] สร้าง Service: `lib/rbm/calculateObjectiveProgress(objectiveId)`
  - [ ] Get all KRs
  - [ ] Average KR progress values
- [ ] สร้าง Service: `lib/rbm/updateKRCurrentValues(filters?)` - Batch update
  - [ ] Update current values for all KRs (based on latest evaluation data)
- [ ] สร้าง Service: `lib/rbm/getTrafficLightStatus(progressPct)`
  - [ ] Green: ≥ 90%
  - [ ] Yellow: 70–90%
  - [ ] Red: < 70%

### Evidence Management
- [ ] `POST /api/evidence` - Upload evidence
  - [ ] File upload (multer หรือ form-data)
  - [ ] Store in Local Storage หรือ S3
  - [ ] Save URL to database
- [ ] `GET /api/evidence/:id` - Get evidence details
- [ ] `DELETE /api/evidence/:id` - Delete evidence
  - [ ] Delete file from storage
  - [ ] Delete record from database

---

## Phase 3: Frontend Pages

### Layout & Navigation
- [ ] สร้าง `app/layout.tsx` - Root layout
  - [ ] Import Kanit font (Google Fonts)
  - [ ] Apply global styles (Tailwind)
- [ ] สร้าง `components/Layout.tsx` - Main layout component
  - [ ] Sidebar navigation
  - [ ] Header (logo, user menu)
  - [ ] Footer
- [ ] สร้าง Navigation links (Dashboard, Evaluations, Instruments, OKRs, Reports)
- [ ] Responsive navigation (hamburger menu for mobile)

### Dashboard Page (`/dashboard`)
- [ ] Filter Bar Component
  - [ ] School Select (with network filter)
  - [ ] Network Select
  - [ ] Academic Year Select
  - [ ] Term Select
  - [ ] Instrument Select
  - [ ] Q-Dimension Select
- [ ] KPI Cards Component
  - [ ] Overall Quality Index Card
  - [ ] Completion Rate Card
  - [ ] Q-Dimension Progress Cards (6 cards)
  - [ ] KR Status Card
- [ ] Charts Components
  - [ ] Bar Chart: Q-Model Progress by Dimension (Chart.js หรือ Recharts)
  - [ ] Radar Chart: Q-Model Target vs Current
  - [ ] Line Chart: Trend over Time
- [ ] Table: Low-Scoring Indicators
  - [ ] Columns: Instrument, Section, Indicator, Average, Target, Status
  - [ ] Sort by: average score (ascending)
- [ ] Recent Evaluations List
  - [ ] Card layout
  - [ ] Status badges
- [ ] Loading states
- [ ] Error handling

### Instruments Pages
- [ ] `/instruments` - List instruments
  - [ ] Table: Code, Name (TH), Type, Version, Actions
  - [ ] Filter by type
- [ ] `/instruments/[id]` - Instrument details
  - [ ] Header: Name, Type, Description
  - [ ] Tabs: Sections, Indicators
  - [ ] Sections tab: List of sections with indicator counts
  - [ ] Indicators tab: Table of indicators (itemCode, section, textTh, scaleType)

### Evaluations Pages
- [ ] `/evaluations` - List evaluations
  - [ ] Filter bar (instrument, school, year, term, status)
  - [ ] Table: ID, Instrument, School/Target, Year/Term, Status, Actions
  - [ ] Actions: View, Edit, Delete
- [ ] `/evaluations/new` - Create evaluation wizard
  - [ ] Step 1: Select instrument
  - [ ] Step 2: Select school/target (teacher/school)
  - [ ] Step 3: Select year/term
  - [ ] Review & Submit
- [ ] `/evaluations/[id]` - Evaluation form
  - [ ] Header: Instrument name, School/Target, Year/Term, Status
  - [ ] Sections as tabs or accordion
  - [ ] Render indicators with Likert radio buttons (1–4 or 1–5)
  - [ ] Comment box per indicator (optional)
  - [ ] Evidence upload section
  - [ ] Save Draft / Submit buttons
  - [ ] Auto-save (optional)

### OKRs Pages
- [ ] `/okrs` - List objectives
  - [ ] Filter bar (school, network, year, quarter, dimension)
  - [ ] Table/List: Code, Title, Dimension, Owner, Progress, Status
  - [ ] Progress bars
  - [ ] Status colors (Green/Yellow/Red)
- [ ] `/okrs/[id]` - Objective details
  - [ ] Header: Title, Dimension, Owner, School/Network, Year, Quarter, Status
  - [ ] List of KRs
    - [ ] KR Card: Title, Baseline → Current → Target, Progress bar, Status color
    - [ ] Linked indicators badges
    - [ ] Expandable: Actions & Evidence
  - [ ] Add KR button
  - [ ] Add Action button (per KR)

### Reports Pages
- [ ] `/reports` - Reports hub
  - [ ] Tabs: Q-Model, DERS, Thai P.1–3, OKR Progress
  - [ ] Charts per tab
  - [ ] Export buttons (CSV/PDF - future)

### Comparison Views
- [ ] `/dashboard/comparison` - Comparison page
  - [ ] Select comparison type (school vs school, network vs network, same school across years)
  - [ ] Select items to compare (2 schools, 2 networks, or multiple years)
  - [ ] Side-by-side charts
  - [ ] Difference highlights

---

## Phase 4: UI/UX Refinement

### Mobile Responsiveness
- [ ] Responsive design for all pages
- [ ] Touch-friendly inputs (larger buttons, spacing)
- [ ] Mobile navigation (hamburger menu)
- [ ] Optimize charts for mobile (responsive charts)
- [ ] Test on real devices (iOS, Android)

### Thai Language Support
- [ ] ตรวจสอบข้อความไทยทั้งหมด (labels, messages, errors)
- [ ] ใช้ Kanit font อย่างสม่ำเสมอ
- [ ] ข้อความที่เป็นมิตรกับครู (ไม่ใช้ศัพท์เทคนิคมากเกินไป)
- [ ] Localization helper (ถ้าต้องการ)

### User Experience
- [ ] Loading states (skeletons, spinners)
- [ ] Error handling & user-friendly messages (Thai)
- [ ] Success notifications (Toast messages)
- [ ] Form validation (client-side, real-time)
- [ ] Confirmation dialogs for destructive actions
- [ ] Empty states (เมื่อไม่มีข้อมูล)
- [ ] Search functionality (where applicable)

---

## Phase 5: Testing & Documentation

### Testing
- [ ] Unit tests for RBM calculation logic
  - [ ] Test `calculateIndicatorPercent()`
  - [ ] Test `calculateKRCurrent()`
  - [ ] Test `calculateKRProgress()`
  - [ ] Test `calculateObjectiveProgress()`
- [ ] Integration tests for API routes
  - [ ] Test `/api/evaluations` endpoints
  - [ ] Test `/api/okrs` endpoints
  - [ ] Test `/api/dashboard` endpoints
- [ ] E2E tests for critical workflows
  - [ ] Create evaluation workflow
  - [ ] View dashboard workflow
  - [ ] Create OKR workflow
- [ ] Performance testing
  - [ ] Query optimization
  - [ ] Database indexes verification

### Documentation
- [ ] API Documentation (Swagger/OpenAPI)
- [ ] User Manual (สำหรับครู, ผอ.)
  - [ ] Screenshots
  - [ ] Step-by-step guides
- [ ] Developer Guide
  - [ ] Setup instructions
  - [ ] Architecture overview
  - [ ] Code conventions
- [ ] Deployment Guide
  - [ ] Database setup
  - [ ] Environment variables
  - [ ] Production deployment steps

---

## Phase 6: Deployment & Launch

### Production Setup
- [ ] Production database setup (MySQL)
- [ ] Environment variables configuration (.env.production)
- [ ] File storage setup (S3 หรือ Local)
- [ ] SSL Certificate
- [ ] Domain configuration

### Deployment
- [ ] Deploy Next.js app (Vercel, AWS, หรือ Self-hosted)
- [ ] Database migration (production)
- [ ] Seed production data (instruments, indicators)
- [ ] Smoke testing (production environment)

### Launch
- [ ] User training (ครู, ผอ.)
  - [ ] Training materials
  - [ ] Video tutorials (optional)
- [ ] Support & monitoring setup
  - [ ] Error logging (Sentry หรือ similar)
  - [ ] Analytics (optional)
- [ ] Bug fixes (hotfixes)

---

## Ongoing Tasks

### Code Quality
- [ ] ESLint configuration
- [ ] Prettier configuration
- [ ] Code review process
- [ ] Refactoring (reduce duplication)

### Performance Optimization
- [ ] Database query optimization
- [ ] Caching (API responses, calculations)
- [ ] Image optimization
- [ ] Code splitting (Next.js)

### Security
- [ ] Input validation (all endpoints)
- [ ] SQL injection prevention (Prisma handles this)
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Rate limiting (optional)

---

**อัปเดตล่าสุด**: วันที่เริ่มโครงการ  
**สถานะ**: Phase 1 กำลังดำเนินการ  
**Next Tasks**: Seed data, Backend API setup

---

## Phase: Sticky Notes / Collaborative Brainstorming Board ✅ Deploy แล้ว

ระบบ Post-it บอร์ดบนช่อง Iceberg ของ `/admin/sar/new` รองรับการแชร์ลิงก์ให้
ทั้งผู้ใช้ที่ login และ guest มาร่วมระดมสมองได้พร้อมกัน

### Schema + Migration
- [x] เพิ่ม `StickyBoard` model พร้อม shareKey (40-hex), ownerUserId, schoolId, status (ACTIVE | ARCHIVED), closedAt
- [x] เพิ่ม `@@unique([contextType, contextId])` กันบอร์ดซ้ำเวลามีคนเปิดพร้อมกัน
- [x] ขยาย `StickyNote` ด้วย boardId (FK), authorToken (sha256 ของ guest token), authorName
- [x] `scripts/dedupe-sticky-boards.js` — รวมบอร์ดซ้ำก่อน apply unique constraint
- [x] `docker-entrypoint.sh` รัน dedupe ก่อน `prisma db push` ทุก deploy

### API
- [x] `POST /api/sticky-boards/get-or-create` ใช้ `prisma.stickyBoard.upsert`
- [x] `GET /api/sticky-boards/by-key/:shareKey` — public, รวมข้อมูลสำหรับ /sticky page
- [x] `POST /api/sticky-boards/:id/close` — owner archive (reversible)
- [x] `POST /api/sticky-boards/:id/clear` — owner-only soft archive ทุก note
- [x] `/api/sticky-notes` รองรับทั้ง Bearer token และ `X-Sticky-Guest-Token` header
- [x] In-memory rate limit (60 POST/min/IP/board) บน POST notes

### Client
- [x] `useStickyNotes` hook — 5s polling, optimistic patch, archived-state guard
- [x] `StickyNoteCard` — draft state per note + Save/Cancel; canEditContent / canDelete flags
- [x] `StickyBoardSurface` — toolbar + corkboard + fullscreen toggle (เป็น viewport เต็ม)
- [x] `StickyNoteModal` — render ผ่าน React portal กัน stacking-context bleed-through
- [x] `app/sticky/page.tsx` — standalone shareable page รองรับ guest + ใส่ชื่อแสดง
- [x] เพิ่มปุ่มระดมสมองครบทั้ง 8 ช่องของ Iceberg (4 ชั้น × 2 ด้าน)
- [x] Fallback message เมื่อ schoolId เป็น null ใน modal

### Documentation
- [x] `README_STICKY_ICEBERG.md` — feature overview, authorization matrix, security & sharing notes
- [x] อัปเดต `context.md` ให้สะท้อนสถาปัตยกรรมใหม่
- [x] CLAUDE.md เพิ่ม "ภาษาที่ใช้ตอบ" บอกให้ตอบไทยเป็นค่าเริ่มต้น

### Future / TODO (ต้องทำในรอบถัดไป)
- [ ] เพิ่ม **automated test framework** (Vitest หรือ Jest)
  - ทดสอบ get-or-create idempotency: POST 2 ครั้ง → คาดหวัง same id + shareKey
  - ทดสอบ authorization matrix (owner/author/guest cross-edit/delete)
  - ทดสอบ archive → reactivate cycle
  - **ตอนนี้** การทดสอบยังเป็น manual curl chain ใน README ส่วน "Testing locally yourself"
- [ ] ย้าย rate limit จาก in-memory `Map` → **Redis** เมื่อ scale > 1 app instance
  (TODO comment อยู่ที่ `app/api/sticky-notes/route.ts` ใกล้ `POST_BUCKETS`)
- [ ] (Optional) ย้าย guest token จาก localStorage → `httpOnly` cookie เพื่อปิดช่อง XSS exposure
- [ ] (Optional) ผูกการเปลี่ยนแปลงในบอร์ดเข้ากับ LINE OA notification

---

## Phase: Q-Model Rubric บนหน้า Assessment ✅ Deploy แล้ว

แสดงเกณฑ์การให้คะแนน 5 ระดับ (รับจาก PDF
`2025_12_03แบบประเมินโรงเรียน_editedV.2(2).pdf`) ใต้แต่ละตัวชี้วัดของหน้า
`/assessment/[id]` แบบ collapsible — ผู้ประเมินกาคะแนนได้แม่นขึ้นโดยไม่
ต้องเปิด PDF อ้างอิงข้างนอก

### Data + Seed
- [x] เพิ่ม `scripts/data/q-model-rubrics.js` — เกณฑ์ครบ 47 ตัวชี้วัด
  (L1–12, PLC1–10, T1–12, S1–13) × 5 ระดับ
- [x] `Indicator.levelDescriptors` (Json?) เก็บ rubric ใน DB
- [x] `scripts/seed-production.js` upsert rubric แบบ idempotent —
  เปรียบเทียบ JSON ก่อน emit UPDATE ลด `updatedAt` churn
- [x] `prisma/seed.ts` ใช้ rubric ตัวเดียวกันผ่าน CommonJS interop

### UI
- [x] ปุ่ม "▶ ดูเกณฑ์" / "▼ ซ่อนเกณฑ์" ติดข้อความตัวชี้วัดแต่ละแถว
- [x] Row ขยาย (`colSpan=11`) แสดงเกณฑ์ 5 ระดับ (5 → 1 จากเก่งสุด)
- [x] Highlight ระดับที่ rater เลือก: ม่วงสำหรับ score2, น้ำเงินสำหรับ score

### One-shot: Q-Model instrument migration
DB เก่ามี Q-Model instrument ซ้ำ 2 ตัว + section ซ้ำ + รหัสเก่า. เขียน
`scripts/migrate-q-model-instrument.js` ที่ converge ให้เหลือ canonical
ตัวเดียว 47 ตัวชี้วัด

- [x] Wrap ใน `prisma.$transaction` — ถ้าพลาดกลางคัน rollback
- [x] Fast-path idempotency check (1 instrument, 47 canonical itemCodes,
  code = `Q-MODEL-2568`) → exit ภายใน ms
- [x] **ไม่อยู่ใน docker-entrypoint** — destructive too risky ที่จะรันทุก
  boot. Run-book: `docker exec eqap_app node /app/scripts/migrate-q-model-instrument.js`
  ทำครั้งเดียวต่อ env แล้วปล่อย
- [ ] **Future**: เมื่อ converge ครบทุก env แล้ว ลบ migration script ทิ้งได้

### Future / TODO
- [ ] เพิ่ม **automated test** สำหรับ migration script
  (idempotency, polluted-DB → canonical, no-op cases) — ตอนนี้ verify
  ด้วย manual run บน local DB เท่านั้น
- [ ] (Optional) เพิ่ม PDF version/checksum ใน
  `scripts/data/q-model-rubrics.js` เพื่อช่วย detect drift เมื่อ PDF อัปเดต
- [ ] (Optional) Accessibility: เพิ่ม `aria-expanded` / `aria-controls` ที่
  ปุ่ม disclosure เพื่อ screen readers
