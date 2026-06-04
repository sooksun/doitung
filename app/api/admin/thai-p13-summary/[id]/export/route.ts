// app/api/admin/thai-p13-summary/[id]/export/route.ts
// GET ?format=xlsx|docx — download a stored THAI_P1_3 summary (leadership OR
// supervision brief) as Excel or Word. Content = AI sections (via summarySections)
// + per-dimension score table + reflection digest.
// (PDF is produced by the print page → browser print.)

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, requireRole } from '@/lib/api-utils';
import { summarySections, summaryDocTitle } from '@/lib/thai-summary-sections';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const num = (v: number | null | undefined) => (v == null ? '-' : Number(v).toFixed(2));
const termLabel = (t: number) => (t === 1 ? 'ครั้งที่ 1 (เป้าหมายต้นปี)' : 'ครั้งที่ 2 (ทบทวนปลายปี)');

function scopeLabel(scope: string) {
  if (scope === 'individual') return 'รายบุคคล';
  if (scope === 'school') return 'รายโรงเรียน';
  if (scope === 'project') return 'ภาพรวมโครงการ';
  if (scope === 'supervision-t1') return 'นิเทศ ครั้งที่ 1';
  if (scope === 'supervision-t2') return 'นิเทศ ครั้งที่ 2';
  return scope;
}

// [label, value] pairs that exist on this result (leadership vs supervision).
function metaPairs(r: any): [string, string][] {
  const pairs: [string, string][] = [['หน่วยที่สรุป', r.subjectLabel || '-']];
  if (r.schoolName) pairs.push(['โรงเรียน', r.schoolName]);
  pairs.push(['ปีการศึกษา', `${r.academicYearLabel || '-'}${r.termLabel ? ` · ภาคเรียน ${r.termLabel}` : ''}`]);
  if (r.kind === 'supervision' && r.round) pairs.push(['การประเมินครั้งที่', String(r.round)]);
  if (r.kind !== 'supervision' && r.teacherCount != null) pairs.push(['จำนวนครู', String(r.teacherCount)]);
  if (r.schoolCount != null) pairs.push(['จำนวนโรงเรียน', String(r.schoolCount)]);
  return pairs;
}

function asciiName(scope: string, scopeId: number, year: string, ext: string) {
  return `THAI_P1-3_${scope}_${scopeId}_${year || 'NA'}.${ext}`;
}

async function buildXlsx(r: any): Promise<Buffer> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DOITUNG-DE';

  const s1 = wb.addWorksheet('บทสรุป AI');
  s1.columns = [{ width: 22 }, { width: 90 }];
  s1.addRow([summaryDocTitle(r)]).font = { bold: true, size: 16 };
  s1.addRow([]);
  s1.addRow(['ประเภท', scopeLabel(r.scope)]);
  for (const [k, v] of metaPairs(r)) s1.addRow([k, v]);
  s1.addRow([]);
  for (const sec of summarySections(r)) {
    s1.addRow([sec.title]).font = { bold: true, size: 13 };
    if (sec.items) sec.items.forEach((b, i) => s1.addRow(['', `${i + 1}. ${b}`]));
    else if (sec.text) s1.addRow(['', sec.text]);
    s1.addRow([]);
  }
  s1.eachRow((row) => row.eachCell((c) => { c.alignment = { wrapText: true, vertical: 'top' }; }));

  const s2 = wb.addWorksheet('คะแนนรายด้าน');
  s2.columns = [
    { header: 'ด้าน', key: 'd', width: 40 },
    { header: 'ครูประเมินตนเอง', key: 'self', width: 18 },
    { header: 'ผอ.ประเมิน', key: 'dir', width: 16 },
    { header: 'ค่าเป้าหมาย', key: 'tgt', width: 14 },
    { header: 'จำนวนคำตอบ', key: 'cnt', width: 14 },
  ];
  s2.getRow(1).font = { bold: true };
  for (const d of r.scoreboard || []) s2.addRow({ d: d.sectionName, self: num(d.selfAvg), dir: num(d.directorAvg), tgt: num(d.targetAvg), cnt: d.responseCount });

  const s3 = wb.addWorksheet('การสะท้อนคิด');
  const hasTerm = (r.reflections || []).some((x: any) => x.term != null);
  s3.columns = hasTerm
    ? [{ header: 'ด้าน', key: 'sec', width: 36 }, { header: 'ครั้งที่', key: 'term', width: 22 }, { header: 'ข้อความ', key: 'txt', width: 90 }]
    : [{ header: 'ด้าน', key: 'sec', width: 36 }, { header: 'ข้อความ', key: 'txt', width: 90 }];
  s3.getRow(1).font = { bold: true };
  for (const rf of r.reflections || []) s3.addRow(hasTerm ? { sec: rf.sectionName, term: termLabel(rf.term), txt: rf.text } : { sec: rf.sectionName, txt: rf.text });
  s3.eachRow((row) => { const c = row.getCell(hasTerm ? 3 : 2); c.alignment = { wrapText: true, vertical: 'top' }; });

  return Buffer.from(await wb.xlsx.writeBuffer());
}

