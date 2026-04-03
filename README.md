# School QA + RBM Dashboard

ระบบประเมินและพัฒนาคุณภาพโรงเรียนด้วยเครื่องมือ DERS, Thai P.1-3, และ Q-Model พร้อมระบบ OKR & RBM

## 📚 เอกสาร

- **[INSTALLATION.md](./INSTALLATION.md)** - คู่มือการติดตั้งและใช้งาน (แนะนำอ่านก่อน!)
- **[DATABASE_SETUP.md](./DATABASE_SETUP.md)** - รายละเอียดการ setup database
- **[QUICK_START.md](./QUICK_START.md)** - Quick start guide
- **[docs/ACTION_RATING_SCHEMA.md](./docs/ACTION_RATING_SCHEMA.md)** - เอกสาร Action Rating

## 🚀 Quick Start

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. สร้างไฟล์ .env (ดู INSTALLATION.md)

# 3. Setup database
npm install mysql2 --save-dev
npm run db:setup

# 4. Start server
npm run dev

# 5. ทดสอบ API
npm run test:api
```

## 👤 Default Users

| Email | Password | Role |
|-------|----------|------|
| admin@local | Admin123 | ADMIN |
| leader@example.com | Leader123 | SCHOOL_LEADER, TEACHER |
| teacher@example.com | Teacher123 | TEACHER |

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + React + TypeScript
- **Backend**: Next.js API Routes
- **Database**: MySQL
- **ORM**: Prisma
- **Authentication**: JWT + bcryptjs

## การติดตั้ง

### 1. ติดตั้ง Dependencies

```bash
npm install
```

### 2. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` จาก `.env.example`:

```bash
cp .env.example .env
```

แก้ไข `.env`:
```env
DATABASE_URL="mysql://user:password@localhost:3306/school_qa_rbm"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
```

### 3. สร้าง Database และ Run Migrations

```bash
# Generate Prisma Client
npm run db:generate

# Create database and run migrations
npm run db:migrate

# Or use db push (for development)
npm run db:push
```

### 4. Seed ข้อมูลเริ่มต้น

```bash
npm run db:seed
```

จะสร้าง:
- Admin user: `admin@local` / `Admin123`
- Leader user: `leader@example.com` / `Leader123`
- Teacher user: `teacher@example.com` / `Teacher123`
- Sample schools, networks, instruments, OKRs

### 5. เริ่ม Development Server

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่ `http://localhost:3000`

## Authentication

### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@local",
  "password": "Admin123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "admin@local",
      "name": "Admin User",
      "roles": ["ADMIN"]
    }
  }
}
```

### Get Current User

```bash
GET /api/auth/me
Authorization: Bearer <token>
```

### ใช้ Token ใน API Requests

ส่ง token ใน Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### Instruments
- `GET /api/instruments` - List instruments
- `POST /api/instruments` - Create instrument (Admin only)
- `GET /api/instruments/:id` - Get instrument details
- `GET /api/instruments/:id/sections` - Get sections
- `GET /api/instruments/:id/indicators` - Get indicators

### Evaluations
- `GET /api/evaluations` - List evaluations
- `POST /api/evaluations` - Create evaluation session
- `GET /api/evaluations/:id` - Get evaluation details
- `POST /api/evaluations/:id/responses` - Save responses

### OKRs
- `GET /api/okrs/objectives` - List objectives
- `POST /api/okrs/objectives` - Create objective
- `GET /api/okrs/objectives/:id` - Get objective details
- `POST /api/okrs/objectives/:id/key-results` - Create KR
- `POST /api/okrs/key-results/:id/actions` - Create action

### Dashboard
- `GET /api/dashboard/summary` - Overall summary
- `GET /api/dashboard/q-model` - Q-Model progress
- `GET /api/dashboard/okr-progress` - OKR progress

### Networks
- `GET /api/networks` - List networks
- `GET /api/networks/:id` - Get network details
- `GET /api/networks/:id/schools` - Get schools in network

## Default Users

| Email | Password | Role |
|-------|----------|------|
| admin@local | Admin123 | ADMIN |
| leader@example.com | Leader123 | SCHOOL_LEADER, TEACHER |
| teacher@example.com | Teacher123 | TEACHER |

## Development

### Database Commands

```bash
# Generate Prisma Client
npm run db:generate

# Create migration
npm run db:migrate

# Push schema changes (dev)
npm run db:push

# Seed database
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

### Project Structure

```
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication
│   │   ├── instruments/  # Instruments API
│   │   ├── evaluations/  # Evaluations API
│   │   ├── okrs/         # OKRs API
│   │   ├── dashboard/    # Dashboard API
│   │   └── networks/     # Networks API
│   └── ...
├── lib/
│   ├── prisma.ts         # Prisma Client
│   ├── auth.ts           # Authentication utilities
│   ├── api-utils.ts      # API utilities
│   ├── api-types.ts      # TypeScript types
│   └── rbm-calculator.ts # RBM calculation logic
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed data
└── middleware.ts         # Next.js middleware
```

## License

MIT

