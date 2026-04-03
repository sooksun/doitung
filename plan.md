# plan.md
## แผนการพัฒนาระบบ School QA + RBM Dashboard

---

## ภาพรวมโครงการ (Overview)

ระบบ School QA + RBM Dashboard เป็นแพลตฟอร์มสำหรับการประเมินและพัฒนาคุณภาพโรงเรียนโดยใช้เครื่องมือ 3 ชนิด (DERS, Thai P.1–3, Q-Model) และเชื่อมโยงไปสู่ OKR & RBM สำหรับการจัดการผลลัพธ์

**ระยะเวลาโครงการ**: 4–6 เดือน  
**ทีมพัฒนา**: Full-stack Developer (1–2 คน)  
**Tech Stack**: Next.js + TypeScript + Prisma + MySQL

---

## Phase 1: Foundation & Schema (Weeks 1–2)

### 1.1 Database Schema Design ✅
- [x] ออกแบบ Prisma Schema
  - [x] Models: User, Role, School, SchoolNetwork, AcademicYear, Term
  - [x] Models: Instrument, InstrumentSection, Indicator
  - [x] Models: EvaluationSession, EvaluationResponse
  - [x] Models: OKRObjective, OKRKeyResult, OKRAction
  - [x] Models: Evidence, DashboardConfig
  - [x] Enums: RoleType, InstrumentType, ScaleType, EvaluationStatus, Quarter, ActionStatus, OKRStatus
- [x] เพิ่ม Multi-network/Cluster Support (SchoolNetwork, SchoolNetworkMember)
- [x] เพิ่ม Action Plan Fields ใน OKRAction
- [x] สร้าง Indexes สำหรับ Performance

### 1.2 Seed Data
- [ ] สร้าง `prisma/seed.ts`
  - [ ] Seed Roles (ADMIN, SCHOOL_LEADER, TEACHER, SUPERVISOR)
  - [ ] Seed Users (admin, leader, teacher)
  - [ ] Seed Schools (1–2 โรงเรียน)
  - [ ] Seed SchoolNetworks (1–2 เครือข่าย)
  - [ ] Seed AcademicYears & Terms
  - [ ] Seed Instruments (DERS, THAI_P1_3, Q_MODEL)
  - [ ] Seed InstrumentSections และ Indicators (จากข้อมูลจริง)
  - [ ] Seed Sample EvaluationSessions & Responses
  - [ ] Seed Sample OKRObjectives, KRs, Actions

### 1.3 Database Migration
- [ ] รัน `prisma migrate dev` เพื่อสร้างตาราง
- [ ] รัน `prisma generate` เพื่อสร้าง Prisma Client
- [ ] รัน `prisma db seed` เพื่อใส่ข้อมูลเริ่มต้น
- [ ] ทดสอบ Query ข้อมูลพื้นฐาน

---

## Phase 2: Backend API (Weeks 3–5)

### 2.1 Setup Project Structure
- [ ] สร้าง Next.js Project (หรือ NestJS)
- [ ] ติดตั้ง Dependencies (Prisma, TypeScript, etc.)
- [ ] สร้าง Folder Structure
  - [ ] `lib/prisma.ts` - Prisma Client Singleton
  - [ ] `types/` - TypeScript Types
  - [ ] `utils/` - Utility Functions

### 2.2 Authentication & Authorization (Stub)
- [ ] สร้าง Mock Auth (return currentUser = admin)
- [ ] ออกแบบ JWT/Session Structure (สำหรับอนาคต)
- [ ] สร้าง Middleware สำหรับ Role-based Access

### 2.3 API Routes: Instruments & Indicators
- [ ] `GET /api/instruments` - List all instruments
- [ ] `GET /api/instruments/:id` - Get instrument details
- [ ] `GET /api/instruments/:id/sections` - Get sections
- [ ] `GET /api/instruments/:id/indicators` - Get indicators
- [ ] `POST /api/instruments` - Create instrument (admin only)
- [ ] `PATCH /api/instruments/:id` - Update instrument
- [ ] `GET /api/indicators/:id` - Get indicator details

