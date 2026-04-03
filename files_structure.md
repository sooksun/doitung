apps/frontend/
  app/
    layout.tsx
    page.tsx               # redirect -> /dashboard
    dashboard/page.tsx
    instruments/page.tsx
    instruments/[id]/page.tsx
    evaluations/page.tsx
    evaluations/new/page.tsx
    evaluations/[id]/page.tsx
    okrs/page.tsx
    okrs/[id]/page.tsx
    reports/page.tsx
  lib/
    api.ts                 # helper call NestJS API
  components/
    Layout.tsx
    KpiCard.tsx
    ChartPlaceholder.tsx


//โครง NestJS Backend

apps/backend/
  src/
    app.module.ts
    prisma/
      prisma.service.ts
    instruments/
      instruments.module.ts
      instruments.controller.ts
      instruments.service.ts
      dto/
    evaluations/
      evaluations.module.ts
      evaluations.controller.ts
      evaluations.service.ts
    okrs/
      okrs.module.ts
      okrs.controller.ts
      okrs.service.ts
    dashboard/
      dashboard.module.ts
      dashboard.controller.ts
      dashboard.service.ts





// example page

// app/layout.tsx

// apps/frontend/app/layout.tsx
import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'School QA & RBM Dashboard',
  description: 'DERS / Thai P.1–3 / Q-Model',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-50 text-slate-900" style={{ fontFamily: 'Kanit, sans-serif' }}>
        <div className="min-h-screen flex">
          {/* Simple sidebar */}
          <aside className="w-64 bg-indigo-900 text-white p-4 hidden md:block">
            <h1 className="font-semibold text-xl mb-6">School QA • RBM</h1>
            <nav className="space-y-2 text-sm">
              <a href="/dashboard" className="block hover:bg-indigo-800 rounded px-2 py-2">
                แดชบอร์ด
              </a>
              <a href="/evaluations" className="block hover:bg-indigo-800 rounded px-2 py-2">
                แบบประเมิน
              </a>
              <a href="/instruments" className="block hover:bg-indigo-800 rounded px-2 py-2">
                แบบเครื่องมือ
              </a>
              <a href="/okrs" className="block hover:bg-indigo-800 rounded px-2 py-2">
                OKRs & RBM
              </a>
              <a href="/reports" className="block hover:bg-indigo-800 rounded px-2 py-2">
                รายงาน
              </a>
            </nav>
          </aside>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}


//
//ตัวอย่างหน้า /dashboard (app/dashboard/page.tsx)

// apps/frontend/app/dashboard/page.tsx
import React from 'react';

export default async function DashboardPage() {
  // TODO: fetch summary data from NestJS: /dashboard/summary
  // const data = await fetch(...)

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold mb-2">แดชบอร์ดโรงเรียนคุณภาพ</h2>

      {/* Filters */}
      <section className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4">
        <select className="border rounded px-2 py-1 text-sm">
          <option>โรงเรียนบ้านพญาไพร</option>
        </select>
        <select className="border rounded px-2 py-1 text-sm">
          <option>ปีการศึกษา 2568</option>
        </select>
        <select className="border rounded px-2 py-1 text-sm">
          <option>ภาคเรียน 1/2568</option>
        </select>
        <select className="border rounded px-2 py-1 text-sm">
          <option>ทุกแบบประเมิน</option>
          <option>DERS</option>
          <option>ภาษาไทย ป.1–3</option>
          <option>Q-Model</option>
        </select>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['การทำแบบประเมิน', 'Q-Leadership', 'Q-Learning', 'KR สีเขียว'].map((label) => (
          <div key={label} className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-slate-500">{label}</div>
            <div className="text-2xl font-semibold mt-2">–</div>
          </div>
        ))}
      </section>

      {/* Chart placeholders */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4 h-64">
          <div className="text-sm font-semibold mb-2">คะแนนเฉลี่ยตามมิติ Q-Model</div>
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            (ใส่กราฟแท่ง Q-Leadership, Q-PLC, Q-Learning, Q-Goal, Q-Info, Q-Network)
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 h-64">
          <div className="text-sm font-semibold mb-2">เปรียบเทียบ DERS / ภาษาไทย ป.1–3 / Q-Model</div>
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            (ใส่กราฟเรดาร์)
          </div>
        </div>
      </section>
    </div>
  );
}


//สูตรคำนวณ RBM (% สำเร็จของ KR/Objective จากคะแนน indicator จริง)

