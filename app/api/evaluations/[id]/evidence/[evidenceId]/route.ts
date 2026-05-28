// app/api/evaluations/[id]/evidence/[evidenceId]/route.ts
// DELETE - remove one evidence item (owner/ADMIN). Also deletes the uploaded file if local.

import { NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, requireAuth, hasRole } from '@/lib/api-utils';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; evidenceId: string } },
) {
  try {
    const me = await requireAuth(request);
    const id = parseInt(params.id, 10);
    const evidenceId = parseInt(params.evidenceId, 10);
    if (isNaN(id) || isNaN(evidenceId)) return errorResponse('Invalid ID', 400);

    const session = await prisma.evaluationSession.findUnique({
      where: { id },
      select: { evaluatorId: true },
    });
    if (!session) return errorResponse('ไม่พบการประเมินที่ต้องการ', 404);
    if (session.evaluatorId !== me.id && !hasRole(me, 'ADMIN')) {
      return errorResponse('ลบหลักฐานได้เฉพาะเจ้าของการประเมินเท่านั้น', 403);
    }

    const ev = await prisma.evidence.findUnique({
      where: { id: evidenceId },
      select: { id: true, evaluationSessionId: true, url: true },
    });
    if (!ev || ev.evaluationSessionId !== id) return errorResponse('ไม่พบหลักฐาน', 404);

    // Remove the locally-stored file (external links have no file to delete).
    // Defence in depth: if a future code path lets attacker-controlled bytes
    // into `ev.url` (e.g. via raw-SQL fixups, a buggy upload path, or a
    // legacy migration), the path.resolve check below makes sure we only
    // unlink files inside the evidence uploads root — `/uploads/evidence/..
    // /../something` would resolve outside the root and bail out.
    if (ev.url && ev.url.startsWith('/uploads/evidence/')) {
      const uploadsRoot = path.resolve(path.join(process.cwd(), 'public', 'uploads', 'evidence'));
      const target = path.resolve(path.join(process.cwd(), 'public', ev.url));
      if (target.startsWith(uploadsRoot + path.sep)) {
        try {
          fs.unlinkSync(target);
        } catch {
          /* file already gone — ignore */
        }
      }
    }

    await prisma.evidence.delete({ where: { id: evidenceId } });
    return successResponse({ id: evidenceId }, 'ลบหลักฐานสำเร็จ');
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    return handleApiError(error);
  }
}
