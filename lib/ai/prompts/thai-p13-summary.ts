// lib/ai/prompts/thai-p13-summary.ts
// Prompt builder for the THAI_P1_3 end-of-year summary. Merges the quantitative
// per-dimension scoreboard (rating 1–4 by ครู self + ผอ. director) with the
// qualitative reflection digest (teachers' term-1 + term-2 reflections) into a
// leadership brief. Three scopes share the system prompt; the user prompt frames
// the data differently (one teacher / one school / whole project).

export const THAI_P13_SUMMARY_PROMPT_VERSION = 'thai-p13-summary-v1';

export type ThaiSummaryScope = 'individual' | 'school' | 'project' | 'network';

export const THAI_P13_SUMMARY_SYSTEM_PROMPT = `คุณคือผู้ช่วยจัดทำ "บทสรุปผลการประเมินการจัดการเรียนการสอนภาษาไทย ป.1–3" สำหรับผู้บริหารการศึกษา

แบบประเมินนี้มี 5 ด้าน ประเมินด้วยมาตรา 1–4 (1=ต้องปรับปรุง, 2=พอใช้, 3=ดี, 4=ดีเยี่ยม) โดยมีผู้ประเมิน 2 ฝั่ง: "ครูประเมินตนเอง" และ "ผู้อำนวยการประเมิน" และครูได้บันทึก "การสะท้อนคิด" รายด้าน 2 ครั้งต่อปี (ครั้งที่ 1 = เป้าหมาย/แผนการเปลี่ยนแปลงต้นปี, ครั้งที่ 2 = ผลการดำเนินงาน/การทบทวนปลายปี)

หน้าที่ของคุณคือสังเคราะห์ข้อมูล 2 ชนิด:
1. เชิงปริมาณ (Quantitative): คะแนนเฉลี่ยรายด้าน — ฝั่งครู (self) เทียบฝั่ง ผอ. (director) และค่าเป้าหมาย
2. เชิงคุณภาพ (Qualitative): ใจความสำคัญจากการสะท้อนคิดของครู

หลักการเคร่งครัด:
1. ห้ามสร้างหรือแก้ตัวเลข — ใช้ค่าที่ให้มาตามจริงเท่านั้น
2. เป็น "ผู้ช่วยสรุป" ไม่ใช่ "กรรมการตัดสิน" — ใช้ถ้อยคำสุภาพ สร้างสรรค์ ไม่กล่าวโทษบุคคล
3. เชื่อมโยงตัวเลขกับการสะท้อนคิดให้ชัด เช่น ด้านที่คะแนนต่ำสอดคล้องกับประเด็นใดที่ครูสะท้อน
4. ห้ามสรุปเกินข้อมูลที่ปรากฏ ถ้าข้อมูลไม่พอให้ระบุว่า "ข้อมูลยังไม่เพียงพอ"
5. ข้อเสนอแนะต้องนำไปปฏิบัติได้จริงในระดับห้องเรียน/โรงเรียน
6. ใช้ภาษาไทยทั้งหมด กระชับ เหมาะกับผู้บริหารอ่านเร็ว

Output: JSON เท่านั้น ตามโครงสร้างที่กำหนด ห้ามมีข้อความนอก JSON`;

export interface ThaiSummaryDimension {
  sectionName: string; // ชื่อด้าน
  selfAvg: number | null; // คะแนนเฉลี่ยฝั่งครู (1–4)
  directorAvg: number | null; // คะแนนเฉลี่ยฝั่ง ผอ. (1–4)
  targetAvg: number | null; // ค่าเป้าหมายเฉลี่ย (1–4)
  responseCount: number;
}

export interface ThaiReflectionDigestItem {
  sectionName: string;
  term: number; // 1 | 2
  text: string; // already PII-redacted
}

export interface ThaiSummaryPromptInput {
  scope: ThaiSummaryScope;
  academicYearLabel: string;
  subjectLabel: string; // teacher name / school name / "ทั้งโครงการ"
  teacherCount?: number; // for school/project scope
  schoolCount?: number; // for project scope
  scoreboard: ThaiSummaryDimension[];
  reflections: ThaiReflectionDigestItem[];
}

function fmt(v: number | null): string {
  return v == null ? 'ไม่มีข้อมูล' : v.toFixed(2);
}

export function buildThaiP13SummaryUserPrompt(input: ThaiSummaryPromptInput): string {
  const lines: string[] = [];

  const scopeLabel =
    input.scope === 'individual' ? 'รายบุคคล (ครู 1 คน)'
    : input.scope === 'school' ? 'รายโรงเรียน'
    : input.scope === 'network' ? 'รายกลุ่มเครือข่าย'
    : 'ภาพรวมทั้งโครงการ';

  lines.push(`ระดับการสรุป: ${scopeLabel}`);
  lines.push(`ปีการศึกษา: ${input.academicYearLabel || '-'}`);
  lines.push(`หน่วยที่สรุป: ${input.subjectLabel}`);
  if (input.teacherCount != null) lines.push(`จำนวนครูที่นำมาคำนวณ: ${input.teacherCount} คน`);
  if (input.schoolCount != null) lines.push(`จำนวนโรงเรียน: ${input.schoolCount} โรงเรียน`);
  lines.push('');

  lines.push('## คะแนนเฉลี่ยรายด้าน (มาตรา 1–4)');
  lines.push('ด้าน | ครูประเมินตนเอง | ผอ.ประเมิน | ค่าเป้าหมาย | จำนวนคำตอบ');
  for (const d of input.scoreboard) {
    lines.push(`${d.sectionName} | ${fmt(d.selfAvg)} | ${fmt(d.directorAvg)} | ${fmt(d.targetAvg)} | ${d.responseCount}`);
  }
  lines.push('');

  if (input.reflections.length > 0) {
    lines.push('## การสะท้อนคิดของครู (จัดกลุ่มตามด้านและครั้งที่)');
    for (const r of input.reflections) {
      const termLabel = r.term === 1 ? 'ครั้งที่ 1 (เป้าหมาย/แผนต้นปี)' : 'ครั้งที่ 2 (ผล/ทบทวนปลายปี)';
      lines.push(`[${r.sectionName} · ${termLabel}] ${r.text}`);
    }
    lines.push('');
  } else {
    lines.push('## การสะท้อนคิดของครู');
    lines.push('(ยังไม่มีการบันทึกการสะท้อนคิด)');
    lines.push('');
  }

  lines.push('โปรดสังเคราะห์เป็นบทสรุปสำหรับผู้บริหารตามโครงสร้าง JSON ที่กำหนด');
  return lines.join('\n');
}
