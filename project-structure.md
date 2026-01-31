# โครงสร้างโปรเจค (Project Structure)
## EduQuality Assessment Platform (EQAP)

---

## 📁 โครงสร้างไฟล์ทั้งหมด

```
evalTeacher/
├── .env                          # Environment variables (ไม่ commit)
├── .env.example                  # Template สำหรับ environment variables
├── .cursorrules                  # กฎสำหรับ Cursor AI
├── .gitignore                    # Git ignore rules
├── package.json                  # Dependencies และ scripts
├── tsconfig.json                 # TypeScript configuration
├── next.config.js                # Next.js configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── postcss.config.js             # PostCSS configuration
│
├── PRD.md                        # Product Requirement Document
├── project-structure.md          # ไฟล์นี้
├── context.md                    # สถานะปัจจุบันของระบบ
├── plan.md                       # แผนการพัฒนาแบบ Phase-by-Phase
├── task.md                       # Task list แบบ Checklist
├── CURSOR_PROMPT.md             # Prompt สำหรับ Cursor AI
├── README.md                     # คู่มือการใช้งานโปรเจค
│
├── prisma/
│   ├── schema.prisma            # Database schema
│   ├── seed.ts                  # Seed data สำหรับ development
│   └── migrations/              # Prisma migrations (auto-generated)
│
├── app/                          # Next.js 15 App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   ├── globals.css              # Global styles
│   │
│   ├── (auth)/                  # Auth group (ไม่ต้องมี layout)
│   │   ├── login/
│   │   │   └── page.tsx         # Login page
│   │   ├── signup/
│   │   │   └── page.tsx         # Signup page
│   │   └── forgot-password/
│   │       └── page.tsx         # Forgot password page
│   │
│   ├── (dashboard)/             # Dashboard group
│   │   ├── layout.tsx           # Dashboard layout (sidebar, header)
│   │   ├── dashboard/
│   │   │   ├── page.tsx         # Dashboard main page
│   │   │   └── [schoolId]/
│   │   │       └── page.tsx     # School detail dashboard
│   │   ├── reports/
│   │   │   ├── page.tsx         # Reports list
│   │   │   └── [reportId]/
│   │   │       └── page.tsx     # Report detail
│   │   └── comparison/
│   │       └── page.tsx         # Multi-year comparison
│   │
│   ├── (assessment)/             # Assessment group
│   │   ├── layout.tsx           # Assessment layout
│   │   ├── assessment/
│   │   │   ├── page.tsx         # Assessment list
│   │   │   ├── [assessmentId]/
│   │   │   │   ├── page.tsx     # Assessment form
│   │   │   │   └── review/
│   │   │   │       └── page.tsx # Review before submit
│   │   │   └── new/
│   │   │       └── page.tsx     # Create new assessment
│   │   └── evidence/
│   │       └── [evidenceId]/
│   │           └── page.tsx     # Evidence viewer
│   │
│   ├── (admin)/                  # Admin group
│   │   ├── layout.tsx           # Admin layout
│   │   ├── admin/
│   │   │   ├── page.tsx         # Admin dashboard
│   │   │   ├── offices/
│   │   │   │   ├── page.tsx     # Education offices list
│   │   │   │   ├── [officeId]/
│   │   │   │   │   └── page.tsx # Office detail/edit
│   │   │   │   └── new/
│   │   │   │       └── page.tsx # Create new office
│   │   │   ├── networks/
│   │   │   │   ├── page.tsx     # Networks list
│   │   │   │   ├── [networkId]/
│   │   │   │   │   └── page.tsx # Network detail/edit
│   │   │   │   └── new/
│   │   │   │       └── page.tsx # Create new network
│   │   │   ├── schools/
│   │   │   │   ├── page.tsx     # Schools list
│   │   │   │   ├── [schoolId]/
│   │   │   │   │   └── page.tsx # School detail/edit
│   │   │   │   └── new/
│   │   │   │       └── page.tsx # Create new school
│   │   │   ├── users/
│   │   │   │   ├── page.tsx     # Users list
│   │   │   │   ├── [userId]/
│   │   │   │   │   └── page.tsx # User detail/edit
│   │   │   │   └── new/
│   │   │   │       └── page.tsx # Create new user
│   │   │   ├── indicators/
│   │   │   │   ├── page.tsx     # Indicators list
│   │   │   │   ├── [indicatorId]/
│   │   │   │   │   └── page.tsx # Indicator detail/edit
│   │   │   │   └── new/
│   │   │   │       └── page.tsx # Create new indicator
│   │   │   └── academic-years/
│   │   │       ├── page.tsx     # Academic years list
│   │   │       ├── [yearId]/
│   │   │       │   └── page.tsx # Academic year detail/edit
│   │   │       └── new/
│   │   │           └── page.tsx # Create new academic year
│   │   └── settings/
│   │       └── page.tsx         # System settings
│   │
│   ├── api/                      # API Routes
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── route.ts     # POST /api/auth/login
│   │   │   ├── signup/
│   │   │   │   └── route.ts     # POST /api/auth/signup
│   │   │   ├── logout/
│   │   │   │   └── route.ts     # POST /api/auth/logout
│   │   │   ├── refresh/
│   │   │   │   └── route.ts     # POST /api/auth/refresh
│   │   │   └── me/
│   │   │       └── route.ts     # GET /api/auth/me
│   │   │
│   │   ├── offices/
│   │   │   ├── route.ts         # GET, POST /api/offices
│   │   │   └── [officeId]/
│   │   │       └── route.ts     # GET, PUT, DELETE /api/offices/[officeId]
│   │   │
│   │   ├── networks/
│   │   │   ├── route.ts         # GET, POST /api/networks
│   │   │   └── [networkId]/
│   │   │       └── route.ts     # GET, PUT, DELETE /api/networks/[networkId]
│   │   │
│   │   ├── schools/
│   │   │   ├── route.ts         # GET, POST /api/schools
│   │   │   └── [schoolId]/
│   │   │       └── route.ts     # GET, PUT, DELETE /api/schools/[schoolId]
│   │   │
│   │   ├── users/
│   │   │   ├── route.ts         # GET, POST /api/users
│   │   │   └── [userId]/
│   │   │       └── route.ts     # GET, PUT, DELETE /api/users/[userId]
│   │   │
│   │   ├── indicators/
│   │   │   ├── route.ts         # GET, POST /api/indicators
│   │   │   └── [indicatorId]/
│   │   │       └── route.ts     # GET, PUT, DELETE /api/indicators/[indicatorId]
│   │   │
│   │   ├── assessments/
│   │   │   ├── route.ts         # GET, POST /api/assessments
│   │   │   ├── [assessmentId]/
│   │   │   │   ├── route.ts     # GET, PUT, DELETE /api/assessments/[assessmentId]
│   │   │   │   ├── responses/
│   │   │   │   │   └── route.ts # GET, POST /api/assessments/[assessmentId]/responses
│   │   │   │   └── submit/
│   │   │   │       └── route.ts # POST /api/assessments/[assessmentId]/submit
│   │   │   └── auto-save/
│   │   │       └── route.ts     # POST /api/assessments/auto-save
│   │   │
│   │   ├── dashboard/
│   │   │   ├── summary/
│   │   │   │   └── route.ts     # GET /api/dashboard/summary
│   │   │   ├── radar/
│   │   │   │   └── route.ts     # GET /api/dashboard/radar
│   │   │   └── comparison/
│   │   │       └── route.ts     # GET /api/dashboard/comparison
│   │   │
│   │   ├── evidence/
│   │   │   ├── upload/
│   │   │   │   └── route.ts     # POST /api/evidence/upload
│   │   │   └── [evidenceId]/
│   │   │       ├── route.ts     # GET, DELETE /api/evidence/[evidenceId]
│   │   │       └── download/
│   │   │           └── route.ts # GET /api/evidence/[evidenceId]/download
│   │   │
│   │   └── reports/
│   │       ├── route.ts         # GET, POST /api/reports
│   │       ├── [reportId]/
│   │       │   └── route.ts     # GET, DELETE /api/reports/[reportId]
│   │       └── export/
│   │           └── route.ts     # GET /api/reports/export
│   │
│   ├── components/               # Reusable components
│   │   ├── ui/                   # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Radio.tsx
│   │   │   ├── Checkbox.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Loading.tsx
│   │   │
│   │   ├── layout/               # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Breadcrumb.tsx
│   │   │
│   │   ├── auth/                 # Auth components
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   └── ForgotPasswordForm.tsx
│   │   │
│   │   ├── assessment/           # Assessment components
│   │   │   ├── AssessmentForm.tsx
│   │   │   ├── IndicatorCard.tsx
│   │   │   ├── RadioGroup.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── EvidenceUpload.tsx
│   │   │   └── NoteInput.tsx
│   │   │
│   │   ├── dashboard/            # Dashboard components
│   │   │   ├── RadarChart.tsx
│   │   │   ├── SummaryCard.tsx
│   │   │   ├── ComparisonChart.tsx
│   │   │   └── FilterBar.tsx
│   │   │
│   │   ├── admin/                # Admin components
│   │   │   ├── OfficeForm.tsx
│   │   │   ├── NetworkForm.tsx
│   │   │   ├── SchoolForm.tsx
│   │   │   ├── UserForm.tsx
│   │   │   └── IndicatorForm.tsx
│   │   │
│   │   └── common/               # Common components
│   │       ├── ErrorBoundary.tsx
│   │       ├── NotFound.tsx
│   │       └── Unauthorized.tsx
│   │
│   ├── lib/                      # Utility libraries
│   │   ├── prisma.ts            # Prisma client instance
│   │   ├── auth.ts              # Auth utilities (JWT)
│   │   ├── utils.ts             # General utilities
│   │   ├── validation.ts        # Form validation
│   │   └── constants.ts         # Constants
│   │
│   ├── types/                    # TypeScript types
│   │   ├── user.ts              # User types
│   │   ├── assessment.ts       # Assessment types
│   │   ├── dashboard.ts        # Dashboard types
│   │   └── api.ts              # API types
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.ts           # Auth hook
│   │   ├── useAssessment.ts    # Assessment hook
│   │   ├── useDashboard.ts     # Dashboard hook
│   │   └── useAutoSave.ts      # Auto-save hook
│   │
│   └── middleware.ts            # Next.js middleware (auth check)
│
├── public/                       # Static files
│   ├── images/                  # Images
│   ├── icons/                   # Icons
│   └── uploads/                 # Uploaded files (evidence)
│
└── doc/                          # Documentation
    └── item_evaluation.pdf      # เอกสารตัวชี้วัด
```