0. ตั้งหลักก่อน – เราจะเอา “คะแนนจริง → % ความก้าวหน้า RBM” ยังไง?

เรามี 3 ชั้นข้อมูล:

Indicator

มี minScore, maxScore, ScaleType

มี EvaluationResponse.score หลายตัว (ประเมินหลายครั้ง/หลายคน)

OKRKeyResult

ผูกกับ Indicator ผ่าน OKRKeyResultIndicator (มี weight ด้วย)

มี baseline, target, current, unit

OKRObjective

ผูกกับ KR หลายตัว

ใช้ค่า progress ของ KR มารวมเป็นภาพรวม

แนวคิดคือ:

ชั้นล่างสุด: แปลงคะแนนของ indicator แต่ละข้อ → ค่า % (0–100)

ชั้นกลาง: รวม % ของ indicators ที่ผูกกับ KR → ได้ current ของ KR (0–100)

ชั้นบน: เทียบ current กับ baseline / target → % ความก้าวหน้า (0–100%) ของ KR

แล้วค่อยเอา KR หลายตัวมารวมเป็น % ของ Objective อีกที

1. ขั้นที่ 1: แปลงคะแนนตัวชี้วัดเป็นเปอร์เซ็นต์

สำหรับ Indicator แต่ละข้อ i:

หาค่าเฉลี่ยคะแนนของช่วงเวลาที่สนใจ
(เช่น ปี 2568 เทอม 1 โรงเรียน X):

\text{avg\_score}_i = \frac{\sum_{r \in responses_i} score_r}{\text{จำนวน responses_i}}

Normalize ให้เป็น 0–100 โดยใช้ min/max ของตัวชี้วัดนั้น:

indicator_percent
𝑖
=
avg_score
𝑖
−
minScore
𝑖
maxScore
𝑖
−
minScore
𝑖
×
100
indicator_percent
i
	​

=
maxScore
i
	​

−minScore
i
	​

avg_score
i
	​

−minScore
i
	​

	​

×100

ถ้า scale 1–5 → (เฉลี่ย − 1)/4×100

ถ้า scale 1–4 → (เฉลี่ย − 1)/3×100

Note: ถ้าไม่มี response เลย → ให้ indicator_percent_i = null แล้วจัดการในขั้นถัดไป (เช่น ไม่เอามาคิด หรือถือเป็น baseline เดิม)

2. ขั้นที่ 2: รวมคะแนน Indicator → ได้ค่า “ปัจจุบัน (current)” ของ KR

สมมติ KR หนึ่งตัว j ผูกกับ Indicators หลายข้อ i ผ่านตาราง OKRKeyResultIndicator ที่มี weight w_ij:

เลือกเฉพาะตัวชี้วัดที่ indicator_percent_i ไม่เป็น null

ถ้าไม่มีการใส่ weight → กำหนด w_ij = 1 ทุกตัวไปก่อน

สูตรค่า “current” ของ KR (0–100):

current
𝑗
=
∑
𝑖
𝑤
𝑖
𝑗
⋅
indicator_percent
𝑖
∑
𝑖
𝑤
𝑖
𝑗
current
j
	​

=
∑
i
	​

w
ij
	​

∑
i
	​

w
ij
	​

⋅indicator_percent
i
	​

	​


เราเก็บค่า current_j นี้ลงใน OKRKeyResult.current (หน่วยเป็น %)

ตรงนี้คือ “ภาพรวมความเข้มแข็งของ KR นั้น ๆ จากตัวชี้วัดจริง”

3. ขั้นที่ 3: คำนวณ % ความก้าวหน้าของ KR เทียบ baseline–target

ให้ถือว่า baseline_j และ target_j ใน OKRKeyResult อยู่ในหน่วยเดียวกับ current (คือ 0–100)

กรณีทั่วไป (baseline < target):

progressPct
𝑗
=
current
𝑗
−
baseline
𝑗
target
𝑗
−
baseline
𝑗
×
100
progressPct
j
	​

=
target
j
	​

−baseline
j
	​

current
j
	​

−baseline
j
	​

	​

×100

แล้ว clip ค่าให้อยู่ในช่วง 0–120% (กันกรณีทะลุเป้า):

ถ้า progressPct < 0 → ตั้งเป็น 0

ถ้า progressPct > 120 → ตั้งเป็น 120 (ไว้โชว์ว่า “เกินเป้าหมายมาก”)

ถ้าเป็น KR แบบ “รักษามาตรฐาน” (baseline ≈ target)

อาจใช้สูตรง่าย ๆ: progressPct = current_j / target_j × 100

