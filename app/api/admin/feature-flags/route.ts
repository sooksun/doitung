// app/api/admin/feature-flags/route.ts
// GET /api/admin/feature-flags - list all schools with their flag rows (admin overview).

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireRole } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, 'ADMIN');

    const schools = await prisma.school.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        nameTh: true,
        name: true,
        featureFlag: true,
      },
    });

    return successResponse({
      items: schools.map((s) => ({
        schoolId: s.id,
        schoolCode: s.code,
        schoolName: s.nameTh || s.name,
        flags: {
          aiEnabled: s.featureFlag?.aiEnabled ?? false,
          sarEnabled: s.featureFlag?.sarEnabled ?? false,
          growthTrackerEnabled: s.featureFlag?.growthTrackerEnabled ?? false,
        },
      })),
      total: schools.length,
    });
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