---

## 📋 รายละเอียดโครงสร้าง

### 1. Root Files
- **`.env`**: Environment variables (ไม่ commit ไป Git)
- **`.env.example`**: Template สำหรับ environment variables
- **`.cursorrules`**: กฎสำหรับ Cursor AI
- **`package.json`**: Dependencies และ scripts
- **`tsconfig.json`**: TypeScript configuration
- **`next.config.js`**: Next.js configuration

### 2. Documentation Files
- **`PRD.md`**: Product Requirement Document
- **`project-structure.md`**: ไฟล์นี้
- **`context.md`**: สถานะปัจจุบันของระบบ
- **`plan.md`**: แผนการพัฒนาแบบ Phase-by-Phase
- **`task.md`**: Task list แบบ Checklist
- **`CURSOR_PROMPT.md`**: Prompt สำหรับ Cursor AI
- **`README.md`**: คู่มือการใช้งานโปรเจค

### 3. Prisma Directory
- **`schema.prisma`**: Database schema definition
- **`seed.ts`**: Seed data สำหรับ development
- **`migrations/`**: Prisma migrations (auto-generated)

### 4. App Directory (Next.js 15 App Router)
- **`layout.tsx`**: Root layout
- **`page.tsx`**: Home page
- **`(auth)/`**: Auth group (login, signup, forgot password)
- **`(dashboard)/`**: Dashboard group (dashboard, reports, comparison)
- **`(assessment)/`**: Assessment group (assessment form, evidence)
- **`(admin)/`**: Admin group (management pages)
- **`api/`**: API routes
- **`components/`**: Reusable components
- **`lib/`**: Utility libraries
- **`types/`**: TypeScript types
- **`hooks/`**: Custom React hooks
- **`middleware.ts`**: Next.js middleware

