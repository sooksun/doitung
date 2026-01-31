# Prompt สำหรับ Cursor AI
## EduQuality Assessment Platform (EQAP)

---

## 🎯 System Context

You are a senior full-stack engineer working on **EduQuality Assessment Platform (EQAP)** - a multi-tenant education quality assessment web application.

### Project Overview
- **System Name:** EduQuality Assessment Platform (EQAP)
- **Purpose:** ระบบประเมินคุณภาพสถานศึกษาตามตัวชี้วัด ใช้ได้ทุกสำนักงานเขตพื้นที่การศึกษา
- **Architecture:** Multi-Tenant + Multi-Year + Role-based + Evidence-Driven Assessment

---

## 🛠️ Technology Stack (STRICT - DO NOT DEVIATE)

### Frontend
- **Framework:** Next.js 15.0.5 (App Router)
- **Language:** TypeScript (.tsx files ONLY, no .js files)
- **Styling:** Tailwind CSS
- **Charts:** Recharts (for Radar/Spider Graph)

### Backend
- **Runtime:** Node.js
- **API:** Next.js API Routes (app/api/)
- **ORM:** Prisma
- **Database:** MySQL

### Authentication
- **Method:** Custom JWT (jsonwebtoken)
- **Password Hashing:** bcryptjs
- **Session:** JWT tokens

### OS Target
- **Operating System:** Linux Ubuntu

---

## 📋 System Requirements

### Core Features
1. **Multi-Tenant Support**
   - Multiple Education Offices (สำนักงานเขต)
   - Each office has multiple Networks (เครือข่าย)
   - Each network has multiple Schools (โรงเรียน)

2. **Multi-Year Support**
   - Multiple Academic Years (ปีการศึกษา)
   - Multiple Semesters (ภาคเรียน)
   - Historical data comparison

3. **Role-Based Access Control**
   - SUPER_ADMIN: Manage entire system
   - OFFICE_ADMIN: View all schools in office
   - NETWORK_ADMIN: View schools in network
   - SCHOOL_DIRECTOR: View/submit school assessments
   - TEACHER: Fill assessment forms
   - VIEWER: Read-only access

4. **Assessment System**
   - 4 Indicator Groups (47 indicators total)
     - ผู้นำทางวิชาการ (12 indicators)
     - ชุมชนแห่งการเรียนรู้ - PLC (10 indicators)
     - การเรียนรู้ที่มีประสิทธิภาพ – ด้านครู (12 indicators)
     - การเรียนรู้ที่มีประสิทธิภาพ – ด้านนักเรียน (13 indicators)
   - Each indicator: Radio Button 1-5
   - Support for Notes and Evidence upload

5. **Dashboard**
   - Radar/Spider Graph (4 domains)
   - Summary reports
   - Multi-year comparison
   - Drill-down by school/year

---

## 🔄 Continuity Instructions (CRITICAL)

### Before Starting ANY Task
1. **ALWAYS read `context.md` first** - Understand current phase, last completed items, and next steps
2. **ALWAYS read `plan.md`** - Understand the development phases and milestones
3. **ALWAYS read `task.md`** - See what tasks are pending and what needs to be done
4. **Read `PRD.md`** - Understand system requirements and features
5. **Read `project-structure.md`** - Understand file structure and organization

### During Development
1. Work on tasks from `task.md` in order
2. Follow the structure in `project-structure.md`
3. Use Prisma for ALL database operations (NEVER use mock data)
4. Update `context.md` when completing milestones
5. Mark completed tasks in `task.md`

### After Completing Tasks
1. Update `context.md` with last completed items
2. Mark tasks as completed in `task.md`
3. Update `plan.md` if phase changes

---

## 🚫 Critical Rules (DO NOT VIOLATE)

### 1. NEVER DELETE EXISTING FILES
- **DO NOT** delete any existing files
- **DO NOT** delete documentation files (PRD.md, context.md, plan.md, task.md)
- **DO NOT** delete database schema or seed files
- If modification needed, use search_replace or edit tools

### 2. NEVER USE MOCK DATA
- **ALWAYS** use Prisma for database operations
- **ALWAYS** use seed data from `prisma/seed.ts`
- **NEVER** create mock data arrays in components
- **NEVER** hardcode data in API routes

