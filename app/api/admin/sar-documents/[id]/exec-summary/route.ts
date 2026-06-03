// app/api/admin/sar-documents/[id]/exec-summary/route.ts
// POST - generate the AI "บทสรุปสำหรับผู้บริหาร" for this SAR document.
// Merges the school's Q-Model scores (quantitative) with the saved brainstorm
// (qualitative). Kicks off run-exec-summary in the background; the SAR detail
// page polls GET /api/admin/sar-documents/:id (aiSummary.status) for the result.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireAuth, hasRole } from '@/lib/api-utils';
import { requireFeature } from '@/lib/feature-flags';
import { runExecSummary } from '@/lib/jobs/run-exec-summary';
import { OPENROUTER_MODEL } from '@/lib/ai/client';
import { EXEC_SUMMARY_PROMPT_VERSION } from '@/lib/ai/prompts/exec-summary';
import { logAudit } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await requireAuth(request);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return errorResponse('Invalid id', 400);

    const doc = await prisma.sarDocument.findUnique({
      where: { id },
      select: { id: true, schoolId: true, status: true, bodyText: true, bodyIceberg: true },
    });
    if (!doc) return errorResponse('ไม่พบเอกสาร', 404);

    // Same gate as /process: admin, or a school-bound leader/school_admin.
    if (!hasRole(me, 'ADMIN')) {
      const t = await prisma.teacher.findUnique({ where: { userId: me.id } });
      if (!t || t.schoolId !== doc.schoolId) return errorResponse('Forbidden', 403);
      if (!hasRole(me, 'SCHOOL_LEADER') && !hasRole(me, 'SCHOOL_ADMIN')) {
        return errorResponse('Forbidden: ต้องเป็น admin / school admin / ผู้บริหาร', 403);
      }
    }

    // Need at least the brainstorm to have something qualitative to discuss.
    if (!doc.bodyText && !doc.bodyIceberg) {
      return errorResponse('ยังไม่มีข้อมูลการระดมสมองในเอกสารนี้', 400);
    }

    await requireFeature(doc.schoolId, 'aiEnabled');

    // Flip to RUNNING up front so the polling UI shows progress immediately,
    // even before the background job's first write.
    await prisma.sarDocument.update({
      where: { id },
      data: {
        aiSummary: {
          status: 'RUNNING',
          startedAt: new Date().toISOString(),
          model: OPENROUTER_MODEL,
          promptVersion: EXEC_SUMMARY_PROMPT_VERSION,
        },
      },
    });

    setImmediate(() => {
      runExecSummary(id).catch((e) => console.error('[exec-summary] runExecSummary crashed', id, e));
    });

    await logAudit({
      userId: me.id,
      action: 'AI_EXEC_SUMMARY_START',
      entityType: 'SarDocument',
      entityId: id,
      after: { schoolId: doc.schoolId, model: OPENROUTER_MODEL, promptVersion: EXEC_SUMMARY_PROMPT_VERSION },
    });

    return successResponse(
      { id, status: 'RUNNING' },
      'เริ่มจัดทำบทสรุปสำหรับผู้บริหารด้วย AI — รอผลประมาณ 30 วินาที',
    );
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse(String(error?.message || error), 500);
  }
}
