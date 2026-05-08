// app/api/admin/schools/route.ts
// GET /api/admin/schools - admin-only listing of every school (active + inactive),
// with usage counters so admins can see which schools have data before disabling.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireRole } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, 'ADMIN');

    const schools = await prisma.school.findMany({
      orderBy: [{ isActive: 'desc' }, { code: 'asc' }, { nameTh: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        nameTh: true,
        province: true,
        district: true,
        isActive: true,
        _count: {
          select: {
            evaluationSessions: true,
            networkMemberships: true,
          },
        },
      },
    });

    return successResponse({
      items: schools.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        nameTh: s.nameTh,
        province: s.province,
        district: s.district,
        isActive: s.isActive,
        sessionCount: s._count.evaluationSessions,
        networkCount: s._count.networkMemberships,
      })),
      total: schools.length,
      activeCount: schools.filter((s) => s.isActive).length,
      inactiveCount: schools.filter((s) => !s.isActive).length,
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
