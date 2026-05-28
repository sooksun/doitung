// app/api/admin/sar-documents/route.ts
// GET  list (filtered by schoolId, year)
// POST upload (multipart) — creates SarDocument + first SarDocumentVersion + writes file to disk

import { NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  requireAuth,
  hasRole,
  parseIntParam,
} from '@/lib/api-utils';
import { requireFeature } from '@/lib/feature-flags';
import { logAudit } from '@/lib/audit';

const ALLOWED_LEVELS = new Set(['EARLY_CHILDHOOD', 'BASIC_EDUCATION']);
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

function uploadsRoot() {
  return path.join(process.cwd(), 'public', 'uploads', 'sar');
}

interface IcebergLayer { current: string; desired: string }
interface Iceberg {
  situations: IcebergLayer;
  patterns: IcebergLayer;
  structures: IcebergLayer;
  mentalModels: IcebergLayer;
}

function parseIceberg(raw: unknown): Iceberg | null {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const layer = (k: string): IcebergLayer => {
    const l = parsed[k];
    return {
      current: typeof l?.current === 'string' ? l.current.trim() : '',
      desired: typeof l?.desired === 'string' ? l.desired.trim() : '',
    };
  };
  return {
    situations: layer('situations'),
    patterns: layer('patterns'),
    structures: layer('structures'),
    mentalModels: layer('mentalModels'),
  };
}

function icebergHasContent(ic: Iceberg): boolean {
  return (
    ic.situations.current.length > 0 || ic.situations.desired.length > 0 ||
    ic.patterns.current.length > 0 || ic.patterns.desired.length > 0 ||
    ic.structures.current.length > 0 || ic.structures.desired.length > 0 ||
    ic.mentalModels.current.length > 0 || ic.mentalModels.desired.length > 0
  );
}

// Render the structured Iceberg input as a Thai-language plain-text body.
// This is what gets indexed into SarPage by the extract-or-ocr job, fed to SOAR
// as evidence base, and shown to legacy consumers that only know about bodyText.
function renderIcebergAsText(ic: Iceberg): string {
  const sections: Array<[string, IcebergLayer]> = [
    ['ชั้น 1: สถานการณ์ (สิ่งที่เห็นเกิดขึ้น)', ic.situations],
    ['ชั้น 2: รูปแบบของปัญหา (สิ่งที่เกิดซ้ำ)', ic.patterns],
    ['ชั้น 3: โครงสร้าง (กลไก/นโยบาย/ระบบที่ค้ำไว้)', ic.structures],
    ['ชั้น 4: แบบจำลองวิธีคิด (ความเชื่อ/ค่านิยมที่ฝังลึก)', ic.mentalModels],
  ];
  const out: string[] = [];
  for (const [title, layer] of sections) {
    if (layer.current.length === 0 && layer.desired.length === 0) continue;
    out.push(`## ${title}`);
    if (layer.current.length > 0) {
      out.push('สิ่งที่เป็นอยู่:');
      out.push(layer.current);
    }
    if (layer.desired.length > 0) {
      out.push('');
      out.push('สิ่งที่อยากให้เป็น:');
      out.push(layer.desired);
    }
    out.push('');
  }
  return out.join('\n').trim();
}

async function userMaySchool(userId: number, schoolId: number, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true;
  const t = await prisma.teacher.findUnique({ where: { userId } });
  return !!t && t.schoolId === schoolId;
}

