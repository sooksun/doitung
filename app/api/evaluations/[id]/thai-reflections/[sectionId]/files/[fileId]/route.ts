// app/api/evaluations/[id]/thai-reflections/[sectionId]/files/[fileId]/route.ts
// DELETE — remove a ThaiReflectionFile (and its uploaded file from disk if applicable).

import { NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, requireAuth, hasRole } from '@/lib/api-utils';

type Ctx = { params: { id: string; sectionId: string; fileId: string } };

export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const me = await requireAuth(request);
    const sessionId = parseInt(params.id, 10);
    const fileId = parseInt(params.fileId, 10);
    if (isNaN(sessionId) || isNaN(fileId)) return errorResponse('Invalid ID', 400);

    // Load file and verify ownership through the session chain
    const fileRow = await prisma.thaiReflectionFile.findUnique({
      where: { id: fileId },
      include: { reflection: { select: { evaluationSessionId: true, sectionId: true } } },
    });
    if (!fileRow) return errorResponse('ไม่พบไฟล์ที่ต้องการลบ', 404);
    if (fileRow.reflection.evaluationSessionId !== sessionId)
      return errorResponse('ไฟล์นี้ไม่ได้อยู่ในการประเมินที่ระบุ', 400);

    const session = await prisma.evaluationSession.findUnique({
      where: { id: sessionId },
      select: { evaluatorId: true },
    });
    if (!session) return errorResponse('ไม่พบการประเมินที่ต้องการ', 404);
    if (session.evaluatorId !== me.id && !hasRole(me, 'ADMIN'))
      return errorResponse('ลบได้เฉพาะเจ้าของการประเมินเท่านั้น', 403);

    // Remove physical file if it was uploaded (not a video URL)
    if (fileRow.fileType !== 'video' && fileRow.publicUrl.startsWith('/uploads/')) {
      const fullPath = path.join(process.cwd(), 'public', fileRow.publicUrl);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    await prisma.thaiReflectionFile.delete({ where: { id: fileId } });
    return successResponse(null, 'ลบไฟล์สำเร็จ');
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    return handleApiError(error);
  }
}
