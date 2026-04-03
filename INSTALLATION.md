# คู่มือการติดตั้งและใช้งานระบบ

## 📋 สารบัญ

1. [ความต้องการของระบบ](#ความต้องการของระบบ)
2. [การติดตั้ง Database](#การติดตั้ง-database)
3. [การติดตั้ง Backend](#การติดตั้ง-backend)
4. [การติดตั้ง Frontend](#การติดตั้ง-frontend)
5. [การทดสอบระบบ](#การทดสอบระบบ)
6. [User / Password](#user--password)
7. [Troubleshooting](#troubleshooting)

---

## 🖥️ ความต้องการของระบบ

### Software ที่ต้องติดตั้ง

- **Node.js** v18.x หรือสูงกว่า
- **MySQL** 8.0 (หรือใช้ Laragon ที่มี MySQL 8.0)
- **npm** หรือ **yarn**
- **Git** (ถ้าใช้ version control)

### สำหรับ Windows (Laragon)

- **Laragon** (แนะนำ) - รวม MySQL, phpMyAdmin, Terminal
- หรือติดตั้ง MySQL 8.0 แยก

---

## 🗄️ การติดตั้ง Database

### ขั้นตอนที่ 1: ตรวจสอบ MySQL

เปิด Laragon แล้ว Start MySQL (ถ้ายังไม่ start)

**วิธีตรวจสอบ:**
```bash
# เปิด Terminal ใน Laragon หรือ Command Prompt
mysql -u root
```

ถ้าสามารถเชื่อมต่อได้ แสดงว่า MySQL รันอยู่แล้ว

### ขั้นตอนที่ 2: ตั้งค่า Environment Variables

สร้างไฟล์ `.env` ในโฟลเดอร์โปรเจกต์ (root directory):

```env
# Database - Laragon MySQL
DATABASE_URL="mysql://root:@localhost:3306/okrsdoitung"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# JWT Secret (CHANGE THIS IN PRODUCTION!)
JWT_SECRET="school-qa-rbm-secret-key-change-in-production-2024"
JWT_EXPIRES_IN="7d"

# Environment
NODE_ENV="development"
```

**หมายเหตุ:** 
- ถ้า MySQL มี password ให้แก้ไขเป็น: `mysql://root:yourpassword@localhost:3306/okrsdoitung`
- ชื่อ database: `okrsdoitung`

### ขั้นตอนที่ 3: ติดตั้ง Dependencies

```bash
# ติดตั้ง dependencies ทั้งหมด
npm install

# ติดตั้ง mysql2 สำหรับ database setup script (ถ้ายังไม่มี)
npm install mysql2 --save-dev
```

### ขั้นตอนที่ 4: สร้าง Database

**วิธีที่ 1: ใช้ Prisma (แนะนำ - อัตโนมัติ)**

```bash
# Prisma จะสร้าง database ให้อัตโนมัติ
npm run db:push
```

**วิธีที่ 2: ใช้ SQL Script**

เปิด MySQL Console หรือ phpMyAdmin แล้วรัน:

```sql
CREATE DATABASE IF NOT EXISTS `okrsdoitung` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;
```

**วิธีที่ 3: ใช้ Node.js Script**

```bash
node scripts/check-database.js
```

### ขั้นตอนที่ 5: Generate Prisma Client และ Migrate

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database (สร้าง tables ทั้งหมด)
npm run db:push

# หรือใช้ migrations (สำหรับ production)
npm run db:migrate
```

### ขั้นตอนที่ 6: Seed ข้อมูลเริ่มต้น

```bash
# Seed ข้อมูล (users, schools, instruments, OKRs, action ratings)
npm run db:seed
```

**ผลลัพธ์:**
- ✅ สร้าง users (admin, leader, teacher)
- ✅ สร้าง schools และ networks
- ✅ สร้าง instruments (DERS, Thai P.1-3, Q-Model)
- ✅ สร้าง sample OKRs และ Actions
- ✅ สร้าง sample Action Ratings

### ขั้นตอนที่ 7: ตรวจสอบ Database

**วิธีที่ 1: ใช้ Prisma Studio**

```bash
npm run db:studio
```

เปิดเบราว์เซอร์ที่ `http://localhost:5555`

**วิธีที่ 2: ใช้ phpMyAdmin**

1. เปิด Laragon
2. คลิกขวาที่ Laragon → Database → phpMyAdmin
3. ดู database `okrsdoitung` ใน sidebar

**วิธีที่ 3: ใช้ MySQL Console**

```sql
USE okrsdoitung;
SHOW TABLES;
SELECT * FROM User;
```

---

## ⚙️ การติดตั้ง Backend

### ขั้นตอนที่ 1: ตรวจสอบ Environment Variables

ตรวจสอบว่าไฟล์ `.env` มีอยู่และตั้งค่าถูกต้อง (ดูด้านบน)

### ขั้นตอนที่ 2: Generate Prisma Client

```bash
npm run db:generate
```

### ขั้นตอนที่ 3: ตรวจสอบ Dependencies

```bash
# ตรวจสอบว่า dependencies ติดตั้งครบ
npm list --depth=0
```

**Dependencies สำคัญ:**
- `@prisma/client`
- `next`
- `bcryptjs`
- `jsonwebtoken`

### ขั้นตอนที่ 4: ทดสอบ Build

```bash
# Build project (ตรวจสอบ errors)
npm run build
```

### ขั้นตอนที่ 5: Run Backend (Development)

```bash
# Start development server
npm run dev
```

**ผลลัพธ์:**
- ✅ Server รันที่ `http://localhost:3000`
- ✅ API routes พร้อมใช้งาน
- ✅ Hot reload enabled

**ตรวจสอบ:**
เปิดเบราว์เซอร์ไปที่ `http://localhost:3000/api/instruments`

ควรเห็น JSON response (อาจต้องมี JWT token ถ้า routes ถูก protect)

---

## 🎨 การติดตั้ง Frontend

### Frontend เป็น Next.js (รวมกับ Backend)

ระบบนี้ใช้ Next.js ซึ่งรวม Frontend และ Backend ไว้ด้วยกัน ดังนั้น:

**Run Frontend = Run Backend**

```bash
# Start development server (รวม Frontend + Backend)
npm run dev
```

เปิดเบราว์เซอร์ที่ `http://localhost:3000`

### สร้าง Frontend Pages (ถ้ายังไม่มี)

สำหรับตอนนี้ Backend API routes พร้อมแล้ว แต่ Frontend pages ยังต้องสร้าง

**Frontend Pages ที่ควรมี:**
- `/login` - หน้า login
- `/dashboard` - Dashboard หลัก
- `/instruments` - รายการเครื่องมือประเมิน
- `/evaluations` - รายการการประเมิน
- `/okrs` - จัดการ OKRs
- `/reports` - รายงาน

**หมายเหตุ:** Frontend pages จะสร้างใน Phase ถัดไป

---

## 🧪 การทดสอบระบบ

### ทดสอบ Database Connection

```bash
# ใช้ Prisma Studio
npm run db:studio
```

### ทดสอบ API Endpoints

#### 1. ทดสอบ Login

```bash
# ใช้ curl หรือ Postman
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@local",
  "password": "Admin123"
}
```

**Response ตัวอย่าง:**
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
  },
  "message": "เข้าสู่ระบบสำเร็จ"
}
```

**บันทึก token** เพื่อใช้ใน requests ถัดไป

#### 2. ทดสอบ Get Current User

```bash
GET http://localhost:3000/api/auth/me
Authorization: Bearer <your-token>
```

#### 3. ทดสอบ Instruments API

```bash
GET http://localhost:3000/api/instruments
Authorization: Bearer <your-token>
```

#### 4. ทดสอบ OKRs API

```bash
GET http://localhost:3000/api/okrs/objectives
Authorization: Bearer <your-token>
```

#### 5. ทดสอบ Action Ratings API

```bash
# Get ratings สำหรับ action ID 1
GET http://localhost:3000/api/okrs/actions/1/ratings
Authorization: Bearer <your-token>

# Create new rating
POST http://localhost:3000/api/okrs/actions/1/ratings
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "currentState": 3,
  "desiredState": 5,
  "comment": "ทดสอบการประเมิน",
  "schoolId": 1,
  "academicYearId": 1,
  "termId": 1
}
```

#### 6. ทดสอบ Dashboard API

```bash
GET http://localhost:3000/api/dashboard/summary
Authorization: Bearer <your-token>

GET http://localhost:3000/api/dashboard/q-model
Authorization: Bearer <your-token>

GET http://localhost:3000/api/dashboard/okr-progress
Authorization: Bearer <your-token>
```

### ทดสอบด้วย Script

สร้างไฟล์ `test-api.js` (optional):

```javascript
// test-api.js
const fetch = require('node-fetch');

async function testAPI() {
  // 1. Login
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@local',
      password: 'Admin123',
    }),
  });
  
  const loginData = await loginRes.json();
  console.log('Login:', loginData);
  
  const token = loginData.data?.token;
  
  if (!token) {
    console.error('Login failed!');
    return;
  }
  
  // 2. Get Current User
  const meRes = await fetch('http://localhost:3000/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const meData = await meRes.json();
  console.log('Current User:', meData);
  
  // 3. Get Instruments
  const instrumentsRes = await fetch('http://localhost:3000/api/instruments', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const instrumentsData = await instrumentsRes.json();
  console.log('Instruments:', instrumentsData);
  
  // 4. Get OKRs
  const okrsRes = await fetch('http://localhost:3000/api/okrs/objectives', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const okrsData = await okrsRes.json();
  console.log('OKRs:', okrsData);
}

testAPI().catch(console.error);
```

รันด้วย:
```bash
node test-api.js
```

---

## 👤 User / Password

### Default Users (หลัง Seed)

หลังจากรัน `npm run db:seed` จะมี users ต่อไปนี้:

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| `admin@local` | `Admin123` | ADMIN | ผู้ดูแลระบบ |
| `admin@example.com` | `Admin123` | ADMIN | Admin (backup) |
| `leader@example.com` | `Leader123` | SCHOOL_LEADER, TEACHER | ผู้อำนวยการ/ครูใหญ่ |
| `teacher@example.com` | `Teacher123` | TEACHER | ครูผู้สอน |

### การเปลี่ยน Password

**วิธีที่ 1: ใช้ Prisma Studio**

```bash
npm run db:studio
```

1. เปิด `User` table
2. แก้ไข `password` field (ต้อง hash ก่อน - ใช้ bcrypt)

**วิธีที่ 2: สร้าง Script**

สร้างไฟล์ `scripts/change-password.js`:

```javascript
// scripts/change-password.js
const { hashPassword } = require('../lib/auth');
const { prisma } = require('../lib/prisma');

async function changePassword(email, newPassword) {
  const hashedPassword = await hashPassword(newPassword);
  
  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });
  
  console.log(`Password changed for ${email}`);
}

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error('Usage: node scripts/change-password.js <email> <new-password>');
  process.exit(1);
}

