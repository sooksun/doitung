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
// POST   /api/admin/school-directors           → add a new director, either by
//                                                 promoting an existing user
//                                                 ({ mode: 'promote', userId,
//                                                 schoolId? }) or creating a
//                                                 brand-new user ({ mode:
//                                                 'create', name, email,
//                                                 password, schoolId? }).
// PUT    /api/admin/school-directors           → body { userId, schoolId|null }.
//                                                 schoolId set → upsert binding;
//                                                 schoolId null → remove binding.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireRole } from '@/lib/api-utils';
import { hashPassword } from '@/lib/auth';

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

// Shared helper for POST: takes an already-resolved userId + optional schoolId
// and (a) makes sure the user holds the SCHOOL_LEADER role, (b) upserts the
// Teacher row for school binding. Returns the decorated row the page renders.
async function ensureLeaderAndBind(
  userId: number,
  schoolId: number | null,
): Promise<{
  userId: number;
  name: string;
  email: string;
  currentSchool: { id: number; code: string | null; name: string; nameTh: string | null } | null;
}> {
  // Look up (or create) the SCHOOL_LEADER role row, then make sure this user
  // has it. UserRole has a composite key (userId, roleId) so we use upsert
  // against a `userId_roleId` lookup if Prisma exposes one — otherwise
  // findFirst + create is safe inside this transaction because we already
  // hold the row.
  const role = await prisma.role.findUnique({ where: { name: 'SCHOOL_LEADER' } });
  if (!role) throw new Error('Role SCHOOL_LEADER not found in DB');

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: role.id } },
    create: { userId, roleId: role.id },
    update: {},
  });

  if (schoolId !== null) {
    await prisma.teacher.upsert({
      where: { userId },
      create: { userId, schoolId },
      update: { schoolId },
    });
  }

  const fresh = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      teacher: {
        select: {
          school: { select: { id: true, code: true, name: true, nameTh: true } },
        },
      },
    },
  });
  if (!fresh) throw new Error('User vanished mid-create');
  return {
    userId: fresh.id,
    name: fresh.name,
    email: fresh.email,
    currentSchool: fresh.teacher?.school
      ? {
          id: fresh.teacher.school.id,
          code: fresh.teacher.school.code,
          name: fresh.teacher.school.name,
          nameTh: fresh.teacher.school.nameTh,
        }
      : null,
  };
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, 'ADMIN');

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return errorResponse('Invalid JSON body', 400);

    const toPositiveId = (v: unknown): number | null => {
      if (v == null || v === '') return null;
      const n = typeof v === 'number' ? v : Number(String(v));
      return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
    };

    // schoolId is optional in both modes — admin can bind later from the page.
    const rawSchoolId = body.schoolId;
    let schoolId: number | null = null;
    if (rawSchoolId != null && rawSchoolId !== '') {
      const parsed = toPositiveId(rawSchoolId);
      if (!parsed) return errorResponse('Invalid schoolId', 400);
      const school = await prisma.school.findUnique({
        where: { id: parsed },
        select: { id: true, isActive: true },
      });
      if (!school) return errorResponse('ไม่พบโรงเรียนที่เลือก', 404);
      if (!school.isActive) {
        return errorResponse('โรงเรียนนี้ถูกปิดใช้งานอยู่', 400);
      }
      schoolId = parsed;
    }

    const mode = body.mode === 'create' ? 'create' : 'promote';

    if (mode === 'promote') {
      // Promote an existing user to SCHOOL_LEADER.
      const userId = toPositiveId(body.userId);
      if (!userId) return errorResponse('Invalid userId', 400);
      const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isActive: true },
      });
      if (!target) return errorResponse('ไม่พบผู้ใช้ที่เลือก', 404);
      if (!target.isActive) return errorResponse('ผู้ใช้นี้ถูกปิดใช้งานอยู่', 400);
      const result = await ensureLeaderAndBind(userId, schoolId);
      return successResponse(result, `แต่งตั้ง ${result.name} เป็นผู้อำนวยการเรียบร้อย`);
    }

    // mode === 'create'
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!name || name.length < 2) return errorResponse('กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร', 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse('รูปแบบอีเมลไม่ถูกต้อง', 400);
    }
    if (password.length < 8) {
      return errorResponse('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร', 400);
    }

    // Email is @unique — reject duplicates with a friendly message instead of
    // letting Prisma's P2002 surface.
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return errorResponse('มีบัญชีที่ใช้อีเมลนี้อยู่แล้ว — ใช้โหมด "เลือกจากผู้ใช้ที่มี" แทน', 409);
    }

    const hashed = await hashPassword(password);
    const created = await prisma.user.create({
      data: { name, email, password: hashed, isActive: true },
      select: { id: true },
    });
    const result = await ensureLeaderAndBind(created.id, schoolId);
    return successResponse(result, `สร้างผู้อำนวยการ ${result.name} เรียบร้อย`);
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
