// app/api/admin/school-directors/candidates/route.ts
// GET /api/admin/school-directors/candidates
// Returns active users who do NOT already hold the SCHOOL_LEADER role —
// they're the candidates the admin can promote from the "เพิ่มผู้อำนวยการ →
// เลือกจากผู้ใช้ที่มี" tab. Anyone already a SCHOOL_LEADER is hidden because
// they appear in the main /api/admin/school-directors list.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireRole } from '@/lib/api-utils';

// Reasonable cap so a school with thousands of teachers doesn't blow up the
// admin page payload. The page also supports its own search box so the
// admin can narrow down before picking.
const MAX_ITEMS = 500;

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, 'ADMIN');

    const sp = request.nextUrl.searchParams;
    const search = (sp.get('search') || '').trim();

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        roles: { none: { role: { name: 'SCHOOL_LEADER' } } },
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        teacher: {
          select: {
            school: { select: { id: true, code: true, nameTh: true, name: true } },
          },
        },
        roles: {
          select: { role: { select: { name: true } } },
        },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: MAX_ITEMS,
    });

    return successResponse({
      items: users.map((u) => ({
        userId: u.id,
        name: u.name,
        email: u.email,
        currentSchool: u.teacher?.school
          ? {
              id: u.teacher.school.id,
              code: u.teacher.school.code,
              name: u.teacher.school.name,
              nameTh: u.teacher.school.nameTh,
            }
          : null,
        roles: u.roles.map((r) => r.role.name),
      })),
      total: users.length,
      truncated: users.length === MAX_ITEMS,
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
