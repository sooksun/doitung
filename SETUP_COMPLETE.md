# ✅ Checklist: การติดตั้งระบบเสร็จสิ้น

## 📋 ขั้นตอนการติดตั้ง

### ✅ 1. ติดตั้ง Dependencies

```bash
npm install
npm install mysql2 --save-dev
```

### ✅ 2. สร้างไฟล์ .env

สร้างไฟล์ `.env` ใน root directory:

```env
DATABASE_URL="mysql://root:@localhost:3306/okrsdoitung"
JWT_SECRET="school-qa-rbm-secret-key-change-in-production-2024"
JWT_EXPIRES_IN="7d"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### ✅ 3. Setup Database

```bash
npm run db:setup
```

**จะทำอัตโนมัติ:**
- ✅ ตรวจสอบและสร้าง database `okrsdoitung`
- ✅ Generate Prisma Client
- ✅ Push schema (สร้าง tables)
- ✅ Seed ข้อมูลเริ่มต้น

### ✅ 4. Run Backend + Frontend

```bash
npm run dev
```

**ตรวจสอบ:**
- ✅ Server รันที่ `http://localhost:3000`
- ✅ ไม่มี errors ใน console

### ✅ 5. ทดสอบระบบ

```bash
# ทดสอบ API ทั้งหมด
npm run test:api
```

**หรือทดสอบด้วย Postman/curl:**

#### Login
```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@local",
  "password": "Admin123"
}
```

#### Get Instruments
```bash
GET http://localhost:3000/api/instruments
Authorization: Bearer <token>
```

---

## 👤 Default Users

| Email | Password | Role |
|-------|----------|------|
| `admin@local` | `Admin123` | ADMIN |
| `leader@example.com` | `Leader123` | SCHOOL_LEADER, TEACHER |
| `teacher@example.com` | `Teacher123` | TEACHER |

---

## ✅ ตรวจสอบการติดตั้ง

### Database

```bash
# ตรวจสอบผ่าน Prisma Studio
npm run db:studio
```

**ตรวจสอบว่า:**
- ✅ มี tables ทั้งหมด (User, School, Instrument, OKRAction, OKRActionRating, etc.)
- ✅ มี users (admin@local, leader@example.com, teacher@example.com)
- ✅ มี sample data (schools, instruments, OKRs)

### API

```bash
# ทดสอบ API
npm run test:api
```

**ตรวจสอบว่า:**
- ✅ Login สำเร็จ
- ✅ Get Current User สำเร็จ
- ✅ Get Instruments สำเร็จ
- ✅ Get OKRs สำเร็จ
- ✅ Get Actions สำเร็จ
- ✅ Get Action Ratings สำเร็จ
- ✅ Dashboard API ทำงาน

### Server

```bash
# Start server
npm run dev
```

**ตรวจสอบว่า:**
- ✅ ไม่มี compilation errors
- ✅ Server รันที่ port 3000
- ✅ API routes ตอบสนอง (แม้ไม่มี frontend)

---

## 🎯 สิ่งที่ควรทำต่อไป

1. **สร้าง Frontend Pages** (ถ้ายังไม่มี)
   - `/login` - หน้า login
   - `/dashboard` - Dashboard หลัก
   - `/instruments` - รายการเครื่องมือประเมิน
   - `/evaluations` - รายการการประเมิน
   - `/okrs` - จัดการ OKRs
   - `/reports` - รายงาน

2. **ทดสอบระบบเพิ่มเติม**
   - ทดสอบ CRUD operations
   - ทดสอบ authentication
   - ทดสอบ authorization (roles)

3. **ปรับปรุง UI/UX**
   - ใช้ Kanit font สำหรับ Thai text
   - Responsive design
   - Teacher-friendly interface

---

## 📚 เอกสารเพิ่มเติม

- **[INSTALLATION.md](./INSTALLATION.md)** - คู่มือการติดตั้งและใช้งานแบบละเอียด
- **[DATABASE_SETUP.md](./DATABASE_SETUP.md)** - รายละเอียดการ setup database
- **[QUICK_START.md](./QUICK_START.md)** - Quick start guide
- **[docs/ACTION_RATING_SCHEMA.md](./docs/ACTION_RATING_SCHEMA.md)** - เอกสาร Action Rating
- **[routes.md](./routes.md)** - API routes documentation

---

**อัปเดตล่าสุด**: 2024