export async function GET(request: NextRequest) {
  try {
    const me = await requireAuth(request);
    const sp = request.nextUrl.searchParams;
    const schoolId = parseIntParam(sp, 'schoolId');
    const academicYearId = parseIntParam(sp, 'academicYearId');

    const where: any = {};
    if (schoolId) where.schoolId = schoolId;
    if (academicYearId) where.academicYearId = academicYearId;

    if (!hasRole(me, 'ADMIN')) {
      const t = await prisma.teacher.findUnique({ where: { userId: me.id } });
      if (!t) return errorResponse('Forbidden: ไม่ได้ผูกกับโรงเรียน', 403);
      where.schoolId = t.schoolId;
    }

    // Soft-deleted rows live as status=ARCHIVED. Hide them from the default
    // listing — admins who need them back can pass ?includeArchived=true.
    const includeArchived = sp.get('includeArchived') === 'true';
    if (!includeArchived) {
      where.status = { not: 'ARCHIVED' };
    }

    const docs = await prisma.sarDocument.findMany({
      where,
      orderBy: [{ academicYearId: 'desc' }, { level: 'asc' }],
      include: {
        academicYear: { select: { year: true } },
        school: { select: { code: true, nameTh: true, name: true } },
        uploadedBy: { select: { name: true, email: true } },
        approvedBy: { select: { name: true, email: true } },
        _count: { select: { pages: true, versions: true } },
      },
    });

    return successResponse({
      items: docs.map((d) => ({
        id: d.id,
        schoolId: d.schoolId,
        schoolCode: d.school?.code,
        schoolName: d.school?.nameTh || d.school?.name,
        academicYearId: d.academicYearId,
        academicYear: d.academicYear?.year,
        level: d.level,
        originalFilename: d.originalFilename,
        hasFile: !!d.filePath,
        hasBodyText: !!d.bodyText,
        bodyTextLength: d.bodyText ? d.bodyText.length : 0,
        hasIceberg: !!(d as any).bodyIceberg,
        status: d.status,
        extractionMethod: d.extractionMethod,
        textQualityScore: d.textQualityScore,
        pageCount: d.pageCount,
        pagesStored: d._count.pages,
        versions: d._count.versions,
        uploadedBy: d.uploadedBy?.name,
        approvedBy: d.approvedBy?.name,
        approvedAt: d.approvedAt,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        errorMessage: d.errorMessage,
      })),
      total: docs.length,
    });
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const me = await requireAuth(request);
    const isAdmin = hasRole(me, 'ADMIN');
    // TEACHER is included here because the brainstorm flow at /admin/sar/:id
    // is collaborative — teachers (not just leaders) own the Iceberg cells and
    // sticky-note board for their school. Without TEACHER in the allowlist,
    // editing the board worked but pressing "บันทึกเวอร์ชันใหม่" returned 403.
    // School scoping is still enforced by `userMaySchool` below: a teacher can
    // only save SARs for the school their Teacher row is bound to.
    if (
      !isAdmin &&
      !hasRole(me, 'SCHOOL_LEADER') &&
      !hasRole(me, 'SCHOOL_ADMIN') &&
      !hasRole(me, 'TEACHER')
    ) {
      return errorResponse(
        'Forbidden: ต้องเป็น admin / school admin / ผู้บริหาร / ครู',
        403,
      );
    }

    const form = await request.formData();
    const schoolIdRaw = form.get('schoolId');
    const academicYearIdRaw = form.get('academicYearId');
    const level = String(form.get('level') || '');
    const changeNote = String(form.get('changeNote') || '');
    const file = form.get('file');
    const bodyTextRaw = form.get('bodyText');
    const bodyIcebergRaw = form.get('bodyIceberg');

    if (!schoolIdRaw || !academicYearIdRaw || !level || !ALLOWED_LEVELS.has(level)) {
      return errorResponse('Missing or invalid fields: schoolId, academicYearId, level', 400);
    }

    const hasFile = file instanceof File && file.size > 0;
    // bodyIceberg is the new structured input. If present, it derives bodyText.
    // bodyText is still accepted for backward compatibility with older callers.
    const iceberg = parseIceberg(bodyIcebergRaw);
    const hasIceberg = !!iceberg && icebergHasContent(iceberg);
    let bodyText = typeof bodyTextRaw === 'string' ? bodyTextRaw.trim() : '';
    if (hasIceberg) {
      bodyText = renderIcebergAsText(iceberg!);
    }
    const hasBodyText = bodyText.length > 0;

    if (!hasFile && !hasIceberg && !hasBodyText) {
      return errorResponse('ต้องส่งไฟล์ PDF หรือกรอกอย่างน้อย 1 ช่อง Iceberg', 400);
    }
    if (hasBodyText && !hasIceberg && bodyText.length < 10) {
      return errorResponse('ข้อความ SAR ต้องมีอย่างน้อย 10 ตัวอักษร', 400);
    }
    if (hasFile) {
      if ((file as File).size > MAX_BYTES) return errorResponse(`File too large (max ${MAX_BYTES} bytes)`, 413);
      if (!(file as File).name.toLowerCase().endsWith('.pdf')) return errorResponse('Only PDF files are accepted', 400);
    }

    const schoolId = parseInt(String(schoolIdRaw), 10);
    const academicYearId = parseInt(String(academicYearIdRaw), 10);

    if (!(await userMaySchool(me.id, schoolId, isAdmin))) {
      return errorResponse('Forbidden: ไม่มีสิทธิ์อัปโหลดให้โรงเรียนนี้', 403);
    }
    await requireFeature(schoolId, 'sarEnabled');

    // Find existing document for the school/year/level
    const existing = await prisma.sarDocument.findUnique({
      where: { schoolId_academicYearId_level: { schoolId, academicYearId, level: level as any } },
      include: { versions: { orderBy: { versionNo: 'desc' }, take: 1 } },
    });

    const versionNo = existing ? (existing.versions[0]?.versionNo ?? 0) + 1 : 1;

    // Field carry-forward: a submission that updates only one field (file / iceberg)
    // preserves the others from the previous state, so versions are full snapshots.
    let nextFilePath: string | null = existing?.filePath ?? null;
    let nextOriginalFilename: string | null = existing?.originalFilename ?? null;
    let nextBodyText: string | null = existing?.bodyText ?? null;
    let nextBodyIceberg: any = (existing as any)?.bodyIceberg ?? null;

    if (hasFile) {
      const f = file as File;
      const dir = path.join(uploadsRoot(), String(schoolId), String(academicYearId), level);
      fs.mkdirSync(dir, { recursive: true });
      const fileName = `v${versionNo}.pdf`;
      const fullPath = path.join(dir, fileName);
      const arrayBuf = await f.arrayBuffer();
      fs.writeFileSync(fullPath, Buffer.from(arrayBuf));
      nextFilePath = `/uploads/sar/${schoolId}/${academicYearId}/${level}/${fileName}`;
      nextOriginalFilename = f.name;
    }

    if (hasIceberg) {
      nextBodyIceberg = iceberg;
      nextBodyText = bodyText; // already rendered from iceberg above
    } else if (hasBodyText) {
      nextBodyText = bodyText;
    }

    let doc;
    if (existing) {
      doc = await prisma.sarDocument.update({
        where: { id: existing.id },
        data: {
          filePath: nextFilePath,
          originalFilename: nextOriginalFilename,
          bodyText: nextBodyText,
          bodyIceberg: nextBodyIceberg ?? undefined,
          status: 'UPLOADED',
          extractionMethod: null,
          textQualityScore: null,
          pageCount: null,
          uploadedById: me.id,
          approvedById: null,
          approvedAt: null,
          errorMessage: null,
        },
      });
      await prisma.sarDocumentVersion.create({
        data: {
          documentId: existing.id,
          versionNo,
          filePath: nextFilePath,
          bodyText: nextBodyText,
          bodyIceberg: nextBodyIceberg ?? undefined,
          createdById: me.id,
          changeNote: changeNote || null,
        },
      });
    } else {
      doc = await prisma.sarDocument.create({
        data: {
          schoolId,
          academicYearId,
          level: level as any,
          originalFilename: nextOriginalFilename,
          filePath: nextFilePath,
          bodyText: nextBodyText,
          bodyIceberg: nextBodyIceberg ?? undefined,
          status: 'UPLOADED',
          uploadedById: me.id,
        },
      });
      await prisma.sarDocumentVersion.create({
        data: {
          documentId: doc.id,
          versionNo: 1,
          filePath: nextFilePath,
          bodyText: nextBodyText,
          bodyIceberg: nextBodyIceberg ?? undefined,
          createdById: me.id,
          changeNote: changeNote || null,
        },
      });
    }

    await logAudit({
      userId: me.id,
      action: existing ? 'SAR_REUPLOAD' : 'SAR_UPLOAD',
      entityType: 'SarDocument',
      entityId: doc.id,
      after: {
        schoolId,
        academicYearId,
        level,
        versionNo,
        hasFile,
        hasIceberg,
        hasBodyText,
        bodyTextLength: hasBodyText ? bodyText.length : 0,
        originalFilename: nextOriginalFilename,
      },
    });

    return successResponse(
      {
        id: doc.id,
        status: doc.status,
        versionNo,
        filePath: nextFilePath,
        hasBodyText: !!nextBodyText,
        hasIceberg: !!nextBodyIceberg,
      },
      existing ? `บันทึกเวอร์ชันใหม่สำเร็จ (v${versionNo})` : 'บันทึกสำเร็จ'
    );
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse(String(error?.message || error), 500);
  }
}
