# ui-spec.md

## Global UI

- Font: ใช้ Kanit เป็นหลัก
- Theme: โทนฟ้า – ม่วง – ขาว อ่านง่าย สบายตา
- Navigation bar (ด้านบนหรือด้านซ้าย):
  - โลโก้โรงเรียน / ระบบ
  - เมนู: Dashboard, Evaluations, Instruments, OKRs, Reports, Admin
- Footer: ชื่อโรงเรียน + เวอร์ชันระบบ

---

## 1. Dashboard (`/dashboard`)

### Layout

- Top Bar:
  - Title: "แดชบอร์ดการประเมินโรงเรียนคุณภาพ (RBM & Q-Model)"
  - Filter Row:
    - Select: ระดับการรวม (Level): โรงเรียน | เครือข่าย | ทั้งระบบ
    - Select: เครือข่าย (Network) - แสดงเมื่อ Level = เครือข่าย
    - Select: โรงเรียน (School) - แสดงเมื่อ Level = โรงเรียน
    - Select: ปีการศึกษา (Academic Year)
    - Select: ภาคเรียน (Term) - Optional
    - Select: ประเภทแบบประเมิน (All, DERS, ภาษาไทย ป.1-3, Q-Model)
    - Select: มิติ Q (All, Q-Leadership, Q-PLC, Q-Learning, Q-Goal, Q-Info, Q-Network)
    - Button: "เปรียบเทียบ (Compare)" - เปิดหน้า comparison

- Section 1: KPI Cards (4–6 ใบ)
  - Card 1: `% การทำแบบประเมินสำเร็จ`
  - Card 2: `คะแนนเฉลี่ย Q-Leadership`
  - Card 3: `คะแนนเฉลี่ย Q-Learning`
  - Card 4: `% KR ที่อยู่ในระดับสีเขียว (บรรลุเป้าหมาย)`

- Section 2: Charts
  - Chart 1: Bar chart แสดงคะแนนเฉลี่ยแต่ละ Q (6 แท่ง)
  - Chart 2: Radar chart เปรียบเทียบ:
    - DERS vs Thai P.1–3 vs Q-Model (เฉลี่ย normalized 0–100)
  - Chart 3: Line chart แสดงแนวโน้มคะแนนเฉลี่ย Q-Model ตามเวลา (เทอม / ปี)

- Section 3: Table “ตัวชี้วัดที่ควรเร่งพัฒนา”
  - Columns:
    - Instrument
    - Section
    - Indicator (ข้อความย่อ)
    - ค่าเฉลี่ย
    - เป้า (ถ้ามี)
    - สถานะ (สีแดง/เหลือง/เขียว)
  - Sort by: ค่าคะแนนจากต่ำไปสูง

- Section 4: Recent Evaluations
  - List card:
    - ชื่อแบบประเมิน
    - ครู/หน่วยเป้าหมาย
    - วันที่ประเมิน
    - สถานะ

---

## 1.1 Dashboard Comparison View (`/dashboard/comparison`)

### Layout

- Top Bar:
  - Title: "เปรียบเทียบผลการประเมิน"
  - Button: "กลับไปแดชบอร์ด"
  - Comparison Type Selector:
    - Radio: โรงเรียน vs โรงเรียน
    - Radio: เครือข่าย vs เครือข่าย
    - Radio: โรงเรียนเดียวกันหลายปี

- Comparison Configuration:
  - Type: School vs School
    - Select: โรงเรียนที่ 1 (School 1)
    - Select: โรงเรียนที่ 2 (School 2)
    - Select: ปีการศึกษา
    - Select: ภาคเรียน (Optional)
  - Type: Network vs Network
    - Select: เครือข่ายที่ 1 (Network 1)
    - Select: เครือข่ายที่ 2 (Network 2)
    - Select: ปีการศึกษา
    - Select: ภาคเรียน (Optional)
  - Type: Same School Across Years
    - Select: โรงเรียน
    - Select: ปีการศึกษา (Multiple select หรือ Range)
    - Select: ภาคเรียน (Optional)

- Section 1: Side-by-Side KPI Cards
  - Left: School/Network/Year 1 KPI Cards
  - Right: School/Network/Year 2 KPI Cards
  - Difference indicators: +X%, -X%, หรือ เท่ากัน

- Section 2: Comparison Charts
  - Chart 1: Side-by-Side Bar Chart
    - แสดง Q-Model Progress เปรียบเทียบกัน
    - สีต่างกันสำหรับแต่ละโรงเรียน/เครือข่าย/ปี
  - Chart 2: Overlay Line Chart (สำหรับ Year-over-Year)
    - เส้นหลายเส้นแสดงแนวโน้มแต่ละปี
  - Chart 3: Difference Heatmap
    - ตารางแสดงความแตกต่าง (+, -, 0) ในแต่ละมิติ Q

