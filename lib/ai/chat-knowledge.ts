// lib/ai/chat-knowledge.ts
// Builds the grounding knowledge base for the AI chatbot from LIVE data:
// a curated framework overview (theory) + every active indicator with its
// rubric/level descriptors (Q-Model + THAI P.1-3). The assembled string is
// cached in module memory (built once per process) since indicators rarely
// change; call invalidateKnowledgeBase() if you need to force a rebuild.

import { prisma } from '@/lib/prisma';
import { InstrumentType } from '@prisma/client';

const FRAMEWORK_OVERVIEW = `## กรอบหลักการและทฤษฎีของระบบ

### Q-Model (เครื่องมือประเมินคุณภาพโรงเรียน)
ประเมิน 4 มิติ มาตรา 1–5:
- Q-Leadership — ภาวะผู้นำทางวิชาการของผู้บริหาร
- Q-PLC — ชุมชนแห่งการเรียนรู้ทางวิชาชีพ (Professional Learning Community)
- Q-Learning — การจัดการเรียนรู้ที่มีประสิทธิภาพ (ด้านครู)
- Q-Students — คุณลักษณะ/สมรรถนะด้านนักเรียน
แต่ละตัวชี้วัดเก็บ 2 ค่า: "สภาพที่เป็นอยู่" (current state) และ "สภาพที่พึงประสงค์/เป้าหมาย" (desired/target) — ช่องว่าง (gap) = เป้าหมาย − ที่เป็นอยู่ ใช้ชี้จุดที่ควรพัฒนา

### การประเมินการจัดการเรียนการสอนภาษาไทย ป.1–3 (THAI P.1–3)
ประเมิน 5 ด้าน มาตรา 1–4 (1=ต้องปรับปรุง, 2=พอใช้, 3=ดี, 4=ดีเยี่ยม) โดยมีผู้ประเมิน 2 ฝั่ง: "ครูประเมินตนเอง" และ "ผู้อำนวยการประเมิน" พร้อมการสะท้อนคิด 2 ครั้ง/ปี (ต้นปี = ตั้งเป้า, ปลายปี = ทบทวนผล)

### SOAR (กรอบวิเคราะห์เชิงบวก)
Strengths (จุดแข็ง) · Opportunities (โอกาสจากช่องว่าง) · Aspirations (ภาพอนาคตที่อยากเป็น) · Results (ผลลัพธ์/หลักฐาน)

### Iceberg Model (วิเคราะห์ 4 ชั้น จากสิ่งที่เห็นไปหาความเชื่อ)
ชั้น 1 สถานการณ์ (เหตุการณ์ที่สังเกตได้) → ชั้น 2 รูปแบบ (สิ่งที่เกิดซ้ำ) → ชั้น 3 โครงสร้าง (ระบบ/นโยบาย/ทรัพยากร) → ชั้น 4 แบบจำลองวิธีคิด (ความเชื่อ/ค่านิยมที่ฝังลึก)`;

const INSTRUMENT_TYPES: InstrumentType[] = [InstrumentType.Q_MODEL, InstrumentType.THAI_P1_3];

let _cache: string | null = null;

function renderLevels(levelDescriptors: unknown, minScore: number, maxScore: number): string[] {
  if (!levelDescriptors || typeof levelDescriptors !== 'object') return [];
  const map = levelDescriptors as Record<string, unknown>;
  const lines: string[] = [];
  for (let lvl = maxScore; lvl >= minScore; lvl--) {
    const text = map[String(lvl)];
    if (typeof text === 'string' && text.trim()) {
      // collapse internal newlines so each level stays one bullet
      lines.push(`    - ระดับ ${lvl}: ${text.trim().replace(/\s*\n\s*/g, ' / ')}`);
    }
  }
  return lines;
}

async function build(): Promise<string> {
  const instruments = await prisma.instrument.findMany({
    where: { type: { in: INSTRUMENT_TYPES }, isActive: true },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: { indicators: { where: { isActive: true }, orderBy: { id: 'asc' } } },
      },
    },
  });

  const parts: string[] = ['# ฐานความรู้ระบบ DE (DOITUNG Development Evaluation)', '', FRAMEWORK_OVERVIEW, '', '## เครื่องมือและตัวชี้วัด (ทั้งหมด พร้อมเกณฑ์ระดับ)'];

  for (const inst of instruments) {
    parts.push('', `### ${inst.nameTh}${inst.nameEn ? ` (${inst.nameEn})` : ''}`);
    for (const sec of inst.sections) {
      if (!sec.indicators.length) continue;
      parts.push('', `#### ด้าน: ${sec.nameTh}${sec.nameEn ? ` [${sec.nameEn}]` : ''}`);
      for (const ind of sec.indicators) {
        const code = ind.itemCode ? `[${ind.itemCode}] ` : '';
        parts.push(`- ${code}${ind.textTh} (มาตรา ${ind.minScore}–${ind.maxScore})`);
        parts.push(...renderLevels(ind.levelDescriptors, ind.minScore, ind.maxScore));
      }
    }
  }

  return parts.join('\n');
}

/** Returns the cached knowledge base, building it on first call. */
export async function getKnowledgeBase(): Promise<string> {
  if (_cache == null) _cache = await build();
  return _cache;
}

/** Force a rebuild on the next getKnowledgeBase() call (e.g. after indicators change). */
export function invalidateKnowledgeBase(): void {
  _cache = null;
}