4. ขั้นที่ 4: ระดับ Objective – รวมจากหลาย KRs

Objective k ผูกกับ KR หลายตัว j (อาจกำหนด weight ของแต่ละ KR หรือจะเอาเท่ากันหมดก็ได้)

4.1 วิธี 1 (ง่ายที่สุด): ใช้ค่า progress ของ KR มาถัวเฉลี่ย

ถ้าไม่มีน้ำหนัก:

objectiveProgress
𝑘
=
∑
𝑗
progressPct
𝑗
จำนวน KR
objectiveProgress
k
	​

=
จำนวน KR
∑
j
	​

progressPct
j
	​

	​


ถ้ามีน้ำหนัก w_j:

objectiveProgress
𝑘
=
∑
𝑗
𝑤
𝑗
⋅
progressPct
𝑗
∑
𝑗
𝑤
𝑗
objectiveProgress
k
	​

=
∑
j
	​

w
j
	​

∑
j
	​

w
j
	​

⋅progressPct
j
	​

	​

4.2 ถ้าอยากสาย RBM เน้น “ผลลัพธ์” มากกว่า “กิจกรรม”

ครูใหญ่อาจกำหนด weight ของ KR แบบนี้ เช่น:

KR ที่ผูกกับ ผลลัพธ์ผู้เรียนจริง (คะแนน, พฤติกรรม) → weight สูง

KR ที่เป็นเรื่อง process เช่น จำนวนครั้งประชุม, จำนวน PLC → weight ต่ำ

แล้วเอาไปใช้ในสูตรด้านบน → Objective จะสะท้อน “ผลลัพธ์จริง” มากกว่า “ทำกิจกรรมครบ”

5. ระดับสีไฟจราจร (Traffic Light)

ตั้งเกณฑ์สีเอาไว้ให้ Dashboard ใช้งานง่าย เช่น:

สำหรับ KR หรือ Objective ใด ๆ:

Green (ดีมาก / บรรลุเป้าหมาย)

progressPct
≥
90
%
progressPct≥90%

Yellow (กำลังไป / ต้องเร่ง)

70
%
≤
progressPct
<
90
%
70%≤progressPct<90%

Red (เสี่ยง / ต้องช่วยเหลือเร่งด่วน)

progressPct
<
70
%
progressPct<70%

ครูใหญ่จะปรับเป็น 80–100 / 50–80 / <50 ก็ได้ตามบริบทโรงเรียน

6. ตัวอย่างตัวเลขให้เห็นภาพ

สมมติ KR หนึ่งตัวผูกกับ 2 indicator:

Indicator A: Likert 1–5, min=1,max=5

avg_score_A = 3.5

percent_A = (3.5−1)/(5−1)×100 = 62.5

Indicator B: Likert 1–4, min=1,max=4

avg_score_B = 3.0

percent_B = (3.0−1)/(4−1)×100 ≈ 66.7

ไม่มี weight → w_A = w_B = 1

current
𝑗
=
(
62.5
+
66.7
)
/
2
≈
64.6
current
j
	​

=(62.5+66.7)/2≈64.6

สมมติ baseline = 40, target = 80 (หน่วย %):

progressPct
𝑗
=
64.6
−
40
80
−
40
×
100
=
24.6
40
×
100
≈
61.5
%
progressPct
j
	​

=
80−40
64.6−40
	​

×100=
40
24.6
	​

×100≈61.5%

แปลว่า “เดินทางมาแล้ว ~61.5% จาก 40 → 80”

สี: Yellow → ต้องเร่งต่อ

7. แปลงเป็น logic ในระบบ (เอาไปเขียน service/backend ได้เลย)
7.1 Aggregation per indicator

Pseudo:

// filter: instrumentId, schoolId, academicYearId, termId (ถ้าต้องการ)
const responses = await prisma.evaluationResponse.groupBy({
  by: ['indicatorId'],
  _avg: { score: true },
  where: {
    evaluationSession: {
      instrumentId,
      schoolId,
      academicYearId,
      termId,
      status: 'SUBMITTED',
    },
  },
});


แล้ว loop:

for each group in responses:
  const indicator = await prisma.indicator.findUnique({ where: { id: group.indicatorId } });
  const avg = group._avg.score;
  const percent = (avg - indicator.minScore) / (indicator.maxScore - indicator.minScore) * 100;


เก็บลง map: indicatorPercent[indicatorId] = percent;