- Section 3: Detailed Comparison Table
  - Columns:
    - Indicator/Section
    - Value 1 (School/Network/Year 1)
    - Value 2 (School/Network/Year 2)
    - Difference (Delta)
    - Status (Better, Worse, Same)
  - Sort by: Difference (absolute value)

- Section 4: Summary Insights
  - Bullet points แสดงจุดเด่น/จุดด้อย
  - แนะนำ Action Items (ถ้ามี)

---

## 2. Instruments (`/instruments`, `/instruments/[id]`)

### `/instruments`
- ตาราง:
  - Code
  - ชื่อแบบประเมิน (TH)
  - ประเภท (DERS, THAI_P1_3, Q_MODEL)
  - Version
  - ปุ่ม: ดูรายละเอียด

### `/instruments/[id]`
- แสดงข้อมูล:
  - ชื่อ TH / EN
  - คำอธิบาย
  - ประเภท
- แสดงแท็บ:
  - แท็บ 1: Sections
    - รายชื่อ section + จำนวน indicators
  - แท็บ 2: Indicators
    - ตาราง:
      - itemCode
      - section
      - ข้อความตัวชี้วัด (ตัดให้สั้น + tooltip)
      - scaleType (1–4, 1–5, ฯลฯ)

---

## 3. Evaluations (`/evaluations`, `/evaluations/new`, `/evaluations/[id]`)

### `/evaluations`
- Filter:
  - Instrument
  - โรงเรียน
  - ปีการศึกษา
  - สถานะ (Draft/Submitted/Reviewed)
- Table:
  - ID
  - แบบประเมิน
  - ครูเป้าหมาย / โรงเรียนเป้าหมาย
  - ปี/เทอม
  - สถานะ
  - ปุ่ม "เปิด"

### `/evaluations/new`
- Step Form:
  - Step 1: เลือกแบบประเมิน (DERS / THAI_P1_3 / Q-Model)
  - Step 2: เลือกโรงเรียน
  - Step 3: เลือก ผู้ถูกประเมิน (ครู / โรงเรียน)
  - Step 4: เลือก ปีการศึกษา / ภาคเรียน
  - ปุ่ม "สร้างแบบประเมิน"

### `/evaluations/[id]` (หน้ากรอกคะแนน)
- Header:
  - ชื่อแบบประเมิน
  - โรงเรียน / ครูเป้าหมาย
  - ปีการศึกษา / เทอม
  - สถานะ (Draft/Submitted)
- Body:
  - Tabs หรือ Accordion แยกตาม Section:
    - เช่น: "สภาพแวดล้อมห้องเรียน", "ผู้เรียน", "ผู้สอน", "Q-Leadership" ฯลฯ
  - ในแต่ละ Section:
    - แสดงรายการ Indicator:
      - ข้อความ TH (EN เล็ก ๆ ใต้บรรทัด)
      - Likert Radio: 1 2 3 4 หรือ 1–5 ตาม scale
      - ช่อง comment (optional)
  - Footer:
    - ปุ่ม "บันทึกชั่วคราว (Draft)"
    - ปุ่ม "ส่งแบบประเมิน (Submit)"

---

## 4. OKRs (`/okrs`, `/okrs/[id]`)

### `/okrs`
- Filter: โรงเรียน, ปีการศึกษา, Quarter, Dimension (Q-Leadership, ฯลฯ)
- List Objective:
  - Code
  - Title
  - Dimension
  - Owner
  - Progress bar (คำนวณจาก KRs)

### `/okrs/[id]`
- Header:
  - Objective Title (+ Dimension tag)
  - Owner, โรงเรียน, ปีการศึกษา, Quarter
- Body:
  - List of KRs:
    - Title
    - Baseline / Target / Current
    - Unit
    - Progress bar + Status color (Green/Yellow/Red)
    - Badges: Linked Instruments (เช่น Q-Model, DERS)
  - Expand KR:
    - แสดง Actions (ตารางย่อย: ชื่อ, Owner, Status, ช่วงเวลา)
    - Evidence List (ไฟล์/ลิงก์/บันทึก)
  - ปุ่มเพิ่ม KR / Action / Evidence

---

## 5. Reports (`/reports`)

- ให้มองเป็นศูนย์กลาง “อ่าน-ตีความ” ผลการประเมิน
- Tab:
  - Q-Model Overview
  - DERS Classroom
  - Thai P.1–3
  - OKR Progress

แต่ละแท็บมี:
- แผนภูมิภาพรวม
- ตารางตัวชี้วัดที่เด่น/ต่ำ
- ปุ่ม Export (CSV/PDF ในอนาคต)
