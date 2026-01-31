# 🧪 EQAP Testing Guide

## คู่มือการทดสอบระบบ

---

## 🚀 การติดตั้ง Testing Tools

```bash
# Install testing dependencies (already in package.json)
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

---

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- auth.test.ts
```

---

## 📋 Test Accounts

### Super Admin
- Email: `superadmin@example.com`
- Password: `password123`
- สิทธิ์: ทุกอย่าง

### Office Admin
- Email: `officeadmin1@example.com`
- Password: `password123`
- สิทธิ์: จัดการในสำนักงานเขตของตน

### Network Admin
- Email: `networkadmin1@example.com`
- Password: `password123`
- สิทธิ์: จัดการในเครือข่ายของตน

### School Director
- Email: `director1@example.com`
- Password: `password123`
- สิทธิ์: ทำแบบประเมิน, ดู Dashboard โรงเรียนของตน

### Teacher
- Email: `teacher1@example.com`
- Password: `password123`
- สิทธิ์: ทำแบบประเมินโรงเรียนของตน

---

## ✅ Manual Testing Checklist

### 1. Authentication Module
- [ ] ลงทะเบียนผู้ใช้ใหม่
- [ ] เข้าสู่ระบบ (ทุก role)
- [ ] ออกจากระบบ
- [ ] Refresh token
- [ ] ป้องกัน routes ที่ไม่มีสิทธิ์

### 2. Assessment Module
- [ ] สร้างแบบประเมินใหม่
- [ ] ทำแบบประเมิน 47 ข้อ
- [ ] Auto-save ทำงาน (รอ 30 วินาที)
- [ ] Resume งาน (ปิด-เปิดหน้าใหม่)
- [ ] แนบหลักฐาน (รูป, PDF, Word)
- [ ] ส่งแบบประเมิน
- [ ] ดูรายละเอียดแบบประเมินที่ส่งแล้ว
- [ ] ลบแบบประเมินแบบ Draft

### 3. Dashboard Module
- [ ] ดู Summary Cards (สถิติ)
- [ ] ดู Radar Chart (4 มิติ)
- [ ] ดู Comparison Chart (หลายปี)
- [ ] กรองข้อมูลตามปีการศึกษา
- [ ] กรองข้อมูลตามโรงเรียน (Admin)
- [ ] Export รายงาน Excel

### 4. Admin Module (Super Admin/Office Admin)
- [ ] จัดการผู้ใช้ (CRUD)
- [ ] จัดการโรงเรียน (CRUD)
- [ ] จัดการเครือข่าย (CRUD)
- [ ] จัดการสำนักงานเขต (CRUD)
- [ ] จัดการปีการศึกษา/ภาคเรียน
- [ ] จัดการตัวชี้วัด

### 5. Role-Based Access Control
- [ ] Super Admin เข้าถึงทุกอย่างได้
- [ ] Office Admin เห็นเฉพาะเขตของตน
- [ ] Network Admin เห็นเฉพาะเครือข่ายของตน
- [ ] School Director เห็นเฉพาะโรงเรียนของตน
- [ ] Teacher ทำแบบประเมินโรงเรียนของตนได้
- [ ] Viewer ดูข้อมูลได้อย่างเดียว

---

## 🎯 Test Scenarios

### Scenario 1: ผู้อำนวยการสร้างแบบประเมิน
1. Login ด้วย `director1@example.com`
2. ไปที่ Assessment → สร้างแบบประเมินใหม่
3. เลือกปีการศึกษา 2567
4. ทำแบบประเมิน 47 ข้อ
5. แนบหลักฐานอย่างน้อย 1 ไฟล์
6. ส่งแบบประเมิน

**Expected:** 
- สร้างสำเร็จ
- Auto-save ทำงาน
- ส่งสำเร็จ
- ไม่สามารถแก้ไขหลังส่ง

### Scenario 2: Admin ดูภาพรวม
1. Login ด้วย `superadmin@example.com`
2. ไปที่ Dashboard
3. ดูสถิติทั้งหมด
4. เลือกกรองตามโรงเรียน
5. Export รายงาน Excel

