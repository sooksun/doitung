# TSQM-n แม่ฟ้าหลวง
## ระบบประเมินคุณภาพสถานศึกษา

ระบบประเมินคุณภาพสถานศึกษาตามตัวชี้วัด ใช้ได้ทุกสำนักงานเขตพื้นที่การศึกษา

---

## 📋 Overview

EQAP เป็นระบบประเมินคุณภาพสถานศึกษาที่รองรับ:
- **Multi-Tenant:** หลายสำนักงานเขตพื้นที่การศึกษา
- **Multi-Year:** หลายปีการศึกษาและภาคเรียน
- **Role-based Access:** ควบคุมสิทธิ์ตามบทบาทผู้ใช้
- **Evidence-Driven:** รองรับการอัปโหลดหลักฐานประกอบการประเมิน

---

## 🛠️ Technology Stack

- **Frontend:** Next.js 15.0.5 (App Router, TypeScript)
- **Backend:** Node.js
- **Database:** MySQL
- **ORM:** Prisma
- **Charts:** Recharts
- **Authentication:** Custom JWT
- **Styling:** Tailwind CSS
- **OS:** Linux Ubuntu

---

## 📦 Prerequisites

- Node.js (v18 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

---

## 🚀 Getting Started

### 1. Clone Repository

```bash
git clone <repository-url>
cd evalTeacher
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Setup Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="mysql://user:password@localhost:3306/eqap_db"
JWT_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
```

### 4. Setup Database

```bash
# Run Prisma migrations
npx prisma migrate dev

# Seed database with demo data
npx prisma db seed
```

### 5. Start Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
evalTeacher/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages
│   ├── (assessment)/     # Assessment pages
│   ├── (admin)/          # Admin pages
│   ├── api/              # API routes
│   ├── components/       # Reusable components
│   ├── lib/              # Utilities
│   ├── types/            # TypeScript types
│   └── hooks/            # Custom hooks
├── prisma/               # Prisma schema and migrations
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Seed data
├── public/              # Static files
└── doc/                 # Documentation
```

See `project-structure.md` for detailed structure.

---

## 🔐 Authentication

### Test Accounts (from seed data)

- **Super Admin:** admin@eqap.local / password123
- **Office Admin:** office1@eqap.local / password123
- **Network Admin:** network1@eqap.local / password123
- **School Director:** director1@eqap.local / password123
- **Teacher:** teacher1@eqap.local / password123
- **Viewer:** viewer1@eqap.local / password123

### User Roles

| Role | Description |
|------|-------------|
| **SUPER_ADMIN** | จัดการระบบทั้งหมด |
| **OFFICE_ADMIN** | ดูภาพรวมทุกโรงเรียนในเขต |
| **NETWORK_ADMIN** | ดูเฉพาะโรงเรียนในเครือข่าย |
| **SCHOOL_DIRECTOR** | ดู/ส่งแบบประเมินโรงเรียน |
| **TEACHER** | กรอกแบบประเมิน |
| **VIEWER** | อ่านอย่างเดียว |

---

## 📊 Assessment Indicators

ระบบมี **47 ตัวชี้วัด** แบ่งเป็น **4 กลุ่ม:**

1. **ผู้นำทางวิชาการ** (12 ตัวชี้วัด)
2. **ชุมชนแห่งการเรียนรู้ - PLC** (10 ตัวชี้วัด)
3. **การเรียนรู้ที่มีประสิทธิภาพ – ด้านครู** (12 ตัวชี้วัด)
4. **การเรียนรู้ที่มีประสิทธิภาพ – ด้านนักเรียน** (13 ตัวชี้วัด)

แต่ละตัวชี้วัดใช้ Radio Button 1-5 และรองรับหมายเหตุและหลักฐาน

---

## 🗄️ Database

### Prisma Commands

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Open Prisma Studio (Database GUI)
npx prisma studio

# Seed database
npx prisma db seed
```

### Database Schema

See `prisma/schema.prisma` for complete schema definition.

---

## 📝 Development Guidelines

### Code Continuity

เมื่อ Cursor AI หยุด/รีสตาร์ท:

1. อ่าน `context.md` เพื่อดูสถานะปัจจุบัน
2. อ่าน `plan.md` เพื่อดูแผนการพัฒนา
3. อ่าน `task.md` เพื่อดู task ที่ต้องทำต่อ
4. ทำงานต่อจากที่ค้างไว้

### Important Rules

- ✅ ใช้ Prisma สำหรับทุก DB operation
- ✅ ไม่ใช้ mock data (ใช้ seed data แทน)
- ✅ อัปเดต context.md, plan.md, task.md เมื่อทำงานเสร็จ
- ❌ อย่าลบไฟล์ที่มีอยู่แล้ว
- ❌ อย่าใช้ mock data

See `.cursorrules` for complete development rules.

---

## 🧪 Testing

### Run Tests

```bash
npm run test
# or
yarn test
```

### Test Data

Use seed data from `prisma/seed.ts` for testing. Never use production data.

---

## 📚 Documentation

- **PRD.md** - Product Requirement Document
- **project-structure.md** - Project structure details
- **context.md** - Current system status
- **plan.md** - Development plan
- **task.md** - Task list
- **CURSOR_PROMPT.md** - Prompt for Cursor AI
- **.cursorrules** - Cursor AI rules

---

## 🚀 Deployment

### Production Build

```bash
npm run build
npm start
```

### Environment Variables (Production)

Make sure to set:
- `DATABASE_URL` - Production database URL
- `JWT_SECRET` - Strong secret key
- `NEXTAUTH_URL` - Production URL
- `NODE_ENV=production`

---

## 📞 Support

For issues or questions, please refer to:
- Documentation files in the project root
- PRD.md for system requirements
- context.md for current status

---

## 📄 License

[Add your license here]

---

## 👥 Contributors

[Add contributors here]

---

**Last Updated:** 2026-01-25  
**Version:** 1.0.0