### 2.4 API Routes: Evaluations
- [ ] `GET /api/evaluations` - List evaluations (with filters)
  - Filters: instrumentId?, schoolId?, year?, term?, status?
- [ ] `GET /api/evaluations/:id` - Get evaluation details
- [ ] `POST /api/evaluations` - Create evaluation session
- [ ] `PATCH /api/evaluations/:id` - Update evaluation (status, note)
- [ ] `POST /api/evaluations/:id/responses` - Save responses (batch)
- [ ] `PATCH /api/evaluations/:id/responses/:responseId` - Update single response
- [ ] `DELETE /api/evaluations/:id` - Delete evaluation

### 2.5 API Routes: OKRs
- [ ] `GET /api/okrs/objectives` - List objectives (with filters)
- [ ] `GET /api/okrs/objectives/:id` - Get objective details
- [ ] `POST /api/okrs/objectives` - Create objective
- [ ] `PATCH /api/okrs/objectives/:id` - Update objective
- [ ] `DELETE /api/okrs/objectives/:id` - Delete objective
- [ ] `GET /api/okrs/objectives/:id/key-results` - Get KRs
- [ ] `POST /api/okrs/objectives/:id/key-results` - Create KR
- [ ] `PATCH /api/okrs/key-results/:id` - Update KR
- [ ] `POST /api/okrs/key-results/:id/actions` - Create action
- [ ] `PATCH /api/okrs/actions/:id` - Update action
- [ ] `POST /api/okrs/key-results/:id/indicators` - Link indicator to KR
- [ ] `DELETE /api/okrs/key-results/:id/indicators/:indicatorId` - Unlink indicator

### 2.6 API Routes: Dashboard & Aggregation
- [ ] `GET /api/dashboard/summary` - Overall summary (KPI cards)
  - Query: schoolId, networkId?, academicYearId, termId?
  - Returns: completion rate, overall quality index, etc.
- [ ] `GET /api/dashboard/q-model` - Q-Model progress by dimension
  - Returns: dimensionProgress[] (dimension, current, target)
- [ ] `GET /api/dashboard/instrument/:instrumentId` - Instrument summary
  - Returns: average scores by section & indicator
- [ ] `GET /api/dashboard/okr-progress` - OKR progress
  - Returns: objectives with KR progress
- [ ] `GET /api/dashboard/kr/:id/detail` - KR indicator map
  - Returns: linked indicators with current values
- [ ] `GET /api/dashboard/comparison` - Compare schools/networks
  - Query: type (school|network), ids[], academicYearId, termId?
  - Returns: comparison data for charts

### 2.7 RBM Calculation Logic
- [ ] สร้าง Service: `calculateIndicatorPercent(indicatorId, filters)`
  - Normalize indicator scores to 0–100%
- [ ] สร้าง Service: `calculateKRCurrent(keyResultId, filters)`
  - Weighted average of linked indicators
- [ ] สร้าง Service: `calculateKRProgress(keyResultId)`
  - Progress % = (current - baseline) / (target - baseline) * 100
- [ ] สร้าง Service: `calculateObjectiveProgress(objectiveId)`
  - Average of KR progress values
- [ ] สร้าง Service: `updateKRCurrentValues()` - Batch update

### 2.8 Evidence Management
- [ ] `POST /api/evidence` - Upload evidence (file upload)
- [ ] `GET /api/evidence/:id` - Get evidence details
- [ ] `DELETE /api/evidence/:id` - Delete evidence
- [ ] Integration with File Storage (Local หรือ S3)

---

## Phase 3: Frontend Pages (Weeks 6–8)

