// app/api/schools/[schoolId]/teachers/route.ts
// GET /api/schools/:schoolId/teachers
// Lists the school's teachers (for the "ครูที่ถูกประเมิน" picker) and its SCHOOL_LEADER users
// (for the "ผอ.ผู้ประเมิน" picker) used when creating a Thai ป.1–3 teacher-pair assessment.
// Auth: ADMIN, or a user bound (via Teacher record) to this school.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, requireAuth, hasRole } from '@/lib/api-utils';
import { RoleType } from '@prisma/client';

export async function GET(request: NextRequest, { params }: { params: { schoolId: string } }) {
  try {
    const me = await requireAuth(request);
    const schoolId = parseInt(params.schoolId, 10);
    if (isNaN(schoolId)) return errorResponse('Invalid school ID', 400);

    if (!hasRole(me, 'ADMIN')) {
      const myTeacher = await prisma.teacher.findUnique({ where: { userId: me.id } });
      if (!myTeacher || myTeacher.schoolId !== schoolId) {
        return errorResponse('คุณไม่มีสิทธิ์ดูรายชื่อครูของโรงเรียนนี้', 403);
      }
    }

    const [teachers, directors] = await Promise.all([
      prisma.teacher.findMany({
        where: { schoolId },
        select: { id: true, user: { select: { id: true, name: true } } },
        orderBy: { id: 'asc' },
      }),
      prisma.user.findMany({
        where: {
          isActive: true,
          teacher: { schoolId },
          roles: { some: { role: { name: RoleType.SCHOOL_LEADER } } },
        },
        select: { id: true, name: true },
        orderBy: { id: 'asc' },
      }),
    ]);

    return successResponse({
      teachers: teachers.map((t) => ({
        teacherId: t.id,
        userId: t.user?.id ?? null,
        name: t.user?.name ?? '(ไม่มีชื่อ)',
      })),
      directors: directors.map((d) => ({ userId: d.id, name: d.name })),
    });
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('Unauthorized')) {
      return errorResponse(error.message, 401);
    }
    return handleApiError(error);
  }
}