7.2 Compute KR current & progress
const krs = await prisma.oKRKeyResult.findMany({
  where: { objectiveId: someObjectiveId },
  include: { indicators: true }, // OKRKeyResultIndicator[]
});

for each kr in krs:
  let sumWeight = 0;
  let sumScore = 0;
  for each link in kr.indicators:
    const iId = link.indicatorId;
    const w = link.weight ?? 1;
    const p = indicatorPercent[iId]; // may be undefined
    if (p == null) continue;
    sumWeight += w;
    sumScore += w * p;
  if (sumWeight === 0) continue; // no data

  const current = sumScore / sumWeight; // 0-100
  const baseline = kr.baseline ?? 0;
  const target = kr.target ?? 100;

  let progressPct: number;
  if (target !== baseline) {
    progressPct = ((current - baseline) / (target - baseline)) * 100;
  } else {
    progressPct = (current / target) * 100;
  }
  progressPct = Math.max(0, Math.min(progressPct, 120));

  // save back
  await prisma.oKRKeyResult.update({
    where: { id: kr.id },
    data: { current },
  });


แล้วฝั่ง Dashboard ค่อยคำนวณสีตาม progressPct อีกที

8. Mapping ระหว่าง Q-Model / DERS / ไทย ป.1–3 กับ KR

Q-Model → เหมาะกับ KR ระดับ “ระบบ/โครงสร้าง” (Q-Leadership, Q-PLC, Q-Goal, Q-Info, Q-Network)

DERS → ใช้เป็น indicator เชิง “คุณภาพห้องเรียนและสภาพแวดล้อม” (ไปผูกกับ KR ด้าน Q-Learning / Q-Info / ห้องเรียนคุณภาพ)

ภาษาไทย ป.1–3 → ใช้เป็น indicator เชิง “คุณภาพการสอนภาษาไทย” (ไปผูกกับ KR ใน O ด้านผลสัมฤทธิ์วิชาภาษาไทยหรือ Q-Learning)

ข้อดีของสูตรนี้คือ:

ทุกแบบประเมินถูก normalize อยู่ใน 0–100 ทำให้เอามาผสมข้ามเครื่องมือได้

สามารถมองภาพรวมโรงเรียนแบบ RBM ได้ว่า

Indicator (กิจกรรม/สภาพ) → KR (ผลกลาง) → Objective (ผลรวม/เป้าหมายใหญ่)


//ตัวอย่าง RBM Dashboard (progress map)


1️⃣ หน้าหลัก RBM Dashboard – มุมมอง “ ผอ. ดูภาพรวมทั้งโรงเรียน ”

คิดภาพหน้า /dashboard ประมาณนี้ (ผมใส่ตัวเลขตัวอย่างให้ดู flow ด้วย)

[ แดชบอร์ดโรงเรียนคุณภาพ • โรงเรียนบ้านพญาไพร • ปี 2568 เทอม 1 ]

ฟิลเตอร์:
[โรงเรียน: บ้านพญาไพร] [ปี: 2568] [เทอม: 1/2568] [แบบประเมิน: ทั้งหมด] [มิติ Q: ทั้งหมด]

────────────────────────────────────────────────────────────
KPI Summary (RBM Overview)
────────────────────────────────────────────────────────────
🟣 Overall School Quality Index (RBM)       78%  (🟡 ใกล้เป้า)
🟢 Completion Rate of Evaluations          92%
🟡 Q-Leadership Progress                   74%
🟢 Q-Learning Progress                     85%
🟡 Q-PLC Progress                          69%
🔴 Q-Info & Data Use Progress              55%

[ปุ่ม] ดูรายละเอียด Q-Model   [ปุ่ม] ดูผลตามวิชา (DERS/ภาษาไทย ป.1–3)

2️⃣ แผนที่มิติ Q-Model (RBM Progress by Dimension)

ส่วนนี้คือ “แผนที่ 6 Q” ให้ ผอ. เห็นว่ามิติไหน “เขียว / เหลือง / แดง”

────────────────────────────────────────────────────────────
Q-Model Progress Map (ตามมิติ)
────────────────────────────────────────────────────────────

Q-Leadership      🟡 74%   เป้า: 85%
Q-PLC             🟡 69%   เป้า: 80%
Q-Learning        🟢 85%   เป้า: 80%
Q-Goal            🟢 88%   เป้า: 85%
Q-Info            🔴 55%   เป้า: 80%
Q-Network         🟡 72%   เป้า: 80%

