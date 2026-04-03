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
  └── InstrumentSection
        └── Indicator (minScore, maxScore, levelDescriptors JSON)
```

### Evaluation Data
```
EvaluationSession (status: DRAFT → SUBMITTED → REVIEWED → ARCHIVED)
  └── EvaluationResponse
        ├── score  — สภาพที่เป็นอยู่ (Current State)
        └── score2 — เป้าหมายการพัฒนา (Desired State, Q-Model only)
```

### OKR / RBM
```
OKRObjective (dimension: Q-Leadership | Q-PLC | Q-Learning | Q-Goal | Q-Info | Q-Network)
  └── OKRKeyResult (baseline, target, current)
        ├── OKRKeyResultIndicator ─── Indicator (weighted link)
        └── OKRAction (targetDesiredState)
              └── OKRActionRating (currentState, evaluatedAt)
```

### Configuration
```
DashboardConfig (per-school JSON customization)
Evidence (attachments for EvaluationSession | OKRAction)
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

### OKRs
```
GET  /api/okrs/objectives                        — List
POST /api/okrs/objectives                        — Create
GET  /api/okrs/objectives/:id                    — Detail
POST /api/okrs/objectives/:id/key-results        — Create KR
GET  /api/okrs/objectives/:id/key-results        — List KRs
GET  /api/okrs/key-results/:id                   — KR detail
POST /api/okrs/key-results/:id/indicators        — Link indicators
GET  /api/okrs/key-results/:id/indicators        — Linked indicators
GET  /api/okrs/key-results/:id/actions           — Actions for KR
POST /api/okrs/actions/:id                       — Create/update action
GET  /api/okrs/actions/:id                       — Action detail
POST /api/okrs/actions/:id/ratings               — Create rating
GET  /api/okrs/actions/:id/ratings               — Ratings list
GET  /api/okrs/actions/:id/ratings/:rId          — Specific rating
GET  /api/indicators/:id/goal-progress           — Goal progress calc
```

### Dashboard
```
GET /api/dashboard/summary      — KPI cards (completion rate, quality index)
GET /api/dashboard/q-model      — Q-Model progress by dimension
GET /api/dashboard/okr-progress — OKR progress tracking
GET /api/dashboard/spider-graph — Spider chart data (current vs target)
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
```

---

## Core Calculation Logic (lib/rbm-calculator.ts)

### 1. Indicator Percentage
```
percent = ((avgScore - minScore) / (maxScore - minScore)) * 100
Clipped to [0, 100]
```

### 2. KR Current Value
```
current = SUM(weight_i * percent_i) / SUM(weight_i)
Weight defaults to 1.0 if not set
```

### 3. KR Progress
```
progress = ((current - baseline) / (target - baseline)) * 100
Clipped to [0, 120]
```

### 4. Traffic Light Status
```
Green  → progress >= 90%
Yellow → progress >= 70%
Red    → progress < 70%
```

### 5. Objective Progress
```
objectiveProgress = AVG(progress of all KRs)
```

### 6. Spider Graph Data (Q-Model)
- ดึง OKRObjective แต่ละ dimension
- หา OKRAction → OKRActionRating ล่าสุด
- AVG(currentState) per dimension = สภาพที่เป็นอยู่
- AVG(targetDesiredState) per dimension = เป้าหมายการพัฒนา
- Scale: 1-5

### 7. Q-Model Dimension Progress
- ดึง Q_MODEL instrument → sections → indicators
- Batch aggregate avgScore per indicator
- normalize ต่อ indicator → AVG per dimension = current
- Target มาจาก OKR Key Results

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

## Frontend Pages

| Route | Description |
|-------|-------------|
| `/` | Home with navigation cards |
| `/login` | JWT authentication |
| `/dashboard` | Main dashboard (KPIs, Spider chart, Q-Model) |
| `/live-dashboard` | **[ใหม่]** Real-time display screen for projector/TV |
| `/evaluations` | List evaluation sessions |
| `/evaluations/new` | Create new evaluation session |
| `/evaluations/:id` | Enter responses for session |
| `/instruments` | List assessment instruments |
| `/instruments/:id` | Instrument detail with sections/indicators |
| `/okrs` | OKR objectives list |
| `/okrs/new` | Create objective |
| `/okrs/:id` | Objective with key results |
| `/okrs/kr/:id` | Key result with actions |
| `/okrs/kr/:id/set-goal` | Set target values |
| `/okrs/actions/:id` | Action with rating history |
| `/reports` | Summary reports |

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
- Q-Model Dimensions: Q-Leadership, Q-PLC, Q-Learning, Q-Goal, Q-Info, Q-Network
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
Root PW:  rootpassword
DATABASE_URL: mysql://doitung_user:doitung_pass@eqap_db:3306/okrsdoitung
```

> **สำคัญ:** เชื่อมต่อ MariaDB ต้องใช้ `-h 127.0.0.1` (TCP) ไม่ใช่ `localhost` (Unix socket)
> ```bash
> docker exec eqap_db mariadb -h 127.0.0.1 -u root -prootpassword -e "SHOW DATABASES;"
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

---

## แผนพัฒนาต่อ (Roadmap)

### Phase ปัจจุบัน: Live Dashboard ✅ Deploy แล้ว
- [x] วิเคราะห์ระบบและเขียน context.md
- [x] สร้าง `/api/live-dashboard` endpoint (รองรับ scope filter)
- [x] สร้าง `/live-dashboard` page (Spider chart ใหญ่ + real-time polling)
- [x] Components: LiveSpiderChart, ScopeSelector, AnimatedNumber, LiveIndicator
- [x] Deploy บน production server (https://doitung.cnppai.com)

### Phase ถัดไป (Future)
- เพิ่ม WebSocket สำหรับ push notification เมื่อมีการ submit
- Export รายงานเป็น PDF
- Mobile-responsive สำหรับครูประเมินบน tablet
- Multi-language support (TH/EN)
- Role-based dashboard customization
