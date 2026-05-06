// app/api/ai/soar/runs/[runId]/approve/route.ts
// POST - approve all outputs of a run (bulk). Use PATCH /outputs/[outputId] for individual control.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireAuth, hasRole } from '@/lib/api-utils';
import { logAudit } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: { runId: string } }
) {
  try {
    const me = await requireAuth(request);
    const runId = parseInt(params.runId, 10);
    if (isNaN(runId)) return errorResponse('Invalid runId', 400);

    const run = await prisma.aiAnalysisRun.findUnique({ where: { id: runId } });
    if (!run) return errorResponse('ไม่พบผลวิเคราะห์', 404);
    if (run.status !== 'DONE') return errorResponse(`Cannot approve run in status=${run.status}`, 409);

    if (!hasRole(me, 'ADMIN') && !hasRole(me, 'SCHOOL_LEADER')) {
      return errorResponse('Forbidden: ต้องเป็น admin หรือผู้บริหาร', 403);
    }
    if (!hasRole(me, 'ADMIN')) {
      const t = await prisma.teacher.findUnique({ where: { userId: me.id } });
      if (!t || t.schoolId !== run.schoolId) return errorResponse('Forbidden', 403);
    }

    const updated = await prisma.aiAnalysisOutput.updateMany({
      where: { runId },
      data: { humanStatus: 'APPROVED', reviewedById: me.id, reviewedAt: new Date() },
    });

    await logAudit({
      userId: me.id,
      action: 'AI_RUN_APPROVE_ALL',
      entityType: 'AiAnalysisRun',
      entityId: runId,
      after: { approvedCount: updated.count },
    });

    return successResponse({ runId, approvedCount: updated.count }, 'อนุมัติทั้งชุดสำเร็จ');
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
