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
        └── Indicator (textTh, textEn, code, minScore=1, maxScore=5, scaleType=LIKERT_1_5)
```

Q-Model มี 4 sections, 47 indicators:
- Q-Leadership (L1-L12): 12 ตัวชี้วัด
- Q-PLC (PLC1-PLC10): 10 ตัวชี้วัด
- Q-Learning (T1-T12): 12 ตัวชี้วัด
- Q-Students (S1-S13): 13 ตัวชี้วัด

### Evaluation Data
```
EvaluationSession (status: DRAFT → SUBMITTED → REVIEWED → ARCHIVED)
  └── EvaluationResponse
        ├── score  — สภาพที่พึงประสงค์ (Desired State) แสดงด้วยสีน้ำเงิน
        └── score2 — สภาพที่เป็นอยู่ (Current State) แสดงด้วยสีม่วง
```
⚠️ หมายเหตุ: score = พึงประสงค์ (เป้าหมาย), score2 = เป็นอยู่ (ปัจจุบัน) — อย่าสับสน

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
```

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

## Frontend Pages

| Route | Description |
|-------|-------------|
| `/` | Home with navigation cards |
| `/login` | JWT authentication |
| `/dashboard` | Main dashboard (KPIs, Spider chart, Q-Model) |
| `/live-dashboard` | **[ใหม่]** Real-time display screen for projector/TV |
| `/evaluations` | List evaluation sessions |
| `/evaluations/new` | Create new evaluation session |
| `/evaluations/:id` | Detail view of session |
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

