// app/api/evaluations/[id]/thai-reflections/[sectionId]/files/route.ts
// POST — attach a file (PDF/image) or a video URL to a ThaiReflection.
//   Multipart body: `file` (uploaded PDF/image) OR `videoUrl` (external URL).
//   The ThaiReflection row for this section must already exist (PUT it first).
//   Files are written to public/uploads/thai-reflections/<sessionId>/ and served statically.

import { NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, requireAuth, hasRole } from '@/lib/api-utils';

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']);
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
]);

function uploadsRoot() {
  return path.join(process.cwd(), 'public', 'uploads', 'thai-reflections');
}

type Ctx = { params: { id: string; sectionId: string } };

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const me = await requireAuth(request);
    const sessionId = parseInt(params.id, 10);
    const sectionId = parseInt(params.sectionId, 10);
    if (isNaN(sessionId) || isNaN(sectionId)) return errorResponse('Invalid ID', 400);

    // Verify the session belongs to me (or admin)
    const session = await prisma.evaluationSession.findUnique({
      where: { id: sessionId },
      select: { evaluatorId: true },
    });
    if (!session) return errorResponse('ไม่พบการประเมินที่ต้องการ', 404);
    if (session.evaluatorId !== me.id && !hasRole(me, 'ADMIN'))
      return errorResponse('อัปโหลดได้เฉพาะเจ้าของการประเมินเท่านั้น', 403);

    // Reflection row must exist before adding files
    const reflection = await prisma.thaiReflection.findUnique({
      where: { evaluationSessionId_sectionId: { evaluationSessionId: sessionId, sectionId } },
      select: { id: true },
    });
    if (!reflection)
      return errorResponse('กรุณาบันทึกการสะท้อนคิดของด้านนี้ก่อนแนบไฟล์', 400);

    const form = await request.formData();
    const videoUrl = String(form.get('videoUrl') || '').trim();
    const file = form.get('file');
    const hasFile = file instanceof File && file.size > 0;

    if (!hasFile && !videoUrl) {
      return errorResponse('ต้องแนบไฟล์ หรือใส่ลิงก์วิดีโออย่างน้อย 1 อย่าง', 400);
    }

    let publicUrl: string;
    let fileName: string | null = null;
    let fileType: string;
    let fileSize: number | null = null;

    if (hasFile) {
      const f = file as File;
      if (f.size > MAX_BYTES)
        return errorResponse(`ไฟล์ใหญ่เกินไป (สูงสุด ${MAX_BYTES / 1024 / 1024} MB)`, 413);

      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (!ALLOWED_EXT.has(ext))
        return errorResponse('รองรับเฉพาะ PDF และรูปภาพ (jpg, png, gif, webp, pdf)', 400);

      const mime = (f.type || '').toLowerCase();
      if (mime && !ALLOWED_MIME.has(mime))
        return errorResponse('ประเภทไฟล์ไม่ตรงกับนามสกุล (MIME mismatch)', 400);

      const dir = path.join(uploadsRoot(), String(sessionId));
      fs.mkdirSync(dir, { recursive: true });
      const safeName = `${randomUUID()}.${ext}`;
      const fullPath = path.join(dir, safeName);
      if (!path.resolve(fullPath).startsWith(path.resolve(uploadsRoot()) + path.sep))
        return errorResponse('Invalid upload path', 400);

      fs.writeFileSync(fullPath, Buffer.from(await f.arrayBuffer()));
      publicUrl = `/uploads/thai-reflections/${sessionId}/${safeName}`;
      fileName = f.name;
      fileType = ext === 'pdf' ? 'pdf' : 'image';
      fileSize = f.size;
    } else {
      if (!/^https?:\/\//i.test(videoUrl))
        return errorResponse('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://', 400);
      publicUrl = videoUrl;
      fileType = 'video';
    }

    const created = await prisma.thaiReflectionFile.create({
      data: { reflectionId: reflection.id, publicUrl, fileName, fileType, fileSize },
    });
    return successResponse(created, 'แนบไฟล์สำเร็จ');
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    return handleApiError(error);
  }
}
