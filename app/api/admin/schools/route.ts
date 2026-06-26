// app/api/admin/schools/route.ts
// GET  /api/admin/schools - admin-only listing of every school
// POST /api/admin/schools - create a new school (admin only)

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

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, 'ADMIN');

    const body = await request.json();
    const name = (body.name ?? '').trim();
    const nameTh = (body.nameTh ?? '').trim() || null;
    const code = (body.code ?? '').trim() || null;
    const province = (body.province ?? '').trim() || null;
    const district = (body.district ?? '').trim() || null;
    const address = (body.address ?? '').trim() || null;

    if (!name) return errorResponse('กรุณากรอกชื่อโรงเรียน (name)', 400);

    const school = await prisma.school.create({
      data: { name, nameTh, code, province, district, address, isActive: true },
      select: { id: true, code: true, name: true, nameTh: true, province: true, district: true, isActive: true },
    });

    return successResponse({ school });
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('Unauthorized')) {
      return errorResponse(error.message, 401);
    }
    if (typeof error?.message === 'string' && error.message.startsWith('Forbidden')) {
      return errorResponse(error.message, 403);
    }
    if (error?.code === 'P2002') {
      return errorResponse('รหัสโรงเรียน (code) นี้มีอยู่แล้ว', 409);
    }
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
