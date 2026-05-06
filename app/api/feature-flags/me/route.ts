// app/api/feature-flags/me/route.ts
// GET /api/feature-flags/me - returns the current user's school's feature flags.
// For admins (no Teacher/school binding), returns null so the UI knows there's no school context.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireAuth } from '@/lib/api-utils';
import { getFeatures } from '@/lib/feature-flags';

export async function GET(request: NextRequest) {
  try {
    const me = await requireAuth(request);

    const teacher = await prisma.teacher.findUnique({ where: { userId: me.id } });
    if (!teacher) {
      return successResponse({ schoolId: null, flags: null });
    }

    const flags = await getFeatures(teacher.schoolId);
    return successResponse({ schoolId: teacher.schoolId, flags });
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('Unauthorized')) {
      return errorResponse(error.message, 401);
    }
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
