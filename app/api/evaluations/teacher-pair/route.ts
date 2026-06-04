// app/api/evaluations/teacher-pair/route.ts
// POST /api/evaluations/teacher-pair
// Create the teacher self-assessment (SELF) + director assessment (DIRECTOR) pair for one
// teacher, in a single transaction. Idempotent (returns existing sessions if a pair already
// exists for the same target teacher + instrument + academic year + term).
// Only ADMIN or the school's SCHOOL_LEADER may create. evaluatorId per side is set explicitly
// (teacher's user for SELF, chosen director's user for DIRECTOR) so the existing per-session
// ownership gate keeps working — that's why this lives outside POST /api/evaluations.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, requireAuth, hasRole } from '@/lib/api-utils';
import { EvaluatorKind, EvaluationStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const me = await requireAuth(request);
    const body = await request.json();
    const { instrumentId, schoolId, academicYearId, termId, targetTeacherId, directorUserId } = body;

    if (!instrumentId || !schoolId || !academicYearId || !targetTeacherId || !directorUserId) {
      return errorResponse(
        'Missing required fields: instrumentId, schoolId, academicYearId, targetTeacherId, directorUserId',
        400,
      );
    }

    // Coerce + validate IDs in one place. `parseInt` happily returns NaN for
    // garbage (empty string, "abc", undefined), and the original
    // truthy check above misses `0`; using Number.isFinite + positive guard
    // catches both. termId is optional: only null vs valid-positive-int.
    const toPositiveId = (v: unknown): number | null => {
      if (v == null || v === '') return null;
      const n = typeof v === 'number' ? v : Number(String(v));
      return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
    };
    const sId = toPositiveId(schoolId);
    const tId = toPositiveId(targetTeacherId);
    const dId = toPositiveId(directorUserId);
    const iId = toPositiveId(instrumentId);
    const ayId = toPositiveId(academicYearId);
    if (!sId || !tId || !dId || !iId || !ayId) {
      return errorResponse('Invalid ID(s): must be positive integers', 400);
    }
    let tmId: number | null = null;
    if (termId != null && termId !== '') {
      const parsed = toPositiveId(termId);
      if (!parsed) return errorResponse('Invalid termId', 400);
      tmId = parsed;
    }

    // Authorization: ADMIN may create for any school.
    // SCHOOL_LEADER or TEACHER must be bound (via Teacher record) to the target school.
    // A plain TEACHER (not a SCHOOL_LEADER) may only create their OWN self-assessment
    // — they cannot target another teacher (enforces the locked picker server-side).
    const isAdmin = hasRole(me, 'ADMIN');
    const isLeader = hasRole(me, 'SCHOOL_LEADER');
    if (!isAdmin) {
      const myTeacher = await prisma.teacher.findUnique({ where: { userId: me.id } });
      if (!myTeacher || myTeacher.schoolId !== sId) {
        return errorResponse('คุณสร้างการประเมินได้เฉพาะโรงเรียนของตนเองเท่านั้น', 403);
      }
      if (!isLeader && myTeacher.id !== tId) {
        return errorResponse('ครูสามารถสร้างแบบประเมินได้เฉพาะของตนเองเท่านั้น', 403);
      }
    }

    // Target teacher must exist and belong to the school
    const targetTeacher = await prisma.teacher.findUnique({ where: { id: tId } });
    if (!targetTeacher) return errorResponse('ไม่พบครูที่ถูกประเมิน', 404);
    if (targetTeacher.schoolId !== sId) return errorResponse('ครูที่เลือกไม่ได้อยู่ในโรงเรียนนี้', 400);

    // Director must (a) be an active user, (b) hold the SCHOOL_LEADER role,
    // and (c) be either bound to THIS school via Teacher OR not bound to any
    // school via Teacher (a "floating" director that the admin is assigning
    // to this school). A SCHOOL_LEADER bound to a DIFFERENT school is still
    // rejected — we don't want cross-tenant assignment. This OR-pair mirrors
    // the LIST query in /api/schools/:id/teachers so the picker and the
    // validator agree.
    const director = await prisma.user.findFirst({
      where: {
        id: dId,
        isActive: true,
        roles: { some: { role: { name: 'SCHOOL_LEADER' } } },
        OR: [
          { teacher: { is: { schoolId: sId } } },
          { teacher: { is: null } },
        ],
      },
      select: { id: true },
    });
    if (!director) {
      return errorResponse(
        'ผู้ประเมิน (ผอ.) ที่เลือกไม่ใช่ผู้อำนวยการที่ใช้งานได้สำหรับโรงเรียนนี้',
        400,
      );
    }

    // Serializable isolation closes the find-then-create race: two concurrent
    // POSTs for the same (target, instrument, year, term, kind) tuple can't
    // both see "no existing row" simultaneously — InnoDB gap locks make the
    // second transaction wait, find the first's row on retry, and return it.
    // Without this the request was idempotent only when responses were spaced
    // out enough for the first INSERT to commit.
    const result = await prisma.$transaction(async (tx) => {
      const base = { instrumentId: iId, academicYearId: ayId, termId: tmId, targetTeacherId: tId };

      let selfS = await tx.evaluationSession.findFirst({ where: { ...base, evaluatorKind: EvaluatorKind.SELF } });
      if (!selfS) {
        selfS = await tx.evaluationSession.create({
          data: {
            ...base,
            schoolId: sId,
            evaluatorId: targetTeacher.userId,
            evaluatorKind: EvaluatorKind.SELF,
            status: EvaluationStatus.DRAFT,
          },
        });
      }

      let dirS = await tx.evaluationSession.findFirst({ where: { ...base, evaluatorKind: EvaluatorKind.DIRECTOR } });
      if (!dirS) {
        dirS = await tx.evaluationSession.create({
          data: {
            ...base,
            schoolId: sId,
            evaluatorId: dId,
            evaluatorKind: EvaluatorKind.DIRECTOR,
            status: EvaluationStatus.DRAFT,
          },
        });
      }

      return { selfSessionId: selfS.id, directorSessionId: dirS.id };
    }, { isolationLevel: 'Serializable' });

    return successResponse(result, 'สร้างการประเมินคู่ (ครูประเมินตนเอง + ผอ.ประเมิน) สำเร็จ');
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('Unauthorized')) {
      return errorResponse(error.message, 401);
    }
    if (typeof error?.message === 'string' && error.message.startsWith('Forbidden')) {
      return errorResponse(error.message, 403);
    }
    return handleApiError(error);
  }
}
