// app/api/admin/sar-documents/[id]/approve/route.ts
// POST - mark a SAR document APPROVED so it can be used as evidence base by AI (FR-09).

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireAuth, hasRole } from '@/lib/api-utils';
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

    const isAdmin = hasRole(me, 'ADMIN');
    if (!isAdmin && !hasRole(me, 'SCHOOL_LEADER') && !hasRole(me, 'SCHOOL_ADMIN')) {
      return errorResponse('Forbidden: ต้องเป็น admin / school admin / ผู้บริหาร', 403);
    }
    if (!isAdmin) {
      const t = await prisma.teacher.findUnique({ where: { userId: me.id } });
      if (!t || t.schoolId !== doc.schoolId) return errorResponse('Forbidden', 403);
    }

    if (doc.status !== 'NEEDS_REVIEW' && doc.status !== 'APPROVED') {
      return errorResponse(`ไม่สามารถ approve ใน status=${doc.status} (ต้อง NEEDS_REVIEW)`, 409);
    }

    const updated = await prisma.sarDocument.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: me.id, approvedAt: new Date() },
    });

    await logAudit({
      userId: me.id,
      action: 'SAR_APPROVE',
      entityType: 'SarDocument',
      entityId: id,
      before: { status: doc.status, approvedById: doc.approvedById },
      after: { status: updated.status, approvedById: updated.approvedById },
    });

    return successResponse({ id, status: updated.status, approvedAt: updated.approvedAt }, 'อนุมัติเอกสารสำเร็จ');
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
