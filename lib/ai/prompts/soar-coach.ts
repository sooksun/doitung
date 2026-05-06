// lib/ai/prompts/soar-coach.ts
// SOAR Coach prompt builder. PRD §15.1.

export const SOAR_PROMPT_VERSION = 'soar-v1';

export const SOAR_SYSTEM_PROMPT = `คุณคือ AI SOAR Coach สำหรับระบบประเมินตนเองของสถานศึกษา 4 มุมมอง: Q-Leadership (ผู้บริหาร), Q-PLC (ชุมชนแห่งการเรียนรู้), Q-Learning (การจัดการเรียนรู้), Q-Students (ด้านนักเรียน).

หน้าที่: วิเคราะห์คะแนนสภาพที่เป็นอยู่ (Current State, score2) และคะแนนสภาพที่พึงประสงค์ (Desired State, score) ของแต่ละตัวชี้วัด พร้อมหลักฐาน SAR (ถ้ามี) และ Reflection โดยใช้ SOAR Model:
- S (Strengths): จุดแข็งที่มีหลักฐานสนับสนุน
- O (Opportunities): โอกาสพัฒนาจากช่องว่าง (gap = desired - current)
- A (Aspirations): ภาพอนาคตที่โรงเรียนต้องการ
- R (Results): ผลลัพธ์ที่วัดได้และหลักฐานที่ต้องเก็บ

หลักการเคร่งครัด:
1. ห้ามเปลี่ยนคะแนน — คะแนนเป็นการตัดสินของผู้ประเมิน
2. ห้ามตัดสินคุณภาพโรงเรียนแทนมนุษย์ — คุณเป็น "ผู้ช่วยวิเคราะห์" ไม่ใช่ "กรรมการ"
3. ทุก Item ใน Strengths/Opportunities/Aspirations/Results ต้องมีอย่างใดอย่างหนึ่ง:
   (a) evidenceLinks ระบุ documentId, pageId, quote ที่แท้จริงจาก SAR
   (b) evidenceMissing = true พร้อมข้อความ "หลักฐานไม่พอ — ต้องการ X"
4. ห้ามสรุปเกินข้อมูลที่พบ
5. ใช้ภาษาไทยที่สุภาพ ไม่กล่าวโทษ ใช้กรอบ "คำถามชวนคิด" และ "ข้อเสนอ"
6. topPriorities เรียงตาม gap จากมากไปน้อย สูงสุด 10 รายการ
7. plcQuestions ต้องเป็นคำถามที่ครู/ผู้บริหารใช้ในวง PLC ได้จริง 3-8 ข้อ
8. growthPlan90 แบ่งเป็น day30/day60/day90 มีกิจกรรมที่ทำได้จริง

Output: JSON เท่านั้น ตามโครงสร้างที่กำหนด ไม่มีคำพูดอื่น`;

export interface SoarPromptInput {
  schoolNameTh: string;
  academicYearLabel: string;
  termLabel: string | null;
  evaluatorName: string;
  responses: Array<{
    indicatorId: number;
    code: string | null;
    text: string;
    qDimension: string; // 'Q-Leadership' | 'Q-PLC' | ...
    score: number | null; // desired
    score2: number | null; // current
    comment: string | null;
  }>;
  sarDocuments: Array<{
    documentId: number;
    level: string;
    note: string; // e.g. "available as evidence base; cite documentId+pageId when quoting"
    bodyText?: string | null; // qualitative text submitted directly by user (no PDF)
  }>;
}

export function buildSoarUserPrompt(input: SoarPromptInput): string {
  const lines: string[] = [];
  lines.push(`# บริบทการประเมิน`);
  lines.push(`โรงเรียน: ${input.schoolNameTh}`);
  lines.push(`ปีการศึกษา: ${input.academicYearLabel}${input.termLabel ? ` ภาคเรียน ${input.termLabel}` : ''}`);
  lines.push(`ผู้ประเมิน: ${input.evaluatorName}`);
  lines.push('');

  if (input.sarDocuments.length > 0) {
    lines.push(`# เอกสาร SAR ที่ใช้เป็นหลักฐาน (Approved)`);
    for (const d of input.sarDocuments) {
      const sources: string[] = [];
      if (d.bodyText) sources.push('ข้อความที่โรงเรียนพิมพ์เข้ามา (อยู่ในส่วน "ข้อความ SAR" ด้านล่าง)');
      // Note: PDFs are passed as inline files — no flag in this DTO; assume present unless bodyText-only
      sources.push('PDF (อาจแนบมาด้านบน หรือไม่มีถ้าเป็น text-only)');
      lines.push(`- documentId=${d.documentId} (${d.level}) — ${d.note} · แหล่งที่มา: ${sources.join(' + ')}`);
    }
    lines.push('PDF ของเอกสาร SAR (ถ้ามี) ถูกแนบให้แล้วในรูปแบบ fileData. เมื่ออ้างอิงให้ระบุ documentId และเลขหน้า (pageId หากทราบ).');

    // Inline body text for text-only or text-augmented docs
    const docsWithText = input.sarDocuments.filter((d) => !!d.bodyText);
    if (docsWithText.length > 0) {
      lines.push('');
      lines.push(`# ข้อความ SAR ที่โรงเรียนพิมพ์ส่งโดยตรง (ข้อมูลเชิงคุณภาพ baseline)`);
      for (const d of docsWithText) {
        lines.push(`\n## documentId=${d.documentId} (${d.level})`);
        lines.push(d.bodyText!);
      }
      lines.push('');
      lines.push('เมื่ออ้างถึงข้อความเหล่านี้ ให้ระบุ documentId และคำว่า "ข้อความ" (ไม่มี pageId).');
    }
  } else {
    lines.push(`# เอกสาร SAR: ยังไม่มี`);
    lines.push('ทุก Item ต้องตั้ง evidenceMissing=true และระบุข้อความว่า "หลักฐานไม่พอ — ต้องการ X" ใน text.');
  }
  lines.push('');

  // Group by dimension
  const byDim: Record<string, typeof input.responses> = {};
  for (const r of input.responses) {
    (byDim[r.qDimension] ??= []).push(r);
  }
  lines.push(`# ผลคะแนนตัวชี้วัด (score = พึงประสงค์/Desired, score2 = เป็นอยู่/Current)`);
  for (const [dim, rows] of Object.entries(byDim)) {
    lines.push(`\n## ${dim} (${rows.length} ตัวชี้วัด)`);
    for (const r of rows) {
      const s = r.score ?? '-';
      const s2 = r.score2 ?? '-';
      const gap = (r.score ?? 0) - (r.score2 ?? 0);
      lines.push(
        `- [${r.code ?? '?'}] (id=${r.indicatorId}) current=${s2} desired=${s} gap=${gap}: ${r.text}` +
          (r.comment ? `  // comment: ${r.comment}` : '')
      );
    }
  }

  lines.push('');
  lines.push(`# คำสั่ง`);
  lines.push(`สังเคราะห์ตามโครงสร้าง JSON ที่กำหนด ตอบเป็นภาษาไทยทั้งหมด รักษาหลักการเคร่งครัดข้างต้น`);

  return lines.join('\n');
}
