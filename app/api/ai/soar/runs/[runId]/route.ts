// app/api/ai/soar/runs/[runId]/route.ts
// GET - run status + outputs (UI polls this to show progress and final result).

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireAuth, hasRole } from '@/lib/api-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { runId: string } }
) {
  try {
    const me = await requireAuth(request);
    const runId = parseInt(params.runId, 10);
    if (isNaN(runId)) return errorResponse('Invalid runId', 400);

    const run = await prisma.aiAnalysisRun.findUnique({
      where: { id: runId },
      include: {
        outputs: { orderBy: { id: 'asc' } },
        createdBy: { select: { name: true, email: true } },
        evaluationSession: { select: { id: true, schoolId: true } },
      },
    });
    if (!run) return errorResponse('ไม่พบผลวิเคราะห์', 404);

    if (!hasRole(me, 'ADMIN')) {
      const t = await prisma.teacher.findUnique({ where: { userId: me.id } });
      if (!t || t.schoolId !== run.schoolId) return errorResponse('Forbidden', 403);
    }

    return successResponse({
      id: run.id,
      schoolId: run.schoolId,
      evaluationSessionId: run.evaluationSessionId,
      promptVersion: run.promptVersion,
      modelName: run.modelName,
      status: run.status,
      errorMessage: run.errorMessage,
      tokensIn: run.tokensIn,
      tokensOut: run.tokensOut,
      createdBy: run.createdBy,
      createdAt: run.createdAt,
      finishedAt: run.finishedAt,
      outputs: run.outputs.map((o) => ({
        id: o.id,
        outputType: o.outputType,
        jsonOutput: o.jsonOutput,
        humanStatus: o.humanStatus,
        reviewedById: o.reviewedById,
        reviewedAt: o.reviewedAt,
      })),
    });
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
