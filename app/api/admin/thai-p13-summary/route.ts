// app/api/admin/thai-p13-summary/route.ts
// POST - generate the THAI_P1_3 end-of-year AI summary for a scope+year (admin only).
//        body: { scope: 'individual'|'school'|'project', scopeId?, academicYearId }
//        Fires run-thai-p13-summary in the background; the page polls GET for the result.
// GET  - return the stored summary row for { scope, scopeId, academicYearId } (or null).

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireRole } from '@/lib/api-utils';
import { runThaiP13Summary } from '@/lib/jobs/run-thai-p13-summary';
import { THAI_P13_SUMMARY_PROMPT_VERSION, type ThaiSummaryScope } from '@/lib/ai/prompts/thai-p13-summary';
import { OPENROUTER_MODEL } from '@/lib/ai/client';
import { logAudit } from '@/lib/audit';

const SCOPES = ['individual', 'school', 'project'] as const;

function parseScope(v: unknown): ThaiSummaryScope | null {
  return SCOPES.includes(v as any) ? (v as ThaiSummaryScope) : null;
}

export async function POST(request: NextRequest) {
  try {
    const me = await requireRole(request, 'ADMIN');
    const body = await request.json();
    const scope = parseScope(body.scope);
    const academicYearId = Number(body.academicYearId);
    if (!scope) return errorResponse('scope ต้องเป็น individual | school | project', 400);
    if (!Number.isFinite(academicYearId) || academicYearId <= 0) return errorResponse('academicYearId ไม่ถูกต้อง', 400);

    // project → scopeId sentinel 0; individual/school require a positive id
    let scopeId = 0;
    if (scope !== 'project') {
      scopeId = Number(body.scopeId);
      if (!Number.isFinite(scopeId) || scopeId <= 0) {
        return errorResponse(scope === 'individual' ? 'กรุณาเลือกครู' : 'กรุณาเลือกโรงเรียน', 400);
      }
    }

    const ay = await prisma.academicYear.findUnique({ where: { id: academicYearId }, select: { id: true } });
    if (!ay) return errorResponse('ไม่พบปีการศึกษา', 404);

    // Set RUNNING up front so the polling UI shows progress immediately.
    const row = await prisma.thaiP13Summary.upsert({
      where: { scope_scopeId_academicYearId: { scope, scopeId, academicYearId } },
      create: { scope, scopeId, academicYearId, status: 'RUNNING', model: OPENROUTER_MODEL, promptVersion: THAI_P13_SUMMARY_PROMPT_VERSION },
      update: { status: 'RUNNING', error: null, finishedAt: null, model: OPENROUTER_MODEL, promptVersion: THAI_P13_SUMMARY_PROMPT_VERSION },
      select: { id: true },
    });

    setImmediate(() => {
      runThaiP13Summary(scope, scopeId, academicYearId).catch((e) =>
        console.error('[thai-p13-summary] job crashed', scope, scopeId, academicYearId, e),
      );
    });

    await logAudit({
      userId: me.id,
      action: 'AI_THAI_SUMMARY_START',
      entityType: 'ThaiP13Summary',
      entityId: row.id,
      after: { scope, scopeId, academicYearId, model: OPENROUTER_MODEL },
    });

    return successResponse({ id: row.id, status: 'RUNNING' }, 'เริ่มจัดทำบทสรุปด้วย AI — รอผลประมาณ 30 วินาที');
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse(String(error?.message || error), 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, 'ADMIN');
    const sp = request.nextUrl.searchParams;
    const scope = parseScope(sp.get('scope'));
    const academicYearId = Number(sp.get('academicYearId'));
    if (!scope) return errorResponse('scope ไม่ถูกต้อง', 400);
    if (!Number.isFinite(academicYearId) || academicYearId <= 0) return errorResponse('academicYearId ไม่ถูกต้อง', 400);
    const scopeId = scope === 'project' ? 0 : Number(sp.get('scopeId'));
    if (scope !== 'project' && (!Number.isFinite(scopeId) || scopeId <= 0)) return errorResponse('scopeId ไม่ถูกต้อง', 400);

    const row = await prisma.thaiP13Summary.findUnique({
      where: { scope_scopeId_academicYearId: { scope, scopeId, academicYearId } },
    });
    return successResponse(row);
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse(String(error?.message || error), 500);
  }
}
