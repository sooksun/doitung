// app/api/admin/sar-documents/[id]/process/route.ts
// POST - kicks off the extract/OCR job in the background; returns 202.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireAuth, hasRole } from '@/lib/api-utils';
import { extractOrOcr } from '@/lib/jobs/extract-or-ocr';
import { logAudit } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await requireAuth(request);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return errorResponse('Invalid id', 400);

    const doc = await prisma.sarDocument.findUnique({ where: { id } });
    if (!doc) return errorResponse('ไม่พบเอกสาร', 404);

    if (!hasRole(me, 'ADMIN')) {
      const t = await prisma.teacher.findUnique({ where: { userId: me.id } });
      if (!t || t.schoolId !== doc.schoolId) return errorResponse('Forbidden', 403);
      if (!hasRole(me, 'SCHOOL_LEADER')) return errorResponse('Forbidden: ต้องเป็น admin หรือผู้บริหาร', 403);
    }

    if (!['UPLOADED', 'NEEDS_REVIEW'].includes(doc.status)) {
      return errorResponse(`ไม่สามารถประมวลผลใน status=${doc.status}`, 409);
    }

    // Fire-and-forget — runs in same Node process via setImmediate
    setImmediate(() => {
      extractOrOcr(id).catch((e) => console.error('[process] extractOrOcr crashed', id, e));
    });

    await logAudit({
      userId: me.id,
      action: 'SAR_PROCESS',
      entityType: 'SarDocument',
      entityId: id,
      before: { status: doc.status },
      after: { status: 'EXTRACTING' },
    });

    return successResponse({ id, status: 'EXTRACTING' }, 'เริ่มประมวลผลเอกสาร — โปรดรอผลและกดรีเฟรช', /* status code */);
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
