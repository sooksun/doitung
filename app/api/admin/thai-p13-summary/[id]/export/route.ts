// app/api/admin/thai-p13-summary/[id]/export/route.ts
// GET ?format=xlsx|docx — download the stored THAI_P1_3 AI summary as an Excel
// or Word file. Content = AI brief + per-dimension score table + reflection digest.
// (PDF is produced by the print page /admin/thai-summary/[id]/print → browser print.)

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, requireRole } from '@/lib/api-utils';
import type { ThaiSummaryResult } from '@/lib/jobs/run-thai-p13-summary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const scopeLabel = (s: string) => (s === 'individual' ? 'รายบุคคล' : s === 'school' ? 'รายโรงเรียน' : 'ภาพรวมโครงการ');
const num = (v: number | null | undefined) => (v == null ? '-' : v.toFixed(2));
const termLabel = (t: number) => (t === 1 ? 'ครั้งที่ 1 (เป้าหมายต้นปี)' : 'ครั้งที่ 2 (ทบทวนปลายปี)');

function asciiName(scope: string, scopeId: number, year: string, ext: string) {
  return `THAI_P1-3_summary_${scope}_${scopeId}_${year || 'NA'}.${ext}`;
}

async function buildXlsx(r: ThaiSummaryResult): Promise<Buffer> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DOITUNG-DE';

  // Sheet 1: สรุป AI
  const s1 = wb.addWorksheet('บทสรุป AI');
  s1.columns = [{ width: 22 }, { width: 90 }];
  const titleRow = s1.addRow(['บทสรุปผลการประเมินภาษาไทย ป.1–3']);
  titleRow.font = { bold: true, size: 16 };
  s1.addRow([]);
  s1.addRow(['ระดับการสรุป', scopeLabel(r.scope)]);
  s1.addRow(['หน่วยที่สรุป', r.subjectLabel]);
  s1.addRow(['ปีการศึกษา', r.academicYearLabel]);
  s1.addRow(['จำนวนครู', String(r.teacherCount)]);
  if (r.schoolCount != null) s1.addRow(['จำนวนโรงเรียน', String(r.schoolCount)]);
  s1.addRow([]);
  const addBlock = (title: string, body: string | string[]) => {
    const h = s1.addRow([title]);
    h.font = { bold: true, size: 13 };
    if (Array.isArray(body)) body.forEach((b, i) => s1.addRow(['', `${i + 1}. ${b}`]));
    else s1.addRow(['', body]);
    s1.addRow([]);
  };
  addBlock('บทสรุปผู้บริหาร', r.ai.executiveSummary);
  addBlock('จุดแข็ง', r.ai.strengths);
  addBlock('จุดที่ควรพัฒนา', r.ai.improvements);
  if (r.ai.reflectionInsights.length) addBlock('ประเด็นจากการสะท้อนคิด', r.ai.reflectionInsights);
  addBlock('ข้อเสนอแนะ', r.ai.recommendations);
  s1.eachRow((row) => row.eachCell((c) => { c.alignment = { wrapText: true, vertical: 'top' }; }));

  // Sheet 2: คะแนนรายด้าน
  const s2 = wb.addWorksheet('คะแนนรายด้าน');
  s2.columns = [
    { header: 'ด้าน', key: 'd', width: 40 },
    { header: 'ครูประเมินตนเอง', key: 'self', width: 18 },
    { header: 'ผอ.ประเมิน', key: 'dir', width: 16 },
    { header: 'ค่าเป้าหมาย', key: 'tgt', width: 14 },
    { header: 'จำนวนคำตอบ', key: 'cnt', width: 14 },
  ];
  s2.getRow(1).font = { bold: true };
  for (const d of r.scoreboard) s2.addRow({ d: d.sectionName, self: num(d.selfAvg), dir: num(d.directorAvg), tgt: num(d.targetAvg), cnt: d.responseCount });

  // Sheet 3: การสะท้อนคิด
  const s3 = wb.addWorksheet('การสะท้อนคิด');
  s3.columns = [
    { header: 'ด้าน', key: 'sec', width: 36 },
    { header: 'ครั้งที่', key: 'term', width: 22 },
    { header: 'ข้อความ', key: 'txt', width: 90 },
  ];
  s3.getRow(1).font = { bold: true };
  for (const rf of r.reflections) s3.addRow({ sec: rf.sectionName, term: termLabel(rf.term), txt: rf.text });
  s3.eachRow((row) => row.getCell(3).alignment = { wrapText: true, vertical: 'top' });

  return Buffer.from(await wb.xlsx.writeBuffer());
}