changePassword(email, newPassword)
  .then(() => process.exit(0))
  .catch(console.error);
```

รันด้วย:
```bash
node scripts/change-password.js admin@local NewPassword123
```

---

## 🔧 Troubleshooting

### ปัญหา: MySQL ไม่เชื่อมต่อได้

**วิธีแก้:**
1. ตรวจสอบว่า MySQL รันอยู่ใน Laragon
2. ตรวจสอบ `.env` ว่า `DATABASE_URL` ถูกต้อง
3. ลองเชื่อมต่อด้วย MySQL Console:
   ```bash
   mysql -u root
   ```

### ปัญหา: Error: Cannot find module '@prisma/client'

**วิธีแก้:**
```bash
npm install
npm run db:generate
```

### ปัญหา: Error: Database not found

**วิธีแก้:**
```bash
# สร้าง database ก่อน
npm run db:push

# หรือรัน script
node scripts/check-database.js
```

### ปัญหา: Error: Unauthorized (401)

**วิธีแก้:**
1. ตรวจสอบว่า login สำเร็จและได้ token
2. ตรวจสอบว่า Authorization header ถูกต้อง:
   ```
   Authorization: Bearer <token>
   ```
3. ตรวจสอบว่า token ยังไม่หมดอายุ

### ปัญหา: Error: Prisma Client not generated

**วิธีแก้:**
```bash
npm run db:generate
```

### ปัญหา: Port 3000 already in use

**วิธีแก้:**
1. หยุด process ที่ใช้ port 3000:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # Linux/Mac
   lsof -ti:3000 | xargs kill
   ```

