# Quick Start Guide

## การติดตั้งและ Setup Database สำหรับ Laragon

### ข้อมูล Database
- **Database Name**: `okrsdoitung`
- **User**: `root`
- **Password**: `` (empty)
- **Host**: `localhost`
- **Port**: `3306`

---

## ขั้นตอนการ Setup

### 1. ติดตั้ง Dependencies

```bash
npm install
```

### 2. สร้างไฟล์ .env

สร้างไฟล์ `.env` ในโฟลเดอร์โปรเจกต์:

```env
DATABASE_URL="mysql://root:@localhost:3306/okrsdoitung"
JWT_SECRET="school-qa-rbm-secret-key-change-in-production-2024"
JWT_EXPIRES_IN="7d"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### 3. สร้าง Database

มี 3 วิธี:

#### วิธีที่ 1: ใช้ Prisma (แนะนำ - อัตโนมัติ)

```bash
# Prisma จะสร้าง database ให้อัตโนมัติ
npm run db:push
```

#### วิธีที่ 2: ใช้ SQL Script

เปิด MySQL Console ใน Laragon แล้วรัน:

```sql
CREATE DATABASE IF NOT EXISTS `okrsdoitung` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;
```

#### วิธีที่ 3: ใช้ Node.js Script

```bash
# ติดตั้ง mysql2 ก่อน (ถ้ายังไม่มี)
npm install mysql2 --save-dev

# รัน script
node scripts/check-database.js
```

### 4. Generate Prisma Client

```bash
npm run db:generate
```

### 5. Push Schema to Database

```bash
# สร้าง tables ทั้งหมด
npm run db:push

# หรือใช้ migrations (ถ้าต้องการ track history)
npm run db:migrate
```

### 6. Seed ข้อมูลเริ่มต้น

```bash
npm run db:seed
```

จะสร้าง:
- Admin user: `admin@local` / `Admin123`
- Leader user: `leader@example.com` / `Leader123`
- Teacher user: `teacher@example.com` / `Teacher123`
- Sample schools, networks, instruments, OKRs

### 7. เริ่ม Development Server

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่ `http://localhost:3000`

---

## Setup ทั้งหมดในคำสั่งเดียว

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. สร้าง .env file (ต้องสร้างเอง)
# Copy content จาก .env.example

# 3. Setup database (ตรวจสอบ, สร้าง database, generate, push, seed)
npm install mysql2 --save-dev
npm run db:setup
```

---

## ตรวจสอบ Database

### ผ่าน Prisma Studio

```bash
npm run db:studio
```

### ผ่าน MySQL Command Line

```sql
USE okrsdoitung;
SHOW TABLES;
```

### ผ่าน phpMyAdmin

1. เปิด Laragon
2. คลิกขวาที่ Laragon → Database → phpMyAdmin
3. ดู database `okrsdoitung` ใน sidebar

---

## Login Credentials

หลังจาก seed ข้อมูลแล้ว ใช้ credentials นี้:

| Email | Password | Role |
|-------|----------|------|
| admin@local | Admin123 | ADMIN |
| leader@example.com | Leader123 | SCHOOL_LEADER, TEACHER |
| teacher@example.com | Teacher123 | TEACHER |

---

## API Testing

### Login

```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@local",
  "password": "Admin123"
}
```

### Get Current User

```bash
GET http://localhost:3000/api/auth/me
Authorization: Bearer <token>
```

### List Instruments

```bash
GET http://localhost:3000/api/instruments
Authorization: Bearer <token>
```

---

## Troubleshooting

### MySQL ไม่เชื่อมต่อได้

1. ตรวจสอบว่า MySQL รันอยู่ใน Laragon
2. ตรวจสอบ `.env` file ว่า `DATABASE_URL` ถูกต้อง
3. ลองเชื่อมต่อด้วย MySQL Console:
   ```bash
   mysql -u root
   ```

### Error: Database not found

รัน:
```bash
npm run db:push
```

Prisma จะสร้าง database ให้อัตโนมัติ

### Error: Prisma Client not generated

```bash
npm run db:generate
```

---

**อัปเดตล่าสุด**: 2024

