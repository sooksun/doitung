// app/api/admin/schools/[schoolId]/route.ts
// PATCH  /api/admin/schools/:schoolId - toggle a school's isActive flag (admin-only).
// DELETE /api/admin/schools/:schoolId - permanently delete a school (admin-only, no sessions allowed).
//
// Inactive schools are hidden from /api/schools (when called with ?isActive=true) and
// from non-admin listings, but their historical data — sessions, responses, SAR
// documents — is preserved untouched. Re-activating restores normal visibility.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireRole } from '@/lib/api-utils';
import { logAudit } from '@/lib/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { schoolId: string } }
) {
  try {
    const me = await requireRole(request, 'ADMIN');

    const schoolId = parseInt(params.schoolId, 10);
    if (isNaN(schoolId)) return errorResponse('Invalid schoolId', 400);

    const body = await request.json().catch(() => ({}));
    if (typeof body?.isActive !== 'boolean') {
      return errorResponse('ต้องระบุ isActive (true|false)', 400);
    }

    const before = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, code: true, nameTh: true, name: true, isActive: true },
    });
    if (!before) return errorResponse('ไม่พบโรงเรียน', 404);

    if (before.isActive === body.isActive) {
      // No-op — return current state without writing
      return successResponse(before, 'สถานะเดิมอยู่แล้ว');
    }

    const after = await prisma.school.update({
      where: { id: schoolId },
      data: { isActive: body.isActive },
      select: { id: true, code: true, nameTh: true, name: true, isActive: true },
    });

    await logAudit({
      userId: me.id,
      action: body.isActive ? 'SCHOOL_ACTIVATE' : 'SCHOOL_DEACTIVATE',
      entityType: 'School',
      entityId: schoolId,
      before,
      after,
    });

    return successResponse(after, body.isActive ? 'เปิดใช้งานแล้ว' : 'ปิดใช้งานแล้ว');
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('Unauthorized')) {
      return errorResponse(error.message, 401);
    }
    if (typeof error?.message === 'string' && error.message.startsWith('Forbidden')) {
      return errorResponse(error.message, 403);
    }
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { schoolId: string } }
) {
  try {
    await requireRole(request, 'ADMIN');

    const schoolId = parseInt(params.schoolId, 10);
    if (isNaN(schoolId)) return errorResponse('Invalid schoolId', 400);

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, nameTh: true, name: true, _count: { select: { evaluationSessions: true } } },
    });
    if (!school) return errorResponse('ไม่พบโรงเรียน', 404);

    if (school._count.evaluationSessions > 0) {
      return errorResponse(
        `ไม่สามารถลบได้ — มีข้อมูลการประเมิน ${school._count.evaluationSessions} รายการ`,
        409
      );
    }

    await prisma.school.delete({ where: { id: schoolId } });

    return successResponse({ id: schoolId }, 'ลบโรงเรียนเรียบร้อยแล้ว');
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('Unauthorized')) {
      return errorResponse(error.message, 401);
    }
    if (typeof error?.message === 'string' && error.message.startsWith('Forbidden')) {
      return errorResponse(error.message, 403);
    }
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
