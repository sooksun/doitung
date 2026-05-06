// app/api/admin/sar-documents/[id]/pages/route.ts
// GET pages of a SAR document for the review pane.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireAuth, hasRole } from '@/lib/api-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await requireAuth(request);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return errorResponse('Invalid id', 400);

    const doc = await prisma.sarDocument.findUnique({ where: { id }, select: { schoolId: true } });
    if (!doc) return errorResponse('ไม่พบเอกสาร', 404);

    if (!hasRole(me, 'ADMIN')) {
      const t = await prisma.teacher.findUnique({ where: { userId: me.id } });
      if (!t || t.schoolId !== doc.schoolId) return errorResponse('Forbidden', 403);
    }

    const pages = await prisma.sarPage.findMany({
      where: { documentId: id },
      orderBy: { pageNumber: 'asc' },
      include: { reviewedBy: { select: { name: true } } },
    });

    return successResponse({
      items: pages.map((p) => ({
        id: p.id,
        pageNumber: p.pageNumber,
        rawText: p.rawText,
        cleanedText: p.cleanedText,
        extractMethod: p.extractMethod,
        confidence: p.confidence,
        needsReview: p.needsReview,
        reviewedBy: p.reviewedBy?.name || null,
        reviewedAt: p.reviewedAt,
      })),
      total: pages.length,
    });
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
