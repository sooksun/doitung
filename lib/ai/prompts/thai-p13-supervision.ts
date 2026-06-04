// lib/ai/prompts/thai-p13-supervision.ts
// Prompt builder for the per-teacher SUPERVISION brief used by the Doitung
// coaching team (ทีมหนุนเสริมดอยตุง) before each visit. Generated PER ROUND:
//   ครั้งที่ 1 (ต้นปี) — the teacher just set change goals/plans; the team's
//     first visit is about understanding the starting point and supporting the plan.
//   ครั้งที่ 2 (ปลายปี) — end-of-year review; did the teacher reach their goals;
//     the team's visit is about sustaining gains and closing remaining gaps.

export const THAI_P13_SUPERVISION_PROMPT_VERSION = 'thai-p13-supervision-v1';

export const THAI_P13_SUPERVISION_SYSTEM_PROMPT = `คุณคือผู้ช่วยจัดทำ "บทสรุปรายบุคคลเพื่อการนิเทศ" ให้กับ "ทีมหนุนเสริมดอยตุง" ซึ่งเป็นทีมโค้ช/นิเทศที่จะเข้าไปหนุนเสริมครูในโรงเรียน ตามแบบประเมินการจัดการเรียนการสอนภาษาไทย ป.1–3 (5 ด้าน มาตรา 1–4: 1=ต้องปรับปรุง, 2=พอใช้, 3=ดี, 4=ดีเยี่ยม)

ครูถูกประเมิน 2 ฝั่ง: "ครูประเมินตนเอง" และ "ผู้อำนวยการประเมิน" และครูบันทึก "การสะท้อนคิด" รายด้าน โดยการประเมินแบ่งเป็น 2 ครั้งต่อปี:
- ครั้งที่ 1 (ต้นปี): ครูตั้งเป้าหมายการเปลี่ยนแปลง/แผนการพัฒนา
- ครั้งที่ 2 (ปลายปี): ทบทวนผลว่าทำตามแผนสำเร็จหรือไม่ เพราะเหตุใด

เป้าหมายของเอกสารนี้คือ "ใช้เป็นข้อมูลก่อนทีมเข้านิเทศ" ดังนั้นต้องช่วยให้ทีมรู้ว่า ครูคนนี้เป็นอย่างไร ควรเข้าไปสังเกต/โฟกัสอะไรในห้องเรียน และทีมควรหนุนเสริม/ให้ข้อเสนอแนะอย่างไร

หลักการเคร่งครัด:
1. ห้ามสร้างหรือแก้ตัวเลข — ใช้คะแนนที่ให้มาตามจริง โดยเฉพาะช่องว่าง (gap) ระหว่างสภาพปัจจุบันกับเป้าหมาย และความต่างระหว่างครูประเมินตนเองกับ ผอ.ประเมิน
2. ใช้ถ้อยคำเชิงหนุนเสริม สร้างสรรค์ ไม่ตัดสิน ไม่กล่าวโทษครู — ทีมเป็น "โค้ช" ไม่ใช่ "ผู้ตรวจ"
3. เชื่อมโยงคะแนนกับการสะท้อนคิดของครู เพื่อชี้ประเด็นนิเทศที่ตรงจุด
4. "ประเด็นที่ทีมควรสังเกต" และ "ข้อเสนอแนะการนิเทศ" ต้องนำไปปฏิบัติได้จริงในการลงพื้นที่ ระบุให้ชัดว่าควรดูอะไร ถามอะไร หนุนเสริมอย่างไร
5. ห้ามสรุปเกินข้อมูลที่ปรากฏ ถ้าข้อมูลไม่พอให้ระบุว่า "ข้อมูลยังไม่เพียงพอ"
6. ใช้ภาษาไทยทั้งหมด กระชับ เหมาะกับทีมอ่านก่อนลงพื้นที่

Output: JSON เท่านั้น ตามโครงสร้างที่กำหนด ห้ามมีข้อความนอก JSON`;

export interface SupervisionDimension {
  sectionName: string;
  selfAvg: number | null; // ครูประเมินตนเอง (1–4)
  directorAvg: number | null; // ผอ.ประเมิน (1–4)
  targetAvg: number | null; // ค่าเป้าหมาย (1–4)
  gap: number | null; // targetAvg - selfAvg (ช่องว่างถึงเป้าหมาย)
  responseCount: number;
}

export interface SupervisionReflection {
  sectionName: string;
  text: string; // PII-redacted
}

export interface SupervisionPromptInput {
  round: 1 | 2;
  teacherName: string;
  schoolName: string;
  academicYearLabel: string;
  termLabel: string; // e.g. "1/2568"
  scoreboard: SupervisionDimension[];
  reflections: SupervisionReflection[];
}

const fmt = (v: number | null) => (v == null ? 'ไม่มีข้อมูล' : v.toFixed(2));

export function buildThaiP13SupervisionUserPrompt(input: SupervisionPromptInput): string {
  const lines: string[] = [];
  const roundLabel = input.round === 1 ? 'ครั้งที่ 1 (ต้นปี — ตั้งเป้าหมาย/แผนการเปลี่ยนแปลง)' : 'ครั้งที่ 2 (ปลายปี — ทบทวนผลการดำเนินงาน)';

  lines.push(`การนิเทศ: ${roundLabel}`);
  lines.push(`ครูที่จะเข้านิเทศ: ${input.teacherName}`);
  lines.push(`โรงเรียน: ${input.schoolName}`);
  lines.push(`ปีการศึกษา ${input.academicYearLabel} · ภาคเรียน ${input.termLabel}`);
  lines.push('');

  lines.push('## คะแนนเฉลี่ยรายด้าน (มาตรา 1–4) ของการประเมินครั้งนี้');
  lines.push('ด้าน | ครูประเมินตนเอง | ผอ.ประเมิน | ค่าเป้าหมาย | ช่องว่างถึงเป้าหมาย | จำนวนคำตอบ');
  for (const d of input.scoreboard) {
    lines.push(`${d.sectionName} | ${fmt(d.selfAvg)} | ${fmt(d.directorAvg)} | ${fmt(d.targetAvg)} | ${fmt(d.gap)} | ${d.responseCount}`);
  }
  lines.push('');

  if (input.reflections.length > 0) {
    lines.push('## การสะท้อนคิดของครู (การประเมินครั้งนี้)');
    for (const r of input.reflections) lines.push(`[${r.sectionName}] ${r.text}`);
    lines.push('');
  } else {
    lines.push('## การสะท้อนคิดของครู');
    lines.push('(ไม่มีการบันทึกการสะท้อนคิดในครั้งนี้)');
    lines.push('');
  }

  const ask = input.round === 1
    ? 'เน้นช่วยทีมเข้าใจจุดตั้งต้นของครู เป้าหมาย/แผนที่ครูตั้งไว้ และจะหนุนเสริมให้ครูเริ่มลงมือตามแผนได้อย่างไร'
    : 'เน้นช่วยทีมประเมินความก้าวหน้าเทียบเป้าหมายต้นปี ว่าสำเร็จ/ไม่สำเร็จเพราะอะไร และจะหนุนเสริมให้ต่อยอดหรือปิดช่องว่างที่เหลืออย่างไร';
  lines.push(`โปรดสังเคราะห์เป็นบทสรุปเพื่อการนิเทศตามโครงสร้าง JSON ที่กำหนด โดย${ask}`);
  return lines.join('\n');
}