[แท่งกราฟ]
 90 |                      ████ Q-Goal (88%)
 80 |                  ████      Q-Learning (85%)
 70 |             ████           Q-Leadership (74%)
 60 |        ████                Q-Network (72%)
 50 |   ████                     Q-PLC (69%)
 40 | ████                       Q-Info (55%)
        QI   QP   QL   QG   QInfo QN


สีใช้ logic จากสูตร RBM ที่เราเพิ่งวาง:

≥ 90% → เขียวเข้ม

70–90% → เหลือง

< 70% → แดง

3️⃣ แผนที่ Objective–KR (RBM Map per Dimension)

ลองเจาะเข้าไปที่ Q-Leadership (คลิก Q-Leadership ในกราฟด้านบน) → /okrs?dimension=Q-Leadership

────────────────────────────────────────────────────────────
Q-Leadership • RBM Objective Map
────────────────────────────────────────────────────────────

🎯 Objective O-Q-LEAD-2568
   "ยกระดับภาวะผู้นำทางวิชาการของโรงเรียนสู่มาตรฐาน Q-Leadership"
   Owner: ผอ. / โรงเรียนบ้านพญาไพร   ปี: 2568   เทอม: 1–2
   Progress (เฉลี่ยทุก KR): 🟡 74%

┌───────────────────────────────────────────────────────────┐
│ KR-01: มีกรอบเป้าหมายคุณภาพผู้เรียนร่วมกันอย่างชัดเจน      │
│       Baseline: 20%  Target: 100%  Current: 68%  → 🟡 60%   │
│       Linked Indicator: Q-L-01 (ร่วมกำหนดเป้าหมายนักเรียน)    │
│                                                             │
│       Actions:                                              │
│       - A1: เวิร์กช็อปครู + กรรมการสถานศึกษา               │
│            Status: ดำเนินการ   Evidence: 2 ไฟล์แนบ         │
│       - A2: ทำ School Goal Canvas ติดในทุกห้องเรียน        │
│            Status: เสร็จสิ้น   Evidence: 10 รูปถ่าย         │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│ KR-02: ปรับปรุงหลักสูตรสถานศึกษาให้สะท้อนทักษะอนาคตและท้องถิ่น │
│       Baseline: 10%  Target: 100%  Current: 55%  → 🟡 50%   │
│       Linked Indicator: Q-L-02 (ผอ.นำการปรับหลักสูตร),    │
│                         Q-L-03 (มีส่วนร่วมจากชุมชน)        │
│                                                             │
│       Actions:                                              │
│       - A1: ตั้งคณะทำงานหลักสูตร (ครู + ชุมชน)             │
│            Status: เสร็จสิ้น                                │
│       - A2: ทบทวนหน่วยเรียนรู้เชื่อมโยงอาชีพในพื้นที่      │
│            Status: กำลังดำเนินการ                           │
└───────────────────────────────────────────────────────────┘


จุดสำคัญของหน้าจอนี้

ด้านบน: สรุป Obj เดียว (1 กล่องใหญ่) + % เฉลี่ย

ด้านล่าง: List ของ KR แต่ละตัว

แสดง baseline / target / current / progress% / สี

แสดงว่าผูกกับตัวชี้วัด Q-Model ข้อไหนบ้าง

แสดง Actions + Evidence

4️⃣ แผนที่เชื่อม Indicators DERS / ภาษาไทย ป.1–3 → KR

พอกดเข้า KR ใด KR หนึ่ง จะมี “แผนที่ตัวชี้วัด” ให้เห็นว่า data มาจากไหน

ตัวอย่าง: KR ด้าน คุณภาพห้องเรียนภาษาไทย ป.1–3 ที่ผูกกับ DERS + Thai P.1–3

────────────────────────────────────────────────────────────
KR-THAI-01: "ห้องเรียนภาษาไทย ป.1–3 ปลอดภัย เอื้อต่อการเรียนรู้และ Active Learning"
Progress: 🟢 82%  (Baseline 45% → Target 85%)

Indicators Map (Normalized 0–100):

  DERS-01  "เด็กเข้าถึงมุมเรียนรู้ได้โดยอิสระ"          78%
  DERS-02  "เฟอร์นิเจอร์ขนาดเด็ก ใช้งานได้เอง"            85%
  THAI-CL-01 "ห้องเรียนสะอาด มีมุมภาษาไทย"               80%
  THAI-TC-01 "ครูใช้คำถามชวนคิดในวิชาภาษาไทย"           84%

Weighted Average = 82%   (w = 1,1,1,1)