### 3.1 Layout & Navigation
- [ ] สร้าง `app/layout.tsx` - Root layout (Kanit font, sidebar)
- [ ] สร้าง `components/Layout.tsx` - Main layout component
- [ ] สร้าง Navigation Bar (Dashboard, Evaluations, Instruments, OKRs, Reports)
- [ ] สร้าง Footer

### 3.2 Dashboard Page (`/dashboard`)
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
  - [ ] Bar Chart: Q-Model Progress by Dimension
  - [ ] Radar Chart: Q-Model Target vs Current
  - [ ] Line Chart: Trend over Time
- [ ] Table: Low-Scoring Indicators
- [ ] Recent Evaluations List

### 3.3 Instruments Pages
- [ ] `/instruments` - List instruments (table)
- [ ] `/instruments/[id]` - Instrument details
  - [ ] Tabs: Sections, Indicators
  - [ ] Table of indicators with scale info

### 3.4 Evaluations Pages
- [ ] `/evaluations` - List evaluations
  - [ ] Filter bar
  - [ ] Table with status, date, instrument
  - [ ] Actions: View, Edit, Delete
- [ ] `/evaluations/new` - Create evaluation wizard
  - [ ] Step 1: Select instrument
  - [ ] Step 2: Select school/target
  - [ ] Step 3: Select year/term
  - [ ] Submit to create session
- [ ] `/evaluations/[id]` - Evaluation form
  - [ ] Display sections as tabs/accordion
  - [ ] Render indicators with Likert inputs
  - [ ] Comment box per indicator
  - [ ] Evidence upload section
  - [ ] Save Draft / Submit buttons

### 3.5 OKRs Pages
- [ ] `/okrs` - List objectives
  - [ ] Filter bar (school, network, year, quarter, dimension)
  - [ ] Table/List with progress bars
  - [ ] Status colors (Green/Yellow/Red)
- [ ] `/okrs/[id]` - Objective details
  - [ ] Objective header (title, owner, dimension, status)
  - [ ] List of KRs
    - [ ] Progress bar (baseline → current → target)
    - [ ] Status color
    - [ ] Linked indicators badges
    - [ ] Expandable: Actions & Evidence
  - [ ] Add KR / Action buttons

### 3.6 Reports Pages
- [ ] `/reports` - Reports hub
  - [ ] Tabs: Q-Model, DERS, Thai P.1–3, OKR Progress
  - [ ] Charts per tab
  - [ ] Export buttons (CSV/PDF - future)

### 3.7 Comparison Views
- [ ] `/dashboard/comparison` - Comparison page
  - [ ] Select comparison type (school vs school, network vs network, same school across years)
  - [ ] Side-by-side charts
  - [ ] Difference highlights

---

## Phase 4: Multi-level Aggregation & Network Support (Weeks 9–10)

### 4.1 Network/Cluster Features
- [ ] API: `GET /api/networks` - List networks
- [ ] API: `GET /api/networks/:id` - Network details
- [ ] API: `GET /api/networks/:id/schools` - Schools in network
- [ ] API: `GET /api/networks/:id/aggregate` - Network-level aggregation
- [ ] Frontend: Network selector in Dashboard
- [ ] Frontend: Network comparison view

### 4.2 Aggregation Logic
- [ ] Service: Aggregate school-level data → network-level
- [ ] Service: Aggregate network-level data → system-level
- [ ] API: Support aggregation level in query params
  - `level=school|network|system`
- [ ] Dashboard: Show aggregation level in filters

### 4.3 Longitudinal Tracking
- [ ] API: Support multi-year queries
- [ ] Frontend: Trend charts (line charts over time)
- [ ] Frontend: Year-over-year comparison

---

## Phase 5: UI/UX Refinement & Mobile Responsiveness (Weeks 11–12)

### 5.1 Mobile Optimization
- [ ] Responsive design for all pages
- [ ] Touch-friendly inputs
- [ ] Mobile navigation (hamburger menu)
- [ ] Optimize charts for mobile

