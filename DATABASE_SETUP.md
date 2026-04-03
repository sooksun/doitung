# Database Setup Guide

## การตั้งค่า MySQL Database สำหรับ Laragon

### ข้อมูล Database
- **Database Name**: `okrsdoitung`
- **User**: `root`
- **Password**: `` (empty)
- **Host**: `localhost`
- **Port**: `3306`
- **Charset**: `utf8mb4`
- **Collation**: `utf8mb4_unicode_ci`

---

## วิธีที่ 1: ใช้ SQL Script (แนะนำ)

### 1. เปิด MySQL Command Line หรือ phpMyAdmin

#### ผ่าน Laragon Terminal:
1. เปิด Laragon
2. คลิกขวาที่ Laragon → MySQL → MySQL Console
3. หรือเปิด Terminal ใน Laragon แล้วพิมพ์: `mysql -u root`

#### ผ่าน phpMyAdmin:
1. เปิด Laragon
2. คลิกขวาที่ Laragon → Database → phpMyAdmin
3. ไปที่ tab "SQL"

### 2. รัน SQL Script

```sql
CREATE DATABASE IF NOT EXISTS `okrsdoitung` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- ตรวจสอบว่า database ถูกสร้างแล้ว
SHOW DATABASES LIKE 'okrsdoitung';

-- ใช้ database
USE `okrsdoitung`;
```

---

## วิธีที่ 2: ใช้ Batch Script (Windows)

### 1. ตรวจสอบ MySQL Path

เปิดไฟล์ `scripts/setup-database.bat` และตรวจสอบว่า MySQL path ถูกต้อง:

```batch
set MYSQL_PATH=D:\laragon\bin\mysql\mysql-8.0.30\bin
```

**ปรับตาม MySQL version ที่คุณใช้** เช่น:
- `mysql-8.0.30`
- `mysql-8.0.31`
- `mysql-8.0.32`

### 2. รัน Batch Script

```bash
# Double click หรือรันผ่าน Command Prompt
scripts\setup-database.bat
```

---

## วิธีที่ 3: ใช้ Node.js Script (Auto-detect)

### 1. ติดตั้ง mysql2 (ถ้ายังไม่มี)

```bash
npm install mysql2 --save-dev
```

### 2. รัน Script

```bash
node scripts/check-database.js
```

Script นี้จะ:
- เชื่อมต่อ MySQL
- ตรวจสอบว่า database มีอยู่แล้วหรือไม่
- สร้าง database ถ้ายังไม่มี
- แจ้งเตือนถ้าเกิด error

---

## วิธีที่ 4: ใช้ Prisma (แนะนำที่สุด)

### 1. ตรวจสอบ .env file

สร้างไฟล์ `.env` จาก `.env.example`:

```bash
cp .env.example .env
```

ตรวจสอบว่า `DATABASE_URL` ถูกต้อง:

```env
DATABASE_URL="mysql://root:@localhost:3306/okrsdoitung"
```

### 2. Generate Prisma Client

```bash
npm run db:generate
```

### 3. สร้าง Database และ Tables

Prisma จะสร้าง database ให้อัตโนมัติเมื่อรัน migrations:

```bash
# สร้าง database และ run migrations (จะสร้าง tables ทั้งหมด)
npm run db:migrate

# หรือใช้ db push (สำหรับ development - ไม่ต้องสร้าง migration files)
npm run db:push
```

### 4. Seed ข้อมูลเริ่มต้น

```bash
npm run db:seed
```

---

## วิธีที่ 5: ใช้ Setup Script ทั้งหมด

รันคำสั่งเดียว (จะตรวจสอบ, สร้าง database, generate client, push schema, และ seed):

```bash
npm run db:setup
```

**หมายเหตุ**: ต้องติดตั้ง `mysql2` ก่อน:
```bash
npm install mysql2 --save-dev
```

---

## ตรวจสอบว่า Database ถูกสร้างแล้ว

### ผ่าน MySQL Command Line:

```sql
SHOW DATABASES;
USE okrsdoitung;
SHOW TABLES;
```

### ผ่าน phpMyAdmin:

1. เปิด phpMyAdmin
2. ดูใน sidebar ว่ามี `okrsdoitung` อยู่หรือไม่
3. คลิกเข้าไปดู tables

### ผ่าน Prisma Studio:

```bash
npm run db:studio
```

---

## Troubleshooting

### Error: Access denied

**ปัญหา**: MySQL user ไม่มีสิทธิ์สร้าง database

**วิธีแก้**:
1. ตรวจสอบว่า user `root` มี password หรือไม่
2. ถ้ามี password ให้อัปเดต `.env`:
   ```env
   DATABASE_URL="mysql://root:yourpassword@localhost:3306/okrsdoitung"
   ```

### Error: Can't connect to MySQL server

**ปัญหา**: MySQL ไม่ได้รัน

**วิธีแก้**:
1. เปิด Laragon
2. คลิก Start (ถ้า MySQL ยังไม่ได้ start)
3. รอให้ MySQL status เป็น "Running"

### Error: Database already exists

**ไม่เป็นไร** - Database มีอยู่แล้ว สามารถข้ามขั้นตอนนี้ได้

### Error: Prisma migrate error

**วิธีแก้**:
1. ตรวจสอบ `.env` file ว่า `DATABASE_URL` ถูกต้อง
2. ตรวจสอบว่า MySQL รันอยู่
3. ลองใช้ `db:push` แทน `db:migrate`:
   ```bash
   npm run db:push
   ```

---

## ข้อมูลเพิ่มเติม

### Default Users (หลังจาก seed)

| Email | Password | Role |
|-------|----------|------|
| admin@local | Admin123 | ADMIN |
| leader@example.com | Leader123 | SCHOOL_LEADER, TEACHER |
| teacher@example.com | Teacher123 | TEACHER |

### Database Schema

ดู schema ได้ที่ `schema.prisma`

### Database Migrations

- Migrations จะถูกเก็บใน `prisma/migrations/`
- สามารถดู history ของ migrations ได้
- สามารถ reset database ได้ด้วย: `npm run db:reset`

---

## Quick Start

```bash
# 1. สร้าง .env file
cp .env.example .env

# 2. Setup database (สร้าง database, generate client, push schema, seed)
npm run db:setup

# 3. Start development server
npm run dev
```

---

**อัปเดตล่าสุด**: 2024