UI visual (ใช้ bar chart แนวนอน):

[███████████████------] 78%  DERS-01
[█████████████████----] 85%  DERS-02
[████████████████-----] 80%  THAI-CL-01
[█████████████████----] 84%  THAI-TC-01
----------------------------------------
           😃 ค่าเฉลี่ย KR = 82% (สีเขียว)


แบบนี้ครู/ผอ. จะเห็นเลยว่า

ถ้า KR ยังเหลือง/แดง → Indicator ไหนต่ำ → ต้องไปแก้จุดไหนในห้องเรียน/การสอน

5️⃣ มุมมอง “แผนที่ก้าวหน้า” แบบ school-wide Progress Map

อีกมุมหนึ่งคือ “แผนที่ความก้าวหน้า” ทั้งโรงเรียน คล้าย heatmap

────────────────────────────────────────────────────────────
School-wide Progress Map (ตาม Q + วิชา)
────────────────────────────────────────────────────────────

                 Q-Lead   Q-PLC   Q-Learn   Q-Goal   Q-Info   Q-Net
---------------------------------------------------------------------
DERS              72%      –       81%       –        60%      –
Thai P.1–3        68%     70%      85%       –        –        –
Q-Model           74%     69%      78%      88%      55%      72%

สี (Heatmap):
  ≥ 85%   → เขียวเข้ม
  70–84% → เหลือง
  < 70%  → แดง


ตรงนี้คือ “แผนที่สงคราม” ของ ผอ. ว่าจะส่งทีมไหนไปช่วยมิติไหนก่อน 😄

6️⃣ จะส่งต่อ dev ยังไงให้ทำงานง่าย

ครูใหญ่สามารถสั่งทีม dev ว่า:

เอา layout เหล่านี้ไปทำเป็น Figma / Next.js UI ตาม ui-spec.md ที่เราวาง

ใช้สูตร RBM ที่เราออกแบบไปแล้ว เพื่อคำนวณ:

indicator_percent

KR.current + progressPct

ObjectiveProgress

Dashboard เรียก API จาก NestJS:

/dashboard/summary

/dashboard/q-model

/dashboard/okr-progress

/dashboard/kr/:id/detail (ดึง indicator map ของ KR)

“ใยแมงมุม Q-Model” ไว้หน้าแรกเลย 🌐🕸️
เดี๋ยวผมใส่ทั้งภาพตัวอย่าง + โครงข้อมูล + ตัวอย่าง config (เช่นใช้ Chart.js หรืออะไรก็เอาไป map ได้)

1️⃣ ตำแหน่งบนหน้า Dashboard

ในหน้า /dashboard ที่เราออกแบบไว้ เดิมมี section กราฟ 2 ช่อง
ผมจะให้ ช่องขวา เป็น Spider Chart (Radar Chart) ของ Q-Model แบบนี้:

Section: Charts (2 คอลัมน์)

ซ้าย:  Bar Chart – คะแนนเฉลี่ยแต่ละมิติ Q-Model
ขวา:   Spider/Radar Chart – RBM Progress by Dimension (Q-Model)


UI คร่าว ๆ:

────────────────────────────────────────────
[กราฟซ้าย] Bar Chart: Q-Model Progress
────────────────────────────────────────────
  Q-Leadership   74%
  Q-PLC          69%
  Q-Learning     85%
  Q-Goal         88%
  Q-Info         55%
  Q-Network      72%

────────────────────────────────────────────
[กราฟขวา] Spider Chart: Q-Model RBM Map
────────────────────────────────────────────

         Q-Leadership (74%)
                 /\
                /  \
   Q-PLC (69%) /    \ Q-Learning (85%)
              /      \
             /        \
      Q-Network(72%)   \ 
             \          \
              \   Q-Goal (88%)
               \
                Q-Info (55%)

(แกนรัศมี 0–100%, เส้นวง 20/40/60/80/100)
สีเส้น/พื้น: กราฟ Q-Model เดียว หรือเปรียบเทียบ ปีปัจจุบัน vs ปีที่แล้ว

2️⃣ รูปแบบข้อมูลจาก Backend สำหรับ Spider Chart

ให้ NestJS endpoint /dashboard/q-model ส่งข้อมูลสักแบบนี้:

{
  "dimensionProgress": [
    { "dimension": "Q-Leadership", "labelTh": "Q-Leadership", "value": 74 },
    { "dimension": "Q-PLC",        "labelTh": "Q-PLC",        "value": 69 },
    { "dimension": "Q-Learning",   "labelTh": "Q-Learning",   "value": 85 },
    { "dimension": "Q-Goal",       "labelTh": "Q-Goal",       "value": 88 },
    { "dimension": "Q-Info",       "labelTh": "Q-Info",       "value": 55 },
    { "dimension": "Q-Network",    "labelTh": "Q-Network",    "value": 72 }
  ],
  "meta": {
    "schoolId": 1,
    "academicYearId": 1,
    "termId": 1
  }
}

3️⃣ ตัวอย่าง config Spider Chart (สมมติใช้ Chart.js)

ไฟล์ Frontend เช่น app/dashboard/components/QModelSpiderChart.tsx:

'use client';

import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

type DimensionProgress = {
  dimension: string;
  labelTh: string;
  value: number; // 0-100
};

export function QModelSpiderChart({ data }: { data: DimensionProgress[] }) {
  const labels = data.map((d) => d.labelTh);
  const values = data.map((d) => d.value);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'ความก้าวหน้า Q-Model (%)',
        data: values,
        backgroundColor: 'rgba(79, 70, 229, 0.2)', // indigo-600 with alpha
        borderColor: 'rgba(79, 70, 229, 1)',
        pointBackgroundColor: 'rgba(79, 70, 229, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(79, 70, 229, 1)',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    scales: {
      r: {
        beginAtZero: true,
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
          font: {
            family: 'Kanit',
          },
          callback: (value: any) => `${value}%`,
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.4)', // slate-400
        },
        angleLines: {
          color: 'rgba(148, 163, 184, 0.4)',
        },
        pointLabels: {
          font: {
            family: 'Kanit',
            size: 11,
          },
          color: '#0f172a', // slate-900
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        labels: {
          font: { family: 'Kanit' },
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.formattedValue}%`,
        },
      },
    },
  } as const;

  return (
    <div className="bg-white rounded-lg shadow p-4 h-64">
      <div className="text-sm font-semibold mb-2">
        ใยแมงมุมความก้าวหน้า Q-Model (RBM by Dimension)
      </div>
      <Radar data={chartData} options={options} />
    </div>
  );
}


แล้วใน app/dashboard/page.tsx ก็เสียบเข้าไปแทน card ขวา:

// ส่วน chart 2 ช่อง
<section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <div className="bg-white rounded-lg shadow p-4 h-64">
    {/* Bar chart Q-Model */}
  </div>
  <QModelSpiderChart data={qModelDimensionProgress} />
</section>


qModelDimensionProgress = ข้อมูลที่ดึงจาก NestJS /dashboard/q-model

4️⃣ การตีความสำหรับผู้บริหาร (ไม่ใช่แค่สวย)

สื่อสารกับครู/ผู้บริหารแบบนี้ได้เลยในคู่มือ:

จุดที่ยื่นออกไปไกล = มิติที่ “แข็งแรง” (progress สูง)

จุดที่หดเข้ามา = มิติที่ยังอ่อน (เช่น Q-Info 55%)

ถ้าใยแมงมุม “เบี้ยวหนักไปด้านใดด้านหนึ่ง” แสดงว่าโรงเรียนเน้นบางด้านมากแต่หลุดอีกด้าน เช่น

Q-Learning, Q-Goal สูง → กิจกรรมการเรียนรู้ดี เป้าหมายชัด

แต่ Q-Info, Q-PLC ต่ำ → ยังไม่ใช้ข้อมูล/วง PLC มารองรับอย่างจริงจัง


//“ใยแมงมุม ปัจจุบัน vs เป้าหมาย” = ดูออกทันทีว่า ช่องไหนยังห้อย 😄

ผมจะแบ่งเป็น 3 ส่วน:

รูปแบบข้อมูล (Current vs Target)

ตัวอย่างโค้ด Component ใยแมงมุม 2 ชั้น

วิธีตีความสำหรับผู้บริหาร / PLC

1️⃣ รูปแบบข้อมูลจาก Backend: Current vs Target per Q

ให้ NestJS /dashboard/q-model ส่งแบบนี้ (เพิ่ม target เข้าไป):

{
  "dimensionProgress": [
    { "dimension": "Q-Leadership", "labelTh": "Q-Leadership", "current": 74, "target": 85 },
    { "dimension": "Q-PLC",        "labelTh": "Q-PLC",        "current": 69, "target": 80 },
    { "dimension": "Q-Learning",   "labelTh": "Q-Learning",   "current": 85, "target": 80 },
    { "dimension": "Q-Goal",       "labelTh": "Q-Goal",       "current": 88, "target": 90 },
    { "dimension": "Q-Info",       "labelTh": "Q-Info",       "current": 55, "target": 80 },
    { "dimension": "Q-Network",    "labelTh": "Q-Network",    "current": 72, "target": 85 }
  ]
}


ทั้งหมดเป็น % 0–100 ที่มาจากสูตร RBM ที่เราออกแบบไปแล้ว

2️⃣ Component ใยแมงมุม “Target vs Current” (Radar 2 ชั้น)

ต่อยอดจาก QModelSpiderChart เดิม ให้แสดง 2 dataset: เป้าหมาย vs ปัจจุบัน

'use client';

import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

type DimensionProgress = {
  dimension: string;
  labelTh: string;
  current: number; // 0-100
  target: number;  // 0-100
};

export function QModelSpiderTargetVsCurrent({ data }: { data: DimensionProgress[] }) {
  const labels = data.map((d) => d.labelTh);
  const currentValues = data.map((d) => d.current);
  const targetValues = data.map((d) => d.target);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'เป้าหมาย (Target)',
        data: targetValues,
        backgroundColor: 'rgba(34, 197, 94, 0.15)', // green-500 alpha
        borderColor: 'rgba(34, 197, 94, 1)',
        pointBackgroundColor: 'rgba(34, 197, 94, 1)',
        pointBorderColor: '#fff',
        borderWidth: 2,
      },
      {
        label: 'ปัจจุบัน (Current)',
        data: currentValues,
        backgroundColor: 'rgba(79, 70, 229, 0.25)', // indigo-600 alpha
        borderColor: 'rgba(79, 70, 229, 1)',
        pointBackgroundColor: 'rgba(79, 70, 229, 1)',
        pointBorderColor: '#fff',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    scales: {
      r: {
        beginAtZero: true,
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
          font: { family: 'Kanit' },
          callback: (value: any) => `${value}%`,
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.4)',
        },
        angleLines: {
          color: 'rgba(148, 163, 184, 0.4)',
        },
        pointLabels: {
          font: { family: 'Kanit', size: 11 },
          color: '#0f172a',
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        labels: { font: { family: 'Kanit' } },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const label = ctx.dataset.label || '';
            const v = ctx.formattedValue;
            return ` ${label}: ${v}%`;
          },
        },
      },
    },
  } as const;

  return (
    <div className="bg-white rounded-lg shadow p-4 h-64">
      <div className="text-sm font-semibold mb-2">
        ใยแมงมุม Q-Model: เป้าหมาย vs ปัจจุบัน
      </div>
      <Radar data={chartData} options={options} />
      <p className="mt-2 text-xs text-slate-500">
        เส้นสีเขียว = เป้าหมาย, เส้นสีน้ำเงิน = สถานการณ์ปัจจุบัน<br />
        จุดที่เส้นปัจจุบันห่างจากเส้นเป้าหมายมาก แสดงว่าต้องวางแผนพัฒนามากเป็นพิเศษ
      </p>
    </div>
  );
}


เอาไปใช้แทน component เดิมในหน้า /dashboard:

<section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  {/* ซ้าย: bar chart หรือตารางสรุป */}
  <div className="bg-white rounded-lg shadow p-4 h-64">
    {/* TODO: Bar chart Q-Model */}
  </div>

  {/* ขวา: ใยแมงมุม Target vs Current */}
  <QModelSpiderTargetVsCurrent data={qModelDimensionProgress} />
</section>

3️⃣ วิธีตีความใยแมงมุม Target vs Current

สิ่งที่ ผอ. / ทีมครูจะเห็น:

เส้นเขียว (Target) = “ภาพที่เราอยากไปให้ถึง” ในแต่ละมิติ Q

เส้นน้ำเงิน (Current) = สถานการณ์จริงจากคะแนนประเมิน

ถ้ามิติไหน Current > Target → เกินเป้าแล้ว (พื้นที่บวมเกินเส้นเขียว)

ถ้ามิติไหน Current ต่ำกว่า Target มาก → จุดที่ควร “โฟกัสแผนพัฒนา–PLC–โครงการ”

ตัวอย่าง:

Q-Learning: Target 80 / Current 85 → ดีเกินเป้า → เสริมแรง & เก็บเป็น Best Practice

Q-Info: Target 80 / Current 55 → เส้นน้ำเงินหดเข้าไปเยอะ → วาง KR/Action เพิ่มด้านข้อมูลสารสนเทศ
