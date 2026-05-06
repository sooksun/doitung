// app/api/admin/sar-pages/[pageId]/route.ts
// PATCH - edit cleanedText for a single SAR page; flips needsReview off and stamps reviewer.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireAuth, hasRole } from '@/lib/api-utils';
import { logAudit } from '@/lib/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { pageId: string } }
) {
  try {
    const me = await requireAuth(request);
    const pageId = parseInt(params.pageId, 10);
    if (isNaN(pageId)) return errorResponse('Invalid pageId', 400);

    const page = await prisma.sarPage.findUnique({
      where: { id: pageId },
      include: { document: { select: { schoolId: true } } },
    });
    if (!page) return errorResponse('ไม่พบหน้าเอกสาร', 404);

    if (!hasRole(me, 'ADMIN')) {
      const t = await prisma.teacher.findUnique({ where: { userId: me.id } });
      if (!t || t.schoolId !== page.document.schoolId) return errorResponse('Forbidden', 403);
    }

    const body = await request.json();
    const data: any = {};
    if (typeof body.cleanedText === 'string') {
      data.cleanedText = body.cleanedText;
      data.reviewedById = me.id;
      data.reviewedAt = new Date();
      data.needsReview = false;
    }
    if (typeof body.needsReview === 'boolean') data.needsReview = body.needsReview;

    if (Object.keys(data).length === 0) return errorResponse('ไม่มีฟิลด์ที่อัปเดต', 400);

    const before = { cleanedText: page.cleanedText, needsReview: page.needsReview };
    const updated = await prisma.sarPage.update({ where: { id: pageId }, data });

    await logAudit({
      userId: me.id,
      action: 'SAR_PAGE_EDIT',
      entityType: 'SarPage',
      entityId: pageId,
      before,
      after: { cleanedText: updated.cleanedText, needsReview: updated.needsReview },
    });

    return successResponse(
      {
        id: updated.id,
        cleanedText: updated.cleanedText,
        needsReview: updated.needsReview,
        reviewedAt: updated.reviewedAt,
      },
      'บันทึกสำเร็จ'
    );
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
