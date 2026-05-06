// app/api/ai/soar/analyze-evaluation/[evaluationId]/route.ts
// POST - create AiAnalysisRun and kick off run-soar in background.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireAuth, hasRole } from '@/lib/api-utils';
import { requireFeature } from '@/lib/feature-flags';
import { runSoar } from '@/lib/jobs/run-soar';
import { GEMINI_MODEL } from '@/lib/ai/client';
import { SOAR_PROMPT_VERSION } from '@/lib/ai/prompts/soar-coach';
import { logAudit } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: { evaluationId: string } }
) {
  try {
    const me = await requireAuth(request);
    const evaluationId = parseInt(params.evaluationId, 10);
    if (isNaN(evaluationId)) return errorResponse('Invalid evaluationId', 400);

    const session = await prisma.evaluationSession.findUnique({
      where: { id: evaluationId },
      select: { id: true, schoolId: true, status: true, instrument: { select: { type: true } } },
    });
    if (!session) return errorResponse('ไม่พบการประเมิน', 404);
    if (session.instrument?.type !== 'Q_MODEL') {
      return errorResponse('AI SOAR analysis รองรับเฉพาะ Q-Model เท่านั้น', 400);
    }

    if (!hasRole(me, 'ADMIN') && !hasRole(me, 'SCHOOL_LEADER')) {
      // teachers may also trigger analysis on their own school's session
      const t = await prisma.teacher.findUnique({ where: { userId: me.id } });
      if (!t || t.schoolId !== session.schoolId) return errorResponse('Forbidden', 403);
    } else if (!hasRole(me, 'ADMIN')) {
      const t = await prisma.teacher.findUnique({ where: { userId: me.id } });
      if (!t || t.schoolId !== session.schoolId) return errorResponse('Forbidden', 403);
    }

    await requireFeature(session.schoolId, 'aiEnabled');

    const run = await prisma.aiAnalysisRun.create({
      data: {
        schoolId: session.schoolId,
        evaluationSessionId: evaluationId,
        promptVersion: SOAR_PROMPT_VERSION,
        modelName: GEMINI_MODEL,
        inputHash: '',
        status: 'PENDING',
        createdById: me.id,
      },
    });

    setImmediate(() => {
      runSoar(run.id).catch((e) => console.error('[analyze] runSoar crashed', run.id, e));
    });

    await logAudit({
      userId: me.id,
      action: 'AI_RUN_START',
      entityType: 'AiAnalysisRun',
      entityId: run.id,
      after: { evaluationId, schoolId: session.schoolId, model: GEMINI_MODEL },
    });

    return successResponse(
      { runId: run.id, status: run.status },
      'เริ่มวิเคราะห์แล้ว — รอผลประมาณ 30 วินาที'
    );
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse(String(error?.message || error), 500);
  }
}