### 5. Components Structure
- **`ui/`**: Base UI components (Button, Input, etc.)
- **`layout/`**: Layout components (Header, Sidebar, etc.)
- **`auth/`**: Auth components
- **`assessment/`**: Assessment components
- **`dashboard/`**: Dashboard components
- **`admin/`**: Admin components
- **`common/`**: Common components (ErrorBoundary, NotFound, etc.)

### 6. API Routes Structure
- **`auth/`**: Authentication endpoints
- **`offices/`**: Education office endpoints
- **`networks/`**: Network endpoints
- **`schools/`**: School endpoints
- **`users/`**: User endpoints
- **`indicators/`**: Indicator endpoints
- **`assessments/`**: Assessment endpoints
- **`dashboard/`**: Dashboard data endpoints
- **`evidence/`**: Evidence upload/download endpoints
- **`reports/`**: Report endpoints

### 7. Public Directory
- **`images/`**: Static images
- **`icons/`**: Icons
- **`uploads/`**: Uploaded files (evidence)

---

## 🔧 Technology Stack Files

### Configuration Files
- **`tsconfig.json`**: TypeScript configuration
- **`next.config.js`**: Next.js configuration
- **`tailwind.config.js`**: Tailwind CSS configuration
- **`postcss.config.js`**: PostCSS configuration

### Package Files
- **`package.json`**: Dependencies และ scripts
- **`package-lock.json`**: Lock file (auto-generated)

---

## 📝 Notes

1. **Route Groups**: ใช้ `(auth)`, `(dashboard)`, `(assessment)`, `(admin)` เป็น route groups เพื่อจัดกลุ่ม routes โดยไม่ส่งผลต่อ URL path

2. **API Routes**: ใช้ Next.js 15 App Router API routes (`app/api/`)

3. **Components**: แยก components ตาม feature เพื่อให้ง่ายต่อการจัดการ

4. **Types**: ใช้ TypeScript types แยกตาม domain

5. **Hooks**: ใช้ custom hooks สำหรับ logic ที่ใช้ซ้ำ

6. **Middleware**: ใช้ Next.js middleware สำหรับ authentication check

---

**Last Updated:** 2026-01-25
