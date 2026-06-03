// lib/ai/prompts/exec-summary.ts
// Prompt builder for the Executive Summary (บทสรุปสำหรับผู้บริหาร) run.
// Combines a per-dimension Q-Model scoreboard (quantitative) with the school's
// Iceberg brainstorm text (qualitative) into a leadership-facing brief.

export const EXEC_SUMMARY_PROMPT_VERSION = 'exec-summary-v1';

export const EXEC_SUMMARY_SYSTEM_PROMPT = `คุณคือผู้ช่วยจัดทำ "บทสรุปสำหรับผู้บริหาร" (Executive Summary) ของโรงเรียนพัฒนาตนเอง ตามกรอบการประเมิน Q-Model 4 มิติ: Q-Leadership (ผู้บริหาร), Q-PLC (ชุมชนแห่งการเรียนรู้วิชาชีพ), Q-Learning (การจัดการเรียนรู้), Q-Students (ด้านนักเรียน).

หน้าที่ของคุณคือสังเคราะห์ข้อมูล 2 ชนิดเข้าด้วยกัน:
1. ข้อมูลเชิงปริมาณ (Quantitative): คะแนนผลการประเมินแต่ละมิติ — สภาพที่เป็นอยู่ (current), เป้าหมายพึงประสงค์ (target), ช่องว่าง (gap = target − current) และร้อยละความก้าวหน้า (progress)
2. ข้อมูลเชิงคุณภาพ (Qualitative): ผลการระดมสมองแบบ Iceberg Model 4 ชั้น (สถานการณ์ → รูปแบบ → โครงสร้าง → แบบจำลองวิธีคิด) ทั้งด้าน "สิ่งที่เป็นอยู่" และ "สิ่งที่อยากให้เป็น"

หลักการเคร่งครัด:
1. ห้ามแก้ไขหรือสร้างคะแนนใหม่ — ใช้ตัวเลขที่ให้มาตามจริง
2. ห้ามตัดสินคุณภาพโรงเรียนแทนมนุษย์ — คุณเป็น "ผู้ช่วยสรุป" ไม่ใช่ "กรรมการ" ใช้ถ้อยคำสุภาพ ไม่กล่าวโทษบุคคล
3. ข้ออภิปราย (discussion) ต้อง "เชื่อมโยง" ตัวเลขเชิงปริมาณกับประเด็นเชิงคุณภาพอย่างชัดเจน เช่น มิติที่ gap สูงสอดคล้องกับโครงสร้าง/วิธีคิดใดที่พบในการระดมสมอง
4. ห้ามสรุปเกินกว่าข้อมูลที่ปรากฏ ถ้าข้อมูลไม่พอให้ระบุว่า "ข้อมูลยังไม่เพียงพอ"
5. ข้อเสนอแนะ (recommendations) ต้องนำไปปฏิบัติได้จริงในระดับโรงเรียน และอ้างอิงกลับไปยังมิติ/ชั้น Iceberg ที่เป็นต้นเหตุ
6. ใช้ภาษาไทยทั้งหมด กระชับ เหมาะกับผู้บริหารอ่านเร็ว

Output: JSON เท่านั้น ตามโครงสร้างที่กำหนด ห้ามมีคำพูดหรือคำอธิบายนอก JSON`;

export interface ExecSummaryDimension {
  dimension: string; // 'Q-Leadership' | ...
  labelTh: string;
  current: number | null; // normalized percent 0-100 (avg score2)
  target: number | null; // normalized percent 0-100 (avg score)
  gap: number | null; // target - current (percentage points)
  progress: number | null; // current/target*100, clipped 0-120
  status: 'green' | 'yellow' | 'red' | 'none';
  responseCount: number; // number of EvaluationResponse rows behind this dimension
}

export interface ExecSummaryPromptInput {
  schoolNameTh: string;
  academicYearLabel: string;
  scoreboard: ExecSummaryDimension[];
  // Rendered brainstorm text (from bodyText / Iceberg). Empty string if none.
  qualitativeText: string;
}

const STATUS_TH: Record<string, string> = {
  green: 'เขียว (≥90%)',
  yellow: 'เหลือง (70-89%)',
  red: 'แดง (<70%)',
  none: 'ยังไม่มีข้อมูล',
};

export function buildExecSummaryUserPrompt(input: ExecSummaryPromptInput): string {
  const lines: string[] = [];
  lines.push('# บริบท');
  lines.push(`โรงเรียน: ${input.schoolNameTh}`);
  lines.push(`ปีการศึกษา: ${input.academicYearLabel}`);
  lines.push('');

  lines.push('# ข้อมูลเชิงปริมาณ — คะแนนการประเมิน Q-Model (ร้อยละ 0-100)');
  lines.push('current = สภาพที่เป็นอยู่, target = เป้าหมายพึงประสงค์, gap = target − current, progress = current/target');
  const hasAnyScore = input.scoreboard.some((d) => d.responseCount > 0);
  if (!hasAnyScore) {
    lines.push('- ยังไม่มีผลการประเมินสำหรับโรงเรียน/ปีนี้ (ให้ระบุว่าข้อมูลเชิงปริมาณยังไม่เพียงพอ)');
  } else {
    for (const d of input.scoreboard) {
      if (d.responseCount === 0) {
        lines.push(`- ${d.labelTh}: ยังไม่มีข้อมูลการประเมิน`);
        continue;
      }
      lines.push(
        `- ${d.labelTh}: current=${d.current ?? '-'}% target=${d.target ?? '-'}% gap=${d.gap ?? '-'} progress=${d.progress ?? '-'}% สถานะ=${STATUS_TH[d.status] || d.status} (จาก ${d.responseCount} คำตอบ)`,
      );
    }
  }
  lines.push('');

  lines.push('# ข้อมูลเชิงคุณภาพ — ผลการระดมสมอง (Iceberg Model)');
  if (input.qualitativeText.trim().length > 0) {
    lines.push(input.qualitativeText.trim());
  } else {
    lines.push('(ยังไม่มีข้อมูลการระดมสมอง — ให้ระบุว่าข้อมูลเชิงคุณภาพยังไม่เพียงพอ)');
  }
  lines.push('');

  lines.push('# คำสั่ง');
  lines.push(
    'จัดทำบทสรุปสำหรับผู้บริหารตามโครงสร้าง JSON ที่กำหนด โดย:',
  );
  lines.push('- executiveSummary: ภาพรวม 1-3 ย่อหน้า ที่ผู้บริหารอ่านแล้วเข้าใจสถานการณ์ทันที');
  lines.push('- quantitativeFindings: ข้อค้นพบจากตัวเลข (เน้นมิติที่ gap สูง/ต่ำ และสถานะไฟจราจร)');
  lines.push('- qualitativeFindings: ประเด็นเด่นจากการระดมสมอง (อ้างอิงชั้น Iceberg)');
  lines.push('- discussion: อภิปรายผลโดยเชื่อมโยงตัวเลขกับประเด็นเชิงคุณภาพให้เห็นเหตุและผล');
  lines.push('- recommendations: ข้อเสนอแนะที่ปฏิบัติได้จริง เรียงตามความสำคัญ');
  lines.push('ตอบเป็นภาษาไทยทั้งหมด รักษาหลักการเคร่งครัดข้างต้น');

  return lines.join('\n');
}
