// app/api/admin/school-directors/route.ts
// Admin-only management of which SCHOOL_LEADER user is bound as the director
// of which school.
//
// The binding itself is just a `Teacher` row pointing the user at the school —
// the same shape teachers already use to be "in" a school — because the rest
// of the codebase (sar-documents authorization, teacher-pair director picker,
// userMaySchool guard) keys off Teacher.schoolId. Reusing it here means no
// schema migration on production. The trade-off is that one user can only be
// bound to one school at a time (Teacher.userId is @unique); for directors
// that matches reality.
//
// GET    /api/admin/school-directors           → list every active SCHOOL_LEADER
//                                                 user + the school (if any)
//                                                 they're currently bound to.
// PUT    /api/admin/school-directors           → body { userId, schoolId|null }.
//                                                 schoolId set → upsert binding;
//                                                 schoolId null → remove binding.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireRole } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, 'ADMIN');

    const leaders = await prisma.user.findMany({
      where: {
        isActive: true,
        roles: { some: { role: { name: 'SCHOOL_LEADER' } } },
      },
      select: {
        id: true,
        name: true,
        email: true,
        teacher: {
          select: {
            id: true,
            schoolId: true,
            school: { select: { id: true, code: true, name: true, nameTh: true } },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    return successResponse({
      items: leaders.map((u) => ({
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
      })),
      total: leaders.length,
      boundCount: leaders.filter((u) => u.teacher?.schoolId).length,
      unboundCount: leaders.filter((u) => !u.teacher?.schoolId).length,
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

export async function PUT(request: NextRequest) {
  try {
    await requireRole(request, 'ADMIN');

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return errorResponse('Invalid JSON body', 400);

    const toPositiveId = (v: unknown): number | null => {
      if (v == null || v === '') return null;
      const n = typeof v === 'number' ? v : Number(String(v));
      return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
    };

    const userId = toPositiveId(body.userId);
    if (!userId) return errorResponse('Invalid userId', 400);

    // schoolId === null means "unbind". Anything else must coerce to a positive int.
    const rawSchoolId = body.schoolId;
    const schoolId = rawSchoolId === null ? null : toPositiveId(rawSchoolId);
    if (rawSchoolId !== null && schoolId === null) {
      return errorResponse('Invalid schoolId', 400);
    }

    // Verify the user is an active SCHOOL_LEADER. We don't want to silently
    // create a Teacher row for a random user id.
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        isActive: true,
        roles: { some: { role: { name: 'SCHOOL_LEADER' } } },
      },
      select: { id: true, name: true },
    });
    if (!user) {
      return errorResponse('ผู้ใช้นี้ไม่ใช่ผู้อำนวยการ (SCHOOL_LEADER) ที่ใช้งานอยู่', 404);
    }

    if (schoolId === null) {
      // Unbind: remove the Teacher row if it exists. The Teacher row's only
      // purpose for a director was the school binding, so dropping it is the
      // right inverse of the bind operation.
      await prisma.teacher.deleteMany({ where: { userId } });
      return successResponse(
        { userId, currentSchool: null },
        `ยกเลิกการผูก ${user.name} ออกจากโรงเรียนเรียบร้อย`,
      );
    }

    // Bind: upsert the Teacher row. Teacher.userId is @unique so this is safe
    // against the two-tab race — the second writer just updates instead of
    // duplicating.
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, code: true, name: true, nameTh: true, isActive: true },
    });
    if (!school) return errorResponse('ไม่พบโรงเรียนที่เลือก', 404);
    if (!school.isActive) {
      return errorResponse('โรงเรียนนี้ถูกปิดใช้งานอยู่ — เปิดใช้งานก่อนจึงจะผูก ผอ. ได้', 400);
    }

    await prisma.teacher.upsert({
      where: { userId },
      create: { userId, schoolId },
      update: { schoolId },
    });

    return successResponse(
      {
        userId,
        currentSchool: {
          id: school.id,
          code: school.code,
          name: school.name,
          nameTh: school.nameTh,
        },
      },
      `ผูก ${user.name} กับโรงเรียน ${school.nameTh || school.name} เรียบร้อย`,
    );
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
