// app/api/evaluations/[id]/reset/route.ts
// POST /api/evaluations/:id/reset — un-submit / un-archive an evaluation so the
// owner can edit it again.
//
// Effect:
//   status      → DRAFT
//   submittedAt → null
//   (responses are untouched — the saved answers remain so the user can revise
//    rather than start over)
//
// Permission: ADMIN, or the original evaluator. PATCH /api/evaluations/:id
// could do the same thing, but giving this its own URL makes intent (and
// audit-log filtering) much cleaner.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, requireAuth, hasRole } from '@/lib/api-utils';
import { EvaluationStatus } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await requireAuth(request);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return errorResponse('Invalid evaluation ID', 400);

    const existing = await prisma.evaluationSession.findUnique({
      where: { id },
      select: { id: true, evaluatorId: true, status: true },
    });
    if (!existing) return errorResponse('ไม่พบการประเมินที่ต้องการ', 404);

    const isOwner = existing.evaluatorId === me.id;
    const isAdmin = hasRole(me, 'ADMIN');
    if (!isOwner && !isAdmin) {
      return errorResponse('คุณไม่มีสิทธิ์ reset การประเมินนี้', 403);
    }

    // Already DRAFT — return success without touching the row so the UI can
    // safely call this without checking current status first.
    if (existing.status === EvaluationStatus.DRAFT) {
      return successResponse(
        { id: existing.id, status: existing.status },
        'การประเมินอยู่ในสถานะร่างอยู่แล้ว',
      );
    }

    const updated = await prisma.evaluationSession.update({
      where: { id },
      data: {
        status: EvaluationStatus.DRAFT,
        submittedAt: null,
      },
      select: { id: true, status: true, submittedAt: true },
    });

    return successResponse(updated, 'reset การประเมินเป็นร่างเรียบร้อย');
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