async function buildDocx(r: any): Promise<Buffer> {
  const docx = await import('docx');
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } = docx;
  const FONT = 'TH Sarabun New';
  const run = (text: string, bold = false, size = 30) => new TextRun({ text, bold, font: FONT, size });
  const para = (text: string, opts?: { bold?: boolean; size?: number; align?: any }) => new Paragraph({ children: [run(text, opts?.bold, opts?.size)], alignment: opts?.align, spacing: { after: 120 } });
  const heading = (text: string) => new Paragraph({ children: [run(text, true, 34)], spacing: { before: 240, after: 120 } });
  const bullet = (text: string) => new Paragraph({ children: [run(text)], bullet: { level: 0 }, spacing: { after: 60 } });
  const cell = (text: string, bold = false, width?: number) => new TableCell({ width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined, children: [new Paragraph({ children: [run(text, bold, 28)] })] });
  const tb = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
  const borders = { top: tb, bottom: tb, left: tb, right: tb, insideHorizontal: tb, insideVertical: tb };

  const scoreTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders,
    rows: [
      new TableRow({ tableHeader: true, children: [cell('ด้าน', true, 40), cell('ครูประเมินตนเอง', true, 16), cell('ผอ.ประเมิน', true, 16), cell('ค่าเป้าหมาย', true, 14), cell('จำนวนคำตอบ', true, 14)] }),
      ...(r.scoreboard || []).map((d: any) => new TableRow({ children: [cell(d.sectionName), cell(num(d.selfAvg)), cell(num(d.directorAvg)), cell(num(d.targetAvg)), cell(String(d.responseCount))] })),
    ],
  });

  const meta = metaPairs(r).map(([k, v]) => `${k}: ${v}`).join('  ·  ');
  const children: any[] = [
    para(summaryDocTitle(r), { bold: true, size: 40, align: AlignmentType.CENTER }),
    para(`${scopeLabel(r.scope)}  ·  ${meta}`, { align: AlignmentType.CENTER }),
  ];
  for (const sec of summarySections(r)) {
    children.push(heading(sec.title));
    if (sec.items) children.push(...sec.items.map(bullet));
    else if (sec.text) children.push(para(sec.text));
  }
  children.push(heading('ตารางคะแนนเฉลี่ยรายด้าน (มาตรา 1–4)'), scoreTable);

  if ((r.reflections || []).length) {
    children.push(heading('การสะท้อนคิดของครู'));
    for (const rf of r.reflections) {
      const head = rf.term != null ? `[${rf.sectionName} · ${termLabel(rf.term)}]` : `[${rf.sectionName}]`;
      children.push(para(head, { bold: true, size: 28 }));
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

    const r = row.result as any;
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