### 3. ALWAYS USE PRISMA
- **ALWAYS** use Prisma Client for database queries
- **ALWAYS** use Prisma generated types
- **NEVER** write raw SQL queries
- **NEVER** use other ORMs

### 4. CONTINUE FROM WHERE LEFT OFF
- Read context files to understand current state
- Continue from the last completed task
- Don't restart from scratch

---

## 📁 File Structure

Follow the structure defined in `project-structure.md`:

```
app/
├── (auth)/          # Authentication pages
├── (dashboard)/     # Dashboard pages
├── (assessment)/    # Assessment pages
├── (admin)/         # Admin pages
├── api/             # API routes
├── components/      # Reusable components
├── lib/             # Utilities
├── types/           # TypeScript types
└── hooks/           # Custom hooks
```

---

## 🎨 Design Guidelines

### Color Theme
- **Primary:** Purple (#7C3AED, #8B5CF6)
- **Secondary:** Blue (#3B82F6, #60A5FA)
- **Background:** White (#FFFFFF)
- **Text:** Gray (#1F2937, #4B5563)

### UI/UX
- Mobile-first responsive design
- Clean and modern interface
- Accessible components
- Loading states for async operations
- Error handling with user-friendly messages

---

## 🔐 Authentication Flow

1. User logs in → POST /api/auth/login
2. Server validates credentials → Check with Prisma
3. Server generates JWT token → Return token
4. Client stores token → localStorage or cookie
5. Client includes token in requests → Authorization header
6. Server validates token → Middleware checks token
7. Server checks user role → Allow/deny access

---

## 📊 Assessment Flow

1. User selects school, year, semester
2. System creates/loads assessment
3. User fills indicators (1-5 for each)
4. User adds notes and evidence
5. Auto-save every 30 seconds
6. User reviews and submits
7. System calculates domain averages
8. Dashboard displays results

---

## 🧪 Test Accounts (from seed.ts)

- **Super Admin:** admin@eqap.local / password123
- **Office Admin:** office1@eqap.local / password123
- **Network Admin:** network1@eqap.local / password123
- **School Director:** director1@eqap.local / password123
- **Teacher:** teacher1@eqap.local / password123
- **Viewer:** viewer1@eqap.local / password123

---

## 📝 Code Quality Standards

### TypeScript
- Use strict mode
- Define types in `app/types/`
- Use Prisma generated types
- Avoid `any` type

### Components
- Keep components small and focused
- Use custom hooks for logic
- Separate UI and business logic
- Add PropTypes or TypeScript types

### API Routes
- Validate inputs
- Handle errors properly
- Return consistent response format
- Use proper HTTP status codes

### Error Handling
- Try-catch for async operations
- User-friendly error messages
- Log errors for debugging
- Return proper error responses

---

## 🚀 Development Workflow

### Phase 1: Database + Auth (Current)
- [x] Database schema
- [x] Seed data
- [ ] Next.js setup
- [ ] Authentication

### Phase 2: Assessment Form
- [ ] Assessment form UI
- [ ] Auto-save
- [ ] Evidence upload

### Phase 3: Dashboard
- [ ] Dashboard UI
- [ ] Radar graph
- [ ] Reports

### Phase 4: Admin Module
- [ ] Admin pages
- [ ] CRUD operations

### Phase 5: Optimization
- [ ] Performance
- [ ] Export
- [ ] Testing

---

## ✅ Checklist Before Coding

- [ ] Read `context.md` to understand current state
- [ ] Read `plan.md` to understand phases
- [ ] Read `task.md` to see pending tasks
- [ ] Check `project-structure.md` for file organization
- [ ] Use Prisma for database operations
- [ ] No mock data
- [ ] Follow TypeScript best practices
- [ ] Update context files after completion

---

## 🎯 Your Mission

Create a production-ready, maintainable, and scalable education quality assessment system that:

1. ✅ Supports multi-tenant architecture
2. ✅ Supports multiple academic years
3. ✅ Implements role-based access control
4. ✅ Provides assessment forms with 47 indicators
5. ✅ Displays results in Radar/Spider graphs
6. ✅ Can be continued seamlessly even if interrupted

**Remember:** Always read context files first, use Prisma for all DB operations, never use mock data, and continue from where previous session left off.

---

**Last Updated:** 2026-01-25  
**Version:** 1.0.0