2. หรือเปลี่ยน port ใน `.env`:
   ```env
   PORT=3001
   ```

### ปัญหา: Seed data ไม่สร้าง

**วิธีแก้:**
1. ตรวจสอบว่า database มี tables แล้ว:
   ```bash
   npm run db:push
   ```

2. ตรวจสอบ Prisma Client:
   ```bash
   npm run db:generate
   ```

3. รัน seed อีกครั้ง:
   ```bash
   npm run db:seed
   ```

---

## 📝 Quick Start (สรุปสั้นๆ)

```bash
# 1. Clone repository (ถ้ามี)
git clone <repository-url>
cd doitung

# 2. ติดตั้ง dependencies
npm install

# 3. สร้างไฟล์ .env (copy จาก .env.example)
# แก้ไข DATABASE_URL ตามที่ต้องการ

# 4. Setup database (สร้าง database, generate client, push schema, seed)
npm install mysql2 --save-dev
npm run db:setup

# 5. Start development server
npm run dev

# 6. ทดสอบ login
# POST http://localhost:3000/api/auth/login
# Body: { "email": "admin@local", "password": "Admin123" }
```

---

## 📚 เอกสารเพิ่มเติม

- `DATABASE_SETUP.md` - รายละเอียดการ setup database
- `QUICK_START.md` - Quick start guide
- `docs/ACTION_RATING_SCHEMA.md` - เอกสาร Action Rating
- `routes.md` - API routes documentation

---

**อัปเดตล่าสุด**: 2024

