# routes.md

## 1. NestJS Backend API (REST)

Base URL (dev): `http://localhost:3001`

### Auth (ภายหลังค่อยทำจริง)
- POST `/auth/login`
  - Body: { email, password }
  - Response: { accessToken, user }

### Instruments & Indicators
- GET `/instruments`
  - รายชื่อแบบประเมินทั้งหมด (DERS, THAI_P1_3, Q_MODEL, ...)
- GET `/instruments/:id`
- POST `/instruments`
- PATCH `/instruments/:id`
- DELETE `/instruments/:id`

- GET `/instruments/:id/sections`
- GET `/instruments/:id/indicators`

- GET `/indicators/:id`
- PATCH `/indicators/:id`

### Evaluation Sessions & Responses
- GET `/evaluations`
  - Query: instrumentId?, schoolId?, networkId?, academicYearId?, termId?, status?, evaluatorId?
  - Response: { evaluations: EvaluationSession[], total, page, limit }
- GET `/evaluations/:id`
  - Include: instrument, school, network, academicYear, term, evaluator, targetTeacher, responses
- POST `/evaluations`
  - Body: { instrumentId, schoolId, academicYearId, termId?, evaluatorId, targetTeacherId?, targetSchoolId? }
- PATCH `/evaluations/:id`
  - Body: { status?, note? }
  - update note, status, etc.
- DELETE `/evaluations/:id`
  - Cascade delete responses, evidence

- POST `/evaluations/:id/responses`
  - Body: { responses: [{ indicatorId, score, comment?, evidenceUrl? }] }
  - Batch save responses
- PATCH `/evaluations/:id/responses/:responseId`
  - Body: { score?, comment?, evidenceUrl? }

### OKR & RBM
- GET `/okrs/objectives`
  - Query: schoolId?, networkId?, academicYearId?, dimension?, status?, ownerId?, quarter?
  - Include: keyResults (with progress)
  - Response: { objectives: OKRObjective[] }
- GET `/okrs/objectives/:id`
  - Include: school, network, academicYear, owner, keyResults (with indicators, actions)
- POST `/okrs/objectives`
  - Body: { code?, title, description?, dimension?, schoolId?, networkId?, academicYearId?, ownerId?, quarter? }
- PATCH `/okrs/objectives/:id`
  - Body: { title?, description?, dimension?, status?, ownerId?, quarter? }
- DELETE `/okrs/objectives/:id`
  - Cascade delete keyResults

- GET `/okrs/objectives/:id/key-results`
  - Include: indicators, actions, progress
- POST `/okrs/objectives/:id/key-results`
  - Body: { title, description?, baseline?, target?, unit?, quarter?, ownerId? }
- PATCH `/okrs/key-results/:id`
  - Body: { title?, description?, baseline?, target?, current?, unit?, ownerId?, quarter? }
- DELETE `/okrs/key-results/:id`
  - Cascade delete actions, indicator links

- POST `/okrs/key-results/:id/actions`
  - Body: { title, description?, order?, ownerId?, startDate?, endDate?, requiredResources?, risks?, mitigation?, expectedOutputs?, expectedOutcomes?, evidenceOfSuccess? }
- PATCH `/okrs/actions/:id`
  - Body: { title?, description?, status?, ownerId?, startDate?, endDate?, requiredResources?, risks?, mitigation?, expectedOutputs?, expectedOutcomes?, evidenceOfSuccess? }
- GET `/okrs/actions/:id`
  - Include: keyResult, owner, evidence

- GET `/okrs/actions/:id/ratings`
  - Query: schoolId?, academicYearId?, termId?, evaluatorId?, page?, limit?
  - Response: Paginated list of action ratings with average currentState/desiredState
- POST `/okrs/actions/:id/ratings`
  - Body: { currentState (1-5), desiredState (1-5), comment?, schoolId?, academicYearId?, termId? }
  - Create new rating for action (evaluatorId from JWT token)

- POST `/okrs/key-results/:id/indicators`
  - Body: { indicatorId, weight? }
  - Link indicator to KR
- DELETE `/okrs/key-results/:id/indicators/:indicatorId`
  - Unlink indicator from KR

