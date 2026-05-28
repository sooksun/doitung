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
        where: { schoolId, user: { isActive: true } },
        select: { id: true, user: { select: { id: true, name: true } } },
        orderBy: { id: 'asc' },
      }),
      // Directors = active SCHOOL_LEADER users in EITHER of two buckets:
      //   (a) bound to THIS school via Teacher  → the canonical case
      //   (b) not bound to any school via Teacher → "floating" directors
      //       (they exist in production where seeds didn't give SCHOOL_LEADERs
      //       a Teacher row). Without bucket (b) the picker is empty on those
      //       schools and the school admin can't create a teacher-pair at all.
      // A SCHOOL_LEADER bound to a DIFFERENT school is intentionally excluded
      // — that's a cross-tenant assignment we don't want to enable here.
      prisma.user.findMany({
        where: {
          isActive: true,
          roles: { some: { role: { name: RoleType.SCHOOL_LEADER } } },
          OR: [
            { teacher: { is: { schoolId } } },
            { teacher: { is: null } },
          ],
        },
        select: {
          id: true,
          name: true,
          teacher: { select: { schoolId: true } },
        },
        orderBy: { id: 'asc' },
      }),
    ]);

    return successResponse({
      teachers: teachers.map((t) => ({
        teacherId: t.id,
        userId: t.user?.id ?? null,
        name: t.user?.name ?? '(ไม่มีชื่อ)',
      })),
      directors: directors.map((d) => ({
        userId: d.id,
        name: d.name,
        // Tells the UI whether this director is canonically bound to the
        // school (Teacher.schoolId match) or is a floating director shown as
        // a fallback. Frontend can group them visually.
        boundToSchool: d.teacher?.schoolId === schoolId,
      })),
    });
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('Unauthorized')) {
      return errorResponse(error.message, 401);
    }
    return handleApiError(error);
  }
}