**Expected:**
- เห็นข้อมูลทุกโรงเรียน
- กรองทำงานถูกต้อง
- Radar Chart แสดงผล
- Export สำเร็จ

### Scenario 3: Multi-Year Comparison
1. สร้างแบบประเมินหลายปี (2566, 2567)
2. ส่งแบบประเมินทั้งหมด
3. ไปที่ Dashboard
4. ดู Comparison Chart

**Expected:**
- แสดงกราฟเปรียบเทียบ
- คะแนนแต่ละปีแสดงถูกต้อง

---

## 🔍 API Testing

### ใช้ Postman หรือ cURL

**1. Login**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@example.com",
    "password": "password123"
  }'
```

**2. Get Assessments**
```bash
curl http://localhost:3000/api/assessments \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**3. Get Dashboard Stats**
```bash
curl http://localhost:3000/api/dashboard/stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## ⚡ Performance Testing

### Load Testing with Apache Bench
```bash
# Test login endpoint (100 requests, 10 concurrent)
ab -n 100 -c 10 -p login.json -T application/json \
  http://localhost:3000/api/auth/login

# Test dashboard
ab -n 100 -c 10 -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/dashboard/stats
```

### Expected Performance:
- Login: < 200ms
- List assessments: < 300ms
- Dashboard stats: < 500ms
- Assessment form load: < 1s

---

## 🐛 Common Issues & Solutions

### Issue: Auto-save ไม่ทำงาน
**Solution:**
- เช็ค console browser
- ตรวจสอบ access token
- เช็ค network tab ว่า API ถูกเรียกหรือไม่

### Issue: Radar Chart ไม่แสดงผล
**Solution:**
- ตรวจสอบว่ามีข้อมูล assessment ที่ status = SUBMITTED
- เช็ค console errors
- ตรวจสอบ Recharts version

### Issue: File upload ล้มเหลว
**Solution:**
- ตรวจสอบขนาดไฟล์ (max 10MB)
- ตรวจสอบ file type
- สร้างโฟลเดอร์ `public/uploads/evidence`
- ตรวจสอบ permissions

---

## 📊 Test Coverage Goals

- API Routes: > 80%
- Components: > 70%
- Utilities: > 90%
- Overall: > 75%

---

## 🔄 Continuous Testing

```bash
# Run tests before commit
npm test

# Check types
npm run type-check

# Lint code
npm run lint

# Full check
npm test && npm run type-check && npm run lint
```

---

## ✅ Pre-Deployment Testing

1. [ ] All tests pass
2. [ ] No TypeScript errors
3. [ ] No ESLint errors
4. [ ] Database migrations work
5. [ ] Seed data loads correctly
6. [ ] Authentication works all roles
7. [ ] Assessment form works end-to-end
8. [ ] Dashboard displays correctly
9. [ ] Admin functions work
10. [ ] Export functions work
11. [ ] File uploads work
12. [ ] Mobile responsive
13. [ ] Cross-browser compatible

---

## 📱 Browser Compatibility Testing

**Support:**
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Android)

**Test:**
- [ ] Login/Signup works
- [ ] Assessment form usable on mobile
- [ ] Charts display correctly
- [ ] Tables are scrollable
- [ ] Modals work properly

---

## 💾 Backup Testing

```bash
# Backup database
mysqldump -u root -p eqap > backup_$(date +%Y%m%d).sql

# Restore database
mysql -u root -p eqap < backup_20260125.sql
```

---

## 📝 Test Data

หลัง seed database จะมี:
- 2 สำนักงานเขต
- 4 เครือข่าย
- 8 โรงเรียน
- 2 ปีการศึกษา
- 2 ภาคเรียน
- 47 ตัวชี้วัด (4 กลุ่ม)
- 8 ผู้ใช้ (ทุก role)

ใช้ข้อมูลนี้สำหรับทดสอบ!
