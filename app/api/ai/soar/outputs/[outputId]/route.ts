// app/api/ai/soar/outputs/[outputId]/route.ts
// PATCH - approve/reject a single AiAnalysisOutput row (per-section granularity).

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireAuth, hasRole } from '@/lib/api-utils';
import { logAudit } from '@/lib/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { outputId: string } }
) {
  try {
    const me = await requireAuth(request);
    const outputId = parseInt(params.outputId, 10);
    if (isNaN(outputId)) return errorResponse('Invalid outputId', 400);

    const out = await prisma.aiAnalysisOutput.findUnique({
      where: { id: outputId },
      include: { run: { select: { schoolId: true, status: true } } },
    });
    if (!out) return errorResponse('ไม่พบรายการ', 404);

    if (!hasRole(me, 'ADMIN') && !hasRole(me, 'SCHOOL_LEADER')) {
      return errorResponse('Forbidden: ต้องเป็น admin หรือผู้บริหาร', 403);
    }
    if (!hasRole(me, 'ADMIN')) {
      const t = await prisma.teacher.findUnique({ where: { userId: me.id } });
      if (!t || t.schoolId !== out.run.schoolId) return errorResponse('Forbidden', 403);
    }

    const body = await request.json();
    const next = body.humanStatus;
    if (!['APPROVED', 'REJECTED', 'DRAFT'].includes(next)) {
      return errorResponse('humanStatus ต้องเป็น APPROVED | REJECTED | DRAFT', 400);
    }

    const updated = await prisma.aiAnalysisOutput.update({
      where: { id: outputId },
      data: {
        humanStatus: next,
        reviewedById: next === 'DRAFT' ? null : me.id,
        reviewedAt: next === 'DRAFT' ? null : new Date(),
      },
    });

    await logAudit({
      userId: me.id,
      action: next === 'APPROVED' ? 'AI_OUTPUT_APPROVE' : next === 'REJECTED' ? 'AI_OUTPUT_REJECT' : 'AI_OUTPUT_REOPEN',
      entityType: 'AiAnalysisOutput',
      entityId: outputId,
      before: { humanStatus: out.humanStatus },
      after: { humanStatus: updated.humanStatus },
    });

    return successResponse(
      { id: updated.id, humanStatus: updated.humanStatus, reviewedAt: updated.reviewedAt },
      'อัปเดตสำเร็จ'
    );
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
