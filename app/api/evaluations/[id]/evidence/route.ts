// app/api/evaluations/[id]/evidence/route.ts
// GET  - list evidence for an evaluation (any authenticated viewer)
// POST - add evidence (owner/ADMIN): multipart with EITHER a `file` (image/document)
//        OR a `url` (e.g. video link), plus optional `description` (caption).
// Files are written under public/uploads/evidence/<sessionId>/ and served statically.

import { NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, requireAuth, hasRole } from '@/lib/api-utils';

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
// Extension allowlist + matching MIME allowlist. Browsers can spoof either one
// in isolation but agreeing on BOTH is a meaningful narrowing — and `f.type`
// is what browsers send for the inline preview / download dispatch, so a file
// whose MIME doesn't match its extension is already a UX problem.
const ALLOWED_EXT = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
]);
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

function uploadsRoot() {
  return path.join(process.cwd(), 'public', 'uploads', 'evidence');
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireAuth(request);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return errorResponse('Invalid evaluation ID', 400);

    // Resolve session first so we can scope-check the caller. Evidence
    // descriptions can carry sensitive context; ID-guessing across schools
    // shouldn't surface them.
    const session = await prisma.evaluationSession.findUnique({
      where: { id },
      select: {
        evaluatorId: true,
        schoolId: true,
        targetTeacher: { select: { userId: true } },
      },
    });
    if (!session) return errorResponse('ไม่พบการประเมินที่ต้องการ', 404);

    if (!hasRole(me, 'ADMIN')) {
      const isEvaluator = session.evaluatorId === me.id;
      const isTargetTeacher = session.targetTeacher?.userId === me.id;
      let inSameSchool = false;
      if (!isEvaluator && !isTargetTeacher) {
        const teacher = await prisma.teacher.findUnique({
          where: { userId: me.id },
          select: { schoolId: true },
        });
        inSameSchool = !!teacher && teacher.schoolId === session.schoolId;
      }
      if (!isEvaluator && !isTargetTeacher && !inSameSchool) {
        return errorResponse('คุณไม่มีสิทธิ์ดูหลักฐานของการประเมินนี้', 403);
      }
    }

    const items = await prisma.evidence.findMany({
      where: { evaluationSessionId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, url: true, description: true, sectionId: true, createdAt: true },
    });
    return successResponse(items);
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireAuth(request);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return errorResponse('Invalid evaluation ID', 400);

    const session = await prisma.evaluationSession.findUnique({
      where: { id },
      select: { id: true, evaluatorId: true },
    });
    if (!session) return errorResponse('ไม่พบการประเมินที่ต้องการ', 404);
    if (session.evaluatorId !== me.id && !hasRole(me, 'ADMIN')) {
      return errorResponse('เพิ่มหลักฐานได้เฉพาะเจ้าของการประเมินเท่านั้น', 403);
    }

    const form = await request.formData();
    const description = String(form.get('description') || '').trim() || null;
    const linkUrl = String(form.get('url') || '').trim();
    const sectionIdRaw = form.get('sectionId');
    const sectionId = sectionIdRaw ? parseInt(String(sectionIdRaw), 10) : null;
    const file = form.get('file');
    const hasFile = file instanceof File && file.size > 0;

    if (!hasFile && !linkUrl) {
      return errorResponse('ต้องแนบไฟล์ หรือใส่ลิงก์อย่างน้อย 1 อย่าง', 400);
    }

    let url: string;
    if (hasFile) {
      const f = file as File;
      if (f.size > MAX_BYTES) return errorResponse(`ไฟล์ใหญ่เกินไป (สูงสุด ${MAX_BYTES / 1024 / 1024} MB)`, 413);
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (!ALLOWED_EXT.has(ext)) {
        return errorResponse('รองรับเฉพาะรูปภาพ/เอกสาร (jpg, png, gif, webp, pdf, doc, docx, xls, xlsx, ppt, pptx)', 400);
      }
      // Reject obvious MIME mismatches. Browsers can lie about `f.type`, but
      // a missing or mismatched type is the cheap signal we have without
      // sniffing bytes. Pair with an allowlist of MIME strings tied to the
      // matching ALLOWED_EXT family.
      const mime = (f.type || '').toLowerCase();
      if (mime && !ALLOWED_MIME.has(mime)) {
        return errorResponse('ประเภทไฟล์ไม่ตรงกับนามสกุล (MIME mismatch)', 400);
      }
      const dir = path.join(uploadsRoot(), String(id));
      fs.mkdirSync(dir, { recursive: true });
      // UUID filename — drops the user-supplied name entirely so we don't
      // have to worry about `..jpg`, NTFS reserved names, or unicode
      // normalization tricks; the original name is fine to lose because the
      // download UX uses `description` for the label.
      const fileName = `${randomUUID()}.${ext}`;
      // Defence in depth — verify the joined path stays under the uploads
      // root even though we built the components ourselves (catches any
      // future template-string typo that re-introduces user input).
      const fullPath = path.join(dir, fileName);
      const root = path.resolve(uploadsRoot());
      if (!path.resolve(fullPath).startsWith(root + path.sep)) {
        return errorResponse('Invalid upload path', 400);
      }
      fs.writeFileSync(fullPath, Buffer.from(await f.arrayBuffer()));
      url = `/uploads/evidence/${id}/${fileName}`;
    } else {
      if (!/^https?:\/\//i.test(linkUrl)) {
        return errorResponse('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://', 400);
      }
      url = linkUrl;
    }

    const ev = await prisma.evidence.create({
      data: { evaluationSessionId: id, url, description, sectionId: Number.isNaN(sectionId as number) ? null : sectionId },
      select: { id: true, url: true, description: true, sectionId: true, createdAt: true },
    });
    return successResponse(ev, 'เพิ่มหลักฐานสำเร็จ');
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    return handleApiError(error);
  }
}
