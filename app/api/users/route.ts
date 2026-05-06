// app/api/users/route.ts
// GET /api/users - List users (admin only). Supports search/role/school filters and pagination.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  handleApiError,
  parsePagination,
  parseIntParam,
  requireRole,
} from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, 'ADMIN');

    const sp = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(sp);
    const search = sp.get('search')?.trim() || '';
    const role = sp.get('role')?.trim() || '';
    const schoolId = parseIntParam(sp, 'schoolId');
    const isActive = sp.get('isActive');

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { name: { contains: search } },
      ];
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }
    if (role) {
      where.roles = { some: { role: { name: role } } };
    }
    if (schoolId) {
      where.teacher = { schoolId };
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'asc' },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          isActive: true,
          createdAt: true,
          roles: { select: { role: { select: { name: true } } } },
          teacher: {
            select: {
              schoolId: true,
              school: { select: { id: true, code: true, nameTh: true, name: true } },
            },
          },
        },
      }),
    ]);

    return successResponse({
      items: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        isActive: u.isActive,
        createdAt: u.createdAt,
        roles: u.roles.map((r) => r.role.name),
        school: u.teacher?.school
          ? {
              id: u.teacher.school.id,
              code: u.teacher.school.code,
              nameTh: u.teacher.school.nameTh || u.teacher.school.name,
            }
          : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('Unauthorized')) {
      return Response.json({ success: false, error: error.message }, { status: 401 });
    }
    if (typeof error?.message === 'string' && error.message.startsWith('Forbidden')) {
      return Response.json({ success: false, error: error.message }, { status: 403 });
    }
    return handleApiError(error);
  }
}