### Dashboard / Q-Info / RBM Aggregation
- GET `/dashboard/summary`
  - Query: schoolId?, networkId?, academicYearId?, termId?, level? (school|network|system)
  - Response: { completionRate, overallQualityIndex, kpiCards: [...] }
- GET `/dashboard/q-model`
  - Query: schoolId?, networkId?, academicYearId?, termId?, level?
  - Response: { dimensionProgress: [{ dimension, labelTh, current, target }] }
  - Returns aggregated scores by Q-dimension (Q-Leadership, Q-PLC, etc.)
- GET `/dashboard/instrument/:instrumentId`
  - Query: schoolId?, networkId?, academicYearId?, termId?, level?
  - Response: { averages: [{ section, indicator, avgScore, maxScore }] }
  - Average scores by section & indicator
- GET `/dashboard/okr-progress`
  - Query: schoolId?, networkId?, academicYearId?, objectiveId?, level?
  - Response: { objectives: [{ id, title, progress, keyResults: [...] }] }
  - Progress of each Objective / KR
- GET `/dashboard/kr/:id/detail`
  - Response: { kr: {...}, indicators: [{ id, itemCode, textTh, current, baseline, target }] }
  - KR indicator map with current values

### Comparison & Aggregation
- GET `/dashboard/comparison`
  - Query: type (school|network|year), ids[], academicYearId?, termId?
  - Response: { comparisons: [{ id, name, data: [...] }] }
  - Compare schools/networks or same school across years
- GET `/networks`
  - Query: isActive?
  - Response: { networks: SchoolNetwork[] }
- GET `/networks/:id`
  - Include: members (schools)
- GET `/networks/:id/schools`
  - Response: { schools: School[] }
- GET `/networks/:id/aggregate`
  - Query: academicYearId?, termId?
  - Response: { networkLevel: {...}, schoolLevels: [{ schoolId, schoolName, data: [...] }] }
  - Network-level aggregation with school breakdown

### Evidence Management
- POST `/evidence`
  - Body: FormData (file upload) + { evaluationSessionId?, okrActionId?, description? }
  - Upload evidence (file or URL)
- GET `/evidence/:id`
  - Response: { id, url, description, createdAt, ... }
- DELETE `/evidence/:id`
  - Delete evidence (file + record)

---

## 2. Next.js Frontend Routes (App Router)

Base URL (dev): `http://localhost:3000`

### Public/Auth
- `/login`
  - หน้าเข้าสู่ระบบ (mock auth ในระยะแรก)

### Dashboard
- `/`
  - Redirect → `/dashboard`
- `/dashboard`
  - แสดง KPI cards, summary chart, RBM overview
  - Filter: school, network, year, term, instrument, Q-dimension
  - Multi-level view: school | network | system
- `/dashboard/comparison`
  - เปรียบเทียบ: โรงเรียน vs โรงเรียน, เครือข่าย vs เครือข่าย, โรงเรียนเดียวกันหลายปี
  - Side-by-side charts

### Instruments
- `/instruments`
  - ตารางรายชื่อแบบประเมิน
- `/instruments/[id]`
  - แสดงรายละเอียด instrument + sections + indicators

### Evaluations
- `/evaluations`
  - รายชื่อ evaluation sessions ทั้งหมด (filter ได้)
- `/evaluations/new`
  - เลือก instrument + school + target + term → กดสร้าง
- `/evaluations/[id]`
  - หน้าแบบฟอร์มประเมิน:
    - แสดง sections + indicators
    - ให้กรอกคะแนน + comment
    - ปุ่มบันทึก draft / ส่ง (Submit)

### OKRs
- `/okrs`
  - รายชื่อ Objective ตามโรงเรียน/ปี
- `/okrs/[id]`
  - แสดง Objective + Key Results + Actions + แถบ progress

### Reports
- `/reports`
  - หน้ารวมรายงาน
- `/reports/q-model`
  - แสดง radar / bar chart ตาม Q-dimension
- `/reports/instruments/[instrumentId]`
  - รายงานเฉพาะแบบประเมิน (DERS / THAI_P1_3)

### Admin/Config (อนาคต)
- `/admin/users`
- `/admin/schools`
- `/admin/instruments`
