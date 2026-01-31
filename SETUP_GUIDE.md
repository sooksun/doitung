# คู่มือการติดตั้งและเริ่มต้นใช้งาน
## EduQuality Assessment Platform (EQAP)

---

## 📋 ขั้นตอนการติดตั้ง

### 1. ติดตั้ง Dependencies

```bash
npm install
```

### 2. Setup Database

#### สร้าง Database ใน MySQL:

```sql
CREATE DATABASE eqap_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### แก้ไข .env (ถ้าจำเป็น):

```env
DATABASE_URL="mysql://root:@localhost:3306/eqap_db"
```

### 3. Run Prisma Migrations

```bash
npx prisma migrate dev --name init
```

คำสั่งนี้จะ:
- สร้างตารางทั้งหมดใน database
- สร้าง Prisma Client

### 4. Seed Database

```bash
npm run db:seed
```

คำสั่งนี้จะสร้างข้อมูลทดสอบ:
- 4 กลุ่มตัวชี้วัด
- 47 ตัวชี้วัดครบถ้วน
- 2 สำนักงานเขต
- 4 กลุ่มเครือข่าย
- 8 โรงเรียน
- 2 ปีการศึกษา
- 2 ภาคเรียน
- 8 ผู้ใช้งาน (ทุก Role)

### 5. Start Development Server

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่: http://localhost:3000

---

## 🔑 บัญชีทดสอบ

| Role | Email | Password | ความสามารถ |
|------|-------|----------|-----------|
| Super Admin | admin@eqap.local | password123 | เข้าถึงทุกอย่าง |
| Office Admin | office1@eqap.local | password123 | จัดการเขตพื้นที่ |
| Network Admin | network1@eqap.local | password123 | จัดการกลุ่มเครือข่าย |
| School Director | director1@eqap.local | password123 | จัดการโรงเรียน |
| Teacher | teacher1@eqap.local | password123 | ทำแบบประเมิน |
| Viewer | viewer1@eqap.local | password123 | ดูข้อมูลอย่างเดียว |

---

## 🧪 ทดสอบระบบ

### 1. ทดสอบ Login

1. ไปที่ http://localhost:3000/login
2. ใช้บัญชีทดสอบด้านบน
3. ตรวจสอบว่า login สำเร็จและ redirect ไป dashboard

### 2. ทดสอบ Signup

1. ไปที่ http://localhost:3000/signup
2. กรอกข้อมูลลงทะเบียน
3. ตรวจสอบว่าสร้างบัญชีสำเร็จ

### 3. ทดสอบ Dashboard

1. Login เข้าระบบ
2. ตรวจสอบว่าแสดงข้อมูลผู้ใช้ถูกต้อง
3. ทดสอบปุ่ม Logout

---

## 🛠️ คำสั่งที่ใช้บ่อย

### Development

```bash
# Start dev server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

### Database (Prisma)

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Reset database (ลบข้อมูลทั้งหมด)
npx prisma migrate reset

# Seed database
npm run db:seed

# Open Prisma Studio (GUI)
npm run prisma:studio
```

---

## 📁 โครงสร้างโปรเจค

```
evalTeacher/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth pages (login, signup)
│   ├── api/                 # API routes
│   │   └── auth/           # Auth endpoints
│   ├── dashboard/          # Dashboard page
│   ├── lib/                # Utilities
│   │   ├── prisma.ts       # Prisma Client
│   │   ├── auth.ts         # JWT utilities
│   │   └── types.ts        # TypeScript types
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Seed data
├── .env                    # Environment variables
├── middleware.ts           # Auth middleware
└── package.json            # Dependencies
```

---

## ⚠️ Troubleshooting

### ❌ Error: `PrismaClient is not configured`

**วิธีแก้:**
```bash
npx prisma generate
```

### ❌ Error: `Can't connect to MySQL server`

**วิธีแก้:**
- ตรวจสอบว่า MySQL server เปิดอยู่
- ตรวจสอบ DATABASE_URL ใน .env
- ตรวจสอบว่าสร้าง database แล้ว

### ❌ Error: `Port 3000 is already in use`

**วิธีแก้:**
```bash
# Windows
npx kill-port 3000

# หรือเปลี่ยน port
# แก้ไข package.json: "dev": "next dev -p 3001"
```

### ❌ Error: `Cannot find module '@prisma/client'`

**วิธีแก้:**
```bash
npm install
npx prisma generate
```

---

## 🎯 ขั้นตอนถัดไป

Phase 1 เสร็จสมบูรณ์แล้ว! ✅

### Phase 2: Assessment Form Module (ต่อไป)

1. สร้าง Assessment API routes
2. สร้าง Assessment Form UI
3. Implement Auto-save
4. Implement Evidence Upload

ดูรายละเอียดใน `plan.md` และ `task.md`

---

## 📞 ติดต่อ & สนับสนุน

หากมีปัญหาหรือข้อสงสัย:
1. ตรวจสอบ README.md
2. ตรวจสอบ .cursorrules สำหรับ coding guidelines
3. ดู PRD.md สำหรับรายละเอียดระบบ

---

**Last Updated:** 2026-01-25  
**Version:** 1.0.0
