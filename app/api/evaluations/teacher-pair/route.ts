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

    const sId = parseInt(schoolId, 10);
    const tId = parseInt(targetTeacherId, 10);
    const dId = parseInt(directorUserId, 10);
    const iId = parseInt(instrumentId, 10);
    const ayId = parseInt(academicYearId, 10);
    const tmId = termId ? parseInt(termId, 10) : null;

    // Authorization: ADMIN, or a SCHOOL_LEADER bound (via Teacher record) to this school.
    const isAdmin = hasRole(me, 'ADMIN');
    if (!isAdmin) {
      if (!hasRole(me, 'SCHOOL_LEADER')) {
        return errorResponse('เฉพาะผู้ดูแลระบบหรือผู้อำนวยการเท่านั้นที่สร้างการประเมินคู่ได้', 403);
      }
      const myTeacher = await prisma.teacher.findUnique({ where: { userId: me.id } });
      if (!myTeacher || myTeacher.schoolId !== sId) {
        return errorResponse('คุณสร้างการประเมินได้เฉพาะโรงเรียนของตนเองเท่านั้น', 403);
      }
    }

    // Target teacher must exist and belong to the school
    const targetTeacher = await prisma.teacher.findUnique({ where: { id: tId } });
    if (!targetTeacher) return errorResponse('ไม่พบครูที่ถูกประเมิน', 404);
    if (targetTeacher.schoolId !== sId) return errorResponse('ครูที่เลือกไม่ได้อยู่ในโรงเรียนนี้', 400);

    // Director must (a) be an active user, (b) hold the SCHOOL_LEADER role, and
    // (c) be bound to THIS school via their Teacher record. Without this check
    // a caller could pass any user id and silently assign, e.g., another
    // school's director as the evaluator for this pair.
    const director = await prisma.user.findFirst({
      where: {
        id: dId,
        isActive: true,
        teacher: { is: { schoolId: sId } },
        roles: { some: { role: { name: 'SCHOOL_LEADER' } } },
      },
      select: { id: true },
    });
    if (!director) {
      return errorResponse(
        'ผู้ประเมิน (ผอ.) ที่เลือกไม่ใช่ผู้อำนวยการที่ผูกกับโรงเรียนนี้',
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
