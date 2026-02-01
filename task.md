# Task List - รายการงาน
## EduQuality Assessment Platform (EQAP)

---

## 📋 Phase 1: Database + Auth Setup

### Database Setup
- [x] Create Prisma schema (prisma/schema.prisma)
- [x] Create seed data (prisma/seed.ts)
- [ ] Setup Next.js 15 project structure
- [ ] Setup TypeScript configuration (tsconfig.json)
- [ ] Setup Tailwind CSS (tailwind.config.js, postcss.config.js)
- [ ] Setup Prisma Client (lib/prisma.ts)
- [ ] Create .env file from .env.example
- [ ] Run Prisma migrations (`npx prisma migrate dev`)
- [ ] Run seed script (`npx prisma db seed`)

### Authentication Module
- [ ] Create Auth API routes
  - [ ] POST /api/auth/login
  - [ ] POST /api/auth/signup
  - [ ] POST /api/auth/logout
  - [ ] POST /api/auth/refresh
  - [ ] GET /api/auth/me
- [ ] Create JWT utility functions (lib/auth.ts)
- [ ] Create Login page (app/(auth)/login/page.tsx)
- [ ] Create Signup page (app/(auth)/signup/page.tsx)
- [ ] Create Forgot Password page (app/(auth)/forgot-password/page.tsx)
- [ ] Create Auth components
  - [ ] LoginForm component
  - [ ] SignupForm component
  - [ ] ForgotPasswordForm component
- [ ] Create Middleware (app/middleware.ts) สำหรับ auth check
- [ ] Create useAuth hook (app/hooks/useAuth.ts)
- [ ] Test authentication flow

---

## 📝 Phase 2: Assessment Form Module

### Assessment API
- [ ] GET /api/assessments (list assessments)
- [ ] POST /api/assessments (create new assessment)
- [ ] GET /api/assessments/[id] (get assessment detail)
- [ ] PUT /api/assessments/[id] (update assessment)
- [ ] DELETE /api/assessments/[id] (delete assessment)
- [ ] POST /api/assessments/[id]/submit (submit assessment)
- [ ] POST /api/assessments/auto-save (auto-save responses)

### Assessment UI
- [ ] Assessment list page (app/(assessment)/assessment/page.tsx)
- [ ] Assessment form page (app/(assessment)/assessment/[assessmentId]/page.tsx)
- [ ] Create new assessment page (app/(assessment)/assessment/new/page.tsx)
- [ ] Review page (app/(assessment)/assessment/[assessmentId]/review/page.tsx)

### Assessment Components
- [ ] AssessmentForm component
- [ ] IndicatorCard component
- [ ] RadioGroup component (1-5)
- [ ] ProgressBar component
- [ ] EvidenceUpload component
- [ ] NoteInput component

### Auto-save
- [ ] Create useAutoSave hook (app/hooks/useAutoSave.ts)
- [ ] Implement auto-save logic (every 30 seconds)
- [ ] Implement resume functionality
- [ ] Show auto-save status indicator

### Evidence Upload
- [ ] POST /api/evidence/upload
- [ ] GET /api/evidence/[id]
- [ ] DELETE /api/evidence/[id]
- [ ] GET /api/evidence/[id]/download
- [ ] Evidence viewer page (app/(assessment)/evidence/[evidenceId]/page.tsx)
- [ ] File validation (type, size)
- [ ] File storage setup

---

## 📊 Phase 3: Dashboard Module

### Dashboard API
- [ ] GET /api/dashboard/summary
- [ ] GET /api/dashboard/radar
- [ ] GET /api/dashboard/comparison

### Dashboard UI
- [ ] Dashboard main page (app/(dashboard)/dashboard/page.tsx)
- [ ] School detail dashboard (app/(dashboard)/dashboard/[schoolId]/page.tsx)
- [ ] Reports list page (app/(dashboard)/reports/page.tsx)
- [ ] Report detail page (app/(dashboard)/reports/[reportId]/page.tsx)
- [ ] Comparison page (app/(dashboard)/comparison/page.tsx)

### Dashboard Components
- [ ] RadarChart component (using Recharts)
- [ ] SummaryCard component
- [ ] ComparisonChart component
- [ ] FilterBar component

### Features
- [ ] Filter by office, network, school, year
- [ ] Calculate average scores per domain
- [ ] Display Radar/Spider Graph (4 domains)
- [ ] Multi-year comparison
- [ ] Export to Excel/PDF

---

## ⚙️ Phase 4: Admin Module

### Admin API
- [ ] Offices CRUD API
- [ ] Networks CRUD API
- [ ] Schools CRUD API
- [ ] Users CRUD API
- [ ] Indicators CRUD API
- [ ] Academic Years CRUD API

### Admin UI
- [ ] Admin dashboard (app/(admin)/admin/page.tsx)
- [ ] Offices management (app/(admin)/admin/offices/page.tsx)
- [ ] Networks management (app/(admin)/admin/networks/page.tsx)
- [ ] Schools management (app/(admin)/admin/schools/page.tsx)
- [ ] Users management (app/(admin)/admin/users/page.tsx)
- [ ] Indicators management (app/(admin)/admin/indicators/page.tsx)
- [ ] Academic Years management (app/(admin)/admin/academic-years/page.tsx)
- [ ] Settings page (app/(admin)/admin/settings/page.tsx)

### Admin Components
- [ ] OfficeForm component
- [ ] NetworkForm component
- [ ] SchoolForm component
- [ ] UserForm component
- [ ] IndicatorForm component
- [ ] AcademicYearForm component

### Role-based Access
- [ ] Check permissions middleware
- [ ] Hide/show features based on role
- [ ] Unauthorized page component

---

## 🚀 Phase 5: Optimization + Export

### Performance
- [ ] Code splitting
- [ ] Image optimization
- [ ] Database query optimization
- [ ] Caching strategy
- [ ] Lazy loading

### Export
- [ ] Export to Excel API
- [ ] Export to PDF API
- [ ] Export UI components
- [ ] Export reports

### Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Bug fixes

### Documentation
- [ ] API documentation
- [ ] User manual
- [ ] Developer guide
- [ ] Deployment guide

---

## 🎯 Current Focus

**Phase:** Phase 1 - Database + Auth Setup  
**Current Task:** Setup Next.js project structure  
**Next Task:** Setup TypeScript and Tailwind CSS

---

## 📝 Notes

- ✅ = Completed
- [ ] = Pending
- 🟡 = In Progress

## ✅ ล่าสุดที่แก้ไข (2026-02-01)
- แก้ login loop ใน Docker/HTTP โดยปรับ cookie `accessToken` ให้ตั้งค่า `secure` ตาม protocol จริง

**Last Updated:** 2026-01-25

---

## 🔄 Continuity Instructions

เมื่อ Cursor AI หยุด/รีสตาร์ท:

1. อ่าน `context.md` เพื่อดูสถานะปัจจุบัน
2. อ่าน `plan.md` เพื่อดูแผนการพัฒนา
3. อ่าน `task.md` (ไฟล์นี้) เพื่อดู task ที่ต้องทำต่อ
4. ทำงานต่อจาก task ที่ค้างไว้

**สำคัญ:** 
- อย่าลบไฟล์ที่มีอยู่แล้ว
- ทำงานต่อจากที่ค้างไว้
- อัปเดต task.md เมื่อทำงานเสร็จ
