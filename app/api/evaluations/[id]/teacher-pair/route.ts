// app/api/evaluations/[id]/teacher-pair/route.ts
// GET /api/evaluations/:id/teacher-pair
// Given any session of a teacher-pair (SELF or DIRECTOR), return BOTH sides + their responses
// so the assessment form can render the merged ครูประเมินตนเอง + ผอ.ประเมิน view, plus which
// side(s) the current user may edit.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, requireAuth, hasRole } from '@/lib/api-utils';
import { EvaluatorKind } from '@prisma/client';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireAuth(request);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return errorResponse('Invalid evaluation ID', 400);

    const current = await prisma.evaluationSession.findUnique({ where: { id } });
    if (!current) return errorResponse('ไม่พบการประเมินที่ต้องการ', 404);
    if (!current.targetTeacherId || !current.evaluatorKind) {
      return errorResponse('การประเมินนี้ไม่ใช่รูปแบบครูประเมินตนเอง + ผอ.ประเมิน', 400);
    }

    const base = {
      instrumentId: current.instrumentId,
      academicYearId: current.academicYearId,
      termId: current.termId,
      targetTeacherId: current.targetTeacherId,
    };

    const selfSession =
      current.evaluatorKind === EvaluatorKind.SELF
        ? current
        : await prisma.evaluationSession.findFirst({ where: { ...base, evaluatorKind: EvaluatorKind.SELF } });
    const directorSession =
      current.evaluatorKind === EvaluatorKind.DIRECTOR
        ? current
        : await prisma.evaluationSession.findFirst({ where: { ...base, evaluatorKind: EvaluatorKind.DIRECTOR } });

    const loadResponses = async (sid: number | undefined | null) => {
      if (!sid) return [];
      return prisma.evaluationResponse.findMany({
        where: { evaluationSessionId: sid },
        select: { indicatorId: true, score: true, score2: true },
      });
    };

    const [selfResponses, directorResponses, teacher] = await Promise.all([
      loadResponses(selfSession?.id),
      loadResponses(directorSession?.id),
      prisma.teacher.findUnique({
        where: { id: current.targetTeacherId },
        select: { id: true, user: { select: { name: true } } },
      }),
    ]);

    const isAdmin = hasRole(me, 'ADMIN');
    let editable: 'SELF' | 'DIRECTOR' | 'BOTH' | 'NONE' = 'NONE';
    if (isAdmin) editable = 'BOTH';
    else if (selfSession && me.id === selfSession.evaluatorId) editable = 'SELF';
    else if (directorSession && me.id === directorSession.evaluatorId) editable = 'DIRECTOR';

    return successResponse({
      targetTeacher: teacher ? { id: teacher.id, name: teacher.user?.name ?? null } : null,
      self: selfSession
        ? {
            sessionId: selfSession.id,
            evaluatorId: selfSession.evaluatorId,
            status: selfSession.status,
            responses: selfResponses,
          }
        : null,
      director: directorSession
        ? {
            sessionId: directorSession.id,
            evaluatorId: directorSession.evaluatorId,
            status: directorSession.status,
            responses: directorResponses,
          }
        : null,
      editable,
    });
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('Unauthorized')) {
      return errorResponse(error.message, 401);
    }
    return handleApiError(error);
  }
}
