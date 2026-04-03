# Action Rating Schema Documentation

## ภาพรวม (Overview)

Model `OKRActionRating` ใช้สำหรับเก็บการประเมินแต่ละ Key Action (KA) แบบ rating scale 5 ระดับ โดยมี 2 ค่า:

1. **currentState (สภาพที่เป็นอยู่)** - การประเมินสภาพปัจจุบันก่อนดำเนินการ
2. **desiredState (สภาพที่คาดหมาย)** - การประเมินสภาพที่คาดหวังหลังดำเนินการ

---

## Schema Structure

```prisma
model OKRActionRating {
  id          Int       @id @default(autoincrement())
  actionId    Int       // FK to OKRAction
  
  // การประเมินสภาพที่เป็นอยู่ (Current State / Before)
  currentState Int      // Rating 1-5: สภาพที่เป็นอยู่ก่อนดำเนินการ
  
  // การประเมินสภาพที่คาดหมาย (Desired State / After)
  desiredState Int      // Rating 1-5: สภาพที่คาดหมายหลังดำเนินการ
  
  comment     String?   // ข้อความเพิ่มเติม (optional)
  
  // Context
  evaluatorId Int       // User ที่ประเมิน
  schoolId    Int?      // โรงเรียนที่ประเมิน (optional)
  academicYearId Int?   // ปีการศึกษา (optional)
  termId      Int?      // ภาคเรียน (optional)
  
  evaluatedAt DateTime  @default(now()) // วันที่ประเมิน
  
  // Relations
  action      OKRAction      @relation(...)
  evaluator   User           @relation(...)
  school      School?        @relation(...)
  academicYear AcademicYear? @relation(...)
  term        Term?          @relation(...)
  
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}
```

---

## Rating Scale (1-5)

### ระดับ 5 (สูงสุด)
- สภาพที่เป็นอยู่: ดีมาก / มีอยู่แล้ว / ทำได้ดีแล้ว
- สภาพที่คาดหมาย: ดีเยี่ยม / เป็นแบบอย่าง / สมบูรณ์แบบ

### ระดับ 4 (ดี)
- สภาพที่เป็นอยู่: ดี / มีอยู่บ้าง / ทำได้ดี
- สภาพที่คาดหมาย: ดีมาก / มาตรฐานสูง

### ระดับ 3 (ปานกลาง)
- สภาพที่เป็นอยู่: ปานกลาง / มีบางส่วน / กำลังพัฒนาอยู่
- สภาพที่คาดหมาย: ปานกลาง-ดี / ตามมาตรฐาน

### ระดับ 2 (น้อย)
- สภาพที่เป็นอยู่: น้อย / เพิ่งเริ่ม / ยังไม่ชัดเจน
- สภาพที่คาดหมาย: ดีขึ้น / พัฒนาแล้ว

### ระดับ 1 (ต่ำสุด)
- สภาพที่เป็นอยู่: ไม่มี / ยังไม่เริ่ม / ไม่ชัดเจน
- สภาพที่คาดหมาย: เริ่มมี / พัฒนาแล้วบ้าง

---

## ตัวอย่างการใช้งาน

### ตัวอย่างที่ 1: การประเมิน Action ก่อนเริ่มดำเนินการ

```json
{
  "actionId": 1,
  "currentState": 1,  // ยังไม่เริ่ม
  "desiredState": 5,  // ต้องการให้ดีเยี่ยม
  "comment": "ยังไม่มีการประชุม ต้องจัดให้ครบทุกฝ่าย",
  "evaluatorId": 1,
  "schoolId": 1,
  "academicYearId": 1,
  "termId": 1
}
```

### ตัวอย่างที่ 2: การประเมินระหว่างดำเนินการ

```json
{
  "actionId": 2,
  "currentState": 3,  // กำลังดำเนินการอยู่
  "desiredState": 4,  // ต้องการให้ดีขึ้น
  "comment": "เริ่มทำ Canvas แล้ว แต่ยังไม่ครบทุกห้อง",
  "evaluatorId": 1,
  "schoolId": 1,
  "academicYearId": 1,
  "termId": 1
}
```

### ตัวอย่างที่ 3: การประเมินหลังดำเนินการเสร็จ

```json
{
  "actionId": 3,
  "currentState": 4,  // ดำเนินการเสร็จแล้วดี
  "desiredState": 4,  // ตรงตามเป้าหมาย
  "comment": "คณะทำงานทำได้ดี หลักสูตรใหม่เสร็จสมบูรณ์",
  "evaluatorId": 1,
  "schoolId": 1,
  "academicYearId": 1,
  "termId": 1
}
```

---

## API Endpoints

### GET `/api/okrs/actions/:id/ratings`

ดึงรายการการประเมินทั้งหมดของ Action นี้