### 5.2 Thai Language Support
- [ ] ตรวจสอบข้อความไทยทั้งหมด
- [ ] ใช้ Kanit font อย่างสม่ำเสมอ
- [ ] ข้อความที่เป็นมิตรกับครู (ไม่ใช้ศัพท์เทคนิคมากเกินไป)

### 5.3 User Experience
- [ ] Loading states
- [ ] Error handling & user-friendly messages
- [ ] Success notifications
- [ ] Form validation (client-side)
- [ ] Confirmation dialogs for destructive actions

---

## Phase 6: Testing & Documentation (Weeks 13–14)

### 6.1 Testing
- [ ] Unit tests for RBM calculation logic
- [ ] Integration tests for API routes
- [ ] E2E tests for critical workflows (create evaluation, view dashboard)
- [ ] Performance testing (query optimization)

### 6.2 Documentation
- [ ] API Documentation (Swagger/OpenAPI)
- [ ] User Manual (สำหรับครู, ผอ.)
- [ ] Developer Guide
- [ ] Deployment Guide

### 6.3 Code Quality
- [ ] ESLint & Prettier configuration
- [ ] Code review
- [ ] Refactoring (ลด code duplication)

---

## Phase 7: Deployment & Launch (Week 15+)

### 7.1 Production Setup
- [ ] Production database setup (MySQL)
- [ ] Environment variables configuration
- [ ] File storage setup (S3 หรือ Local)
- [ ] SSL Certificate
- [ ] Domain configuration

### 7.2 Deployment
- [ ] Deploy Next.js app (Vercel, AWS, หรือ Self-hosted)
- [ ] Database migration (production)
- [ ] Seed production data (instruments, indicators)
- [ ] Smoke testing

### 7.3 Launch
- [ ] User training (ครู, ผอ.)
- [ ] Support & monitoring setup
- [ ] Bug fixes (hotfixes)

---

## Phase 8: Future Enhancements (Post-Launch)

### 8.1 Advanced Features
- [ ] Real authentication (JWT/Session)
- [ ] Email notifications
- [ ] PDF/Excel export
- [ ] Advanced analytics (predictive, trends)
- [ ] Mobile app (PWA หรือ React Native)

### 8.2 Integrations
- [ ] Integration with LMS
- [ ] Integration with SIS
- [ ] API for third-party tools

### 8.3 New Instruments
- [ ] Additional subject-specific instruments
- [ ] Student assessment instruments
- [ ] Custom instruments (admin-defined)

---

## Success Criteria

### Must Have (MVP)
- ✅ Database schema with multi-school, multi-network, multi-year support
- [ ] 3 instruments (DERS, THAI_P1_3, Q_MODEL) seeded
- [ ] Basic evaluation workflow (create, fill, submit)
- [ ] Dashboard with KPI cards and charts
- [ ] OKR management (create objective, KR, actions)
- [ ] RBM calculation (indicator → KR → Objective)
- [ ] Multi-level aggregation (school → network → system)

### Should Have
- [ ] Comparison views (school vs school, network vs network)
- [ ] Evidence upload
- [ ] Mobile responsive
- [ ] Export reports (CSV/PDF)

### Nice to Have
- [ ] Real authentication
- [ ] Email notifications
- [ ] Advanced analytics
- [ ] Mobile app

---

## Risks & Mitigation

### Risk 1: Performance issues with aggregation
- **Mitigation**: Use database indexes, caching, pagination

### Risk 2: Complex RBM calculation logic
- **Mitigation**: Start with simple formulas, iterate based on feedback

### Risk 3: User adoption (teachers may not use)
- **Mitigation**: Simple UI, mobile-friendly, training sessions

### Risk 4: Data migration issues
- **Mitigation**: Test migrations thoroughly, keep backups

---

**อัปเดตล่าสุด**: วันที่เริ่มโครงการ  
**สถานะ**: Phase 1 กำลังดำเนินการ  
**Next Steps**: สร้าง seed data และเริ่มทำ Backend API