async function buildDocx(r: ThaiSummaryResult): Promise<Buffer> {
  const docx = await import('docx');
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } = docx;
  const FONT = 'TH Sarabun New';
  const run = (text: string, bold = false, size = 30) => new TextRun({ text, bold, font: FONT, size });
  const para = (text: string, opts?: { bold?: boolean; size?: number; align?: any }) =>
    new Paragraph({ children: [run(text, opts?.bold, opts?.size)], alignment: opts?.align, spacing: { after: 120 } });
  const heading = (text: string) => new Paragraph({ children: [run(text, true, 34)], spacing: { before: 240, after: 120 } });
  const bullet = (text: string) => new Paragraph({ children: [run(text)], bullet: { level: 0 }, spacing: { after: 60 } });

  const cell = (text: string, bold = false, width?: number) =>
    new TableCell({
      width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
      children: [new Paragraph({ children: [run(text, bold, 28)] })],
    });
  const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
  const tblBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder, insideHorizontal: thinBorder, insideVertical: thinBorder };

  const scoreTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tblBorders,
    rows: [
      new TableRow({ tableHeader: true, children: [cell('ด้าน', true, 40), cell('ครูประเมินตนเอง', true, 16), cell('ผอ.ประเมิน', true, 16), cell('ค่าเป้าหมาย', true, 14), cell('จำนวนคำตอบ', true, 14)] }),
      ...r.scoreboard.map((d) => new TableRow({ children: [cell(d.sectionName), cell(num(d.selfAvg)), cell(num(d.directorAvg)), cell(num(d.targetAvg)), cell(String(d.responseCount))] })),
    ],
  });

  const children: any[] = [
    para('บทสรุปผลการประเมินการจัดการเรียนการสอนภาษาไทย ป.1–3', { bold: true, size: 40, align: AlignmentType.CENTER }),
    para(`ระดับการสรุป: ${scopeLabel(r.scope)}  ·  หน่วย: ${r.subjectLabel}`, { align: AlignmentType.CENTER }),
    para(`ปีการศึกษา ${r.academicYearLabel}  ·  ครู ${r.teacherCount} คน${r.schoolCount != null ? `  ·  ${r.schoolCount} โรงเรียน` : ''}`, { align: AlignmentType.CENTER }),
    heading('บทสรุปผู้บริหาร'),
    para(r.ai.executiveSummary),
    heading('จุดแข็ง'),
    ...r.ai.strengths.map(bullet),
    heading('จุดที่ควรพัฒนา'),
    ...r.ai.improvements.map(bullet),
  ];
  if (r.ai.reflectionInsights.length) { children.push(heading('ประเด็นสำคัญจากการสะท้อนคิด')); children.push(...r.ai.reflectionInsights.map(bullet)); }
  children.push(heading('ข้อเสนอแนะ'), ...r.ai.recommendations.map(bullet));
  children.push(heading('ตารางคะแนนเฉลี่ยรายด้าน (มาตรา 1–4)'), scoreTable);

  if (r.reflections.length) {
    children.push(heading('การสะท้อนคิดของครู'));
    for (const rf of r.reflections) {
      children.push(para(`[${rf.sectionName} · ${termLabel(rf.term)}]`, { bold: true, size: 28 }));
      children.push(para(rf.text, { size: 28 }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return await Packer.toBuffer(doc);
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, 'ADMIN');
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return errorResponse('Invalid id', 400);
    const format = (request.nextUrl.searchParams.get('format') || 'xlsx').toLowerCase();
    if (format !== 'xlsx' && format !== 'docx') return errorResponse('format ต้องเป็น xlsx หรือ docx', 400);

    const row = await prisma.thaiP13Summary.findUnique({ where: { id } });
    if (!row) return errorResponse('ไม่พบบทสรุป', 404);
    if (row.status !== 'DONE' || !row.result) return errorResponse('บทสรุปยังไม่เสร็จ — กรุณารอให้ AI ประมวลผลก่อน', 409);

    const r = row.result as unknown as ThaiSummaryResult;
    const filename = asciiName(row.scope, row.scopeId, r.academicYearLabel, format);

    if (format === 'xlsx') {
      const buf = await buildXlsx(r);
      return new Response(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }
    const buf = await buildDocx(r);
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse(String(error?.message || error), 500);
  }
}