**Query Parameters:**
- `schoolId` - กรองตามโรงเรียน
- `academicYearId` - กรองตามปีการศึกษา
- `termId` - กรองตามภาคเรียน
- `evaluatorId` - กรองตามผู้ประเมิน
- `page` - หน้า (default: 1)
- `limit` - จำนวนต่อหน้า (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "actionId": 1,
        "currentState": 2,
        "desiredState": 5,
        "comment": "ยังไม่มีการประชุม",
        "evaluatorId": 1,
        "schoolId": 1,
        "academicYearId": 1,
        "termId": 1,
        "evaluatedAt": "2024-05-01T00:00:00.000Z",
        "evaluator": {
          "id": 1,
          "name": "Admin User",
          "email": "admin@local"
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### POST `/api/okrs/actions/:id/ratings`

สร้างการประเมินใหม่สำหรับ Action

**Request Body:**
```json
{
  "currentState": 2,      // Required: 1-5
  "desiredState": 5,      // Required: 1-5
  "comment": "ข้อความเพิ่มเติม",  // Optional
  "schoolId": 1,          // Optional
  "academicYearId": 1,    // Optional
  "termId": 1             // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "actionId": 1,
    "currentState": 2,
    "desiredState": 5,
    "comment": "ข้อความเพิ่มเติม",
    "evaluatorId": 1,
    "evaluatedAt": "2024-05-01T00:00:00.000Z"
  },
  "message": "บันทึกการประเมิน Action สำเร็จ"
}
```

---

## การใช้งานใน Dashboard

### คำนวณค่าเฉลี่ย Rating

สำหรับแต่ละ Action สามารถคำนวณ:
- `averageCurrentState` - ค่าเฉลี่ยสภาพที่เป็นอยู่
- `averageDesiredState` - ค่าเฉลี่ยสภาพที่คาดหมาย
- `gap` = `averageDesiredState - averageCurrentState` - ช่องว่างระหว่างปัจจุบันกับเป้าหมาย

### แสดงผลใน Dashboard

- **Progress Bar**: แสดง `currentState` vs `desiredState`
- **Gap Analysis**: แสดงช่องว่างที่ต้องพัฒนา
- **Trend Chart**: แสดงการเปลี่ยนแปลงตามเวลา (ถ้ามีการประเมินหลายครั้ง)

---

## ตัวอย่างการใช้งานใน Frontend

### ฟอร์มการประเมิน Action

```tsx
// Form สำหรับประเมิน Action
<form onSubmit={handleSubmit}>
  <div>
    <label>สภาพที่เป็นอยู่ (Current State)</label>
    <RadioGroup value={currentState} onChange={setCurrentState}>
      <Radio value={1}>1 - ไม่มี / ยังไม่เริ่ม</Radio>
      <Radio value={2}>2 - น้อย / เพิ่งเริ่ม</Radio>
      <Radio value={3}>3 - ปานกลาง</Radio>
      <Radio value={4}>4 - ดี</Radio>
      <Radio value={5}>5 - ดีเยี่ยม</Radio>
    </RadioGroup>
  </div>
  
  <div>
    <label>สภาพที่คาดหมาย (Desired State)</label>
    <RadioGroup value={desiredState} onChange={setDesiredState}>
      <Radio value={1}>1 - เริ่มมี</Radio>
      <Radio value={2}>2 - ดีขึ้น</Radio>
      <Radio value={3}>3 - ปานกลาง-ดี</Radio>
      <Radio value={4}>4 - ดีมาก</Radio>
      <Radio value={5}>5 - ดีเยี่ยม</Radio>
    </RadioGroup>
  </div>
  
  <div>
    <label>ความคิดเห็น (Comment)</label>
    <textarea value={comment} onChange={setComment} />
  </div>
  
  <button type="submit">บันทึกการประเมิน</button>
</form>
```

### แสดงผล Rating

```tsx
// Card แสดง Action พร้อม Ratings
<div className="action-card">
  <h3>{action.title}</h3>
  
  <div className="ratings">
    <div>
      <label>สภาพที่เป็นอยู่</label>
      <ProgressBar value={action.averageCurrentState} max={5} />
      <span>{action.averageCurrentState?.toFixed(1)} / 5.0</span>
    </div>
    
    <div>
      <label>สภาพที่คาดหมาย</label>
      <ProgressBar value={action.averageDesiredState} max={5} />
      <span>{action.averageDesiredState?.toFixed(1)} / 5.0</span>
    </div>
    
    <div>
      <label>ช่องว่าง (Gap)</label>
      <span>
        {action.averageDesiredState && action.averageCurrentState
          ? (action.averageDesiredState - action.averageCurrentState).toFixed(1)
          : '-'}
      </span>
    </div>
  </div>
  
  <button onClick={() => openRatingForm(action.id)}>
    ประเมิน Action นี้
  </button>
</div>
```

---

## การวิเคราะห์ข้อมูล

### Gap Analysis

คำนวณช่องว่างระหว่างสภาพปัจจุบันกับสภาพที่คาดหมาย:
```
gap = desiredState - currentState
```

- `gap > 0`: ยังไม่บรรลุเป้าหมาย
- `gap = 0`: บรรลุเป้าหมายแล้ว
- `gap < 0`: เกินเป้าหมาย

### Progress Calculation

คำนวณ % ความก้าวหน้า:
```
progress = (currentState / desiredState) * 100
```

- `progress >= 100%`: บรรลุหรือเกินเป้าหมาย
- `progress >= 80%`: ใกล้เป้าหมาย
- `progress < 80%`: ต้องพัฒนาต่อ

---

## Best Practices

1. **ประเมินเป็นระยะ**: ประเมิน Action อย่างสม่ำเสมอ (เช่น ทุกเดือน หรือทุกเทอม)
2. **บันทึกความคิดเห็น**: ใส่ comment เพื่ออธิบายเหตุผลของ rating
3. **เปรียบเทียบก่อน-หลัง**: ดูการเปลี่ยนแปลงจากการประเมินครั้งก่อน
4. **ใช้ Context**: บันทึก schoolId, academicYearId, termId เพื่อการวิเคราะห์ภายหลัง

---

**อัปเดตล่าสุด**: 2024

