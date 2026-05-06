// app/api/admin/feature-flags/[schoolId]/route.ts
// PATCH /api/admin/feature-flags/:schoolId - toggle one or more flags for a school.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireRole } from '@/lib/api-utils';
import { setFeatures } from '@/lib/feature-flags';
import { logAudit } from '@/lib/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { schoolId: string } }
) {
  try {
    const me = await requireRole(request, 'ADMIN');
    const schoolId = parseInt(params.schoolId, 10);
    if (isNaN(schoolId)) return errorResponse('Invalid schoolId', 400);

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) return errorResponse('ไม่พบโรงเรียน', 404);

    const body = await request.json();
    const patch: Record<string, boolean> = {};
    for (const key of ['aiEnabled', 'sarEnabled', 'growthTrackerEnabled'] as const) {
      if (typeof body[key] === 'boolean') patch[key] = body[key];
    }
    if (Object.keys(patch).length === 0) {
      return errorResponse('ไม่มีฟิลด์ที่จะอัปเดต', 400);
    }

    const before = await prisma.featureFlag.findUnique({ where: { schoolId } });
    const after = await setFeatures(schoolId, patch);

    await logAudit({
      userId: me.id,
      action: 'FEATURE_FLAG_UPDATE',
      entityType: 'FeatureFlag',
      entityId: schoolId,
      before,
      after,
    });

    return successResponse(after, 'อัปเดตสำเร็จ');
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
