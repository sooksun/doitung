// app/api/admin/thai-p13-summary/route.ts
// POST - generate a THAI_P1_3 AI summary (admin only). Two families of scope:
//   leadership: 'individual' | 'school' | 'project'  → run-thai-p13-summary
//   supervision: 'supervision-t1' | 'supervision-t2' → run-thai-p13-supervision
//     (per-teacher coaching brief per round; HARD-gated: the school must have
//      finished + submitted that round's assessment before a brief can be made.)
//   Fires the job in the background; the page polls GET for the result.
// GET  - return the stored summary row for { scope, scopeId, academicYearId }.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireRole } from '@/lib/api-utils';
import { runThaiP13Summary } from '@/lib/jobs/run-thai-p13-summary';
import { runThaiP13Supervision, checkRoundComplete, type Round } from '@/lib/jobs/run-thai-p13-supervision';
import { THAI_P13_SUMMARY_PROMPT_VERSION, type ThaiSummaryScope } from '@/lib/ai/prompts/thai-p13-summary';
import { THAI_P13_SUPERVISION_PROMPT_VERSION } from '@/lib/ai/prompts/thai-p13-supervision';
import { OPENROUTER_MODEL } from '@/lib/ai/client';
import { logAudit } from '@/lib/audit';

const LEADERSHIP_SCOPES = ['individual', 'school', 'project'];
const SUPERVISION_SCOPES = ['supervision-t1', 'supervision-t2'];
const ALL_SCOPES = [...LEADERSHIP_SCOPES, ...SUPERVISION_SCOPES];

const validScope = (v: unknown): string | null => (ALL_SCOPES.includes(v as string) ? (v as string) : null);
const isSupervision = (s: string) => s.startsWith('supervision-');
const roundOf = (s: string): Round => (s.endsWith('t2') ? 2 : 1);

export async function POST(request: NextRequest) {
  try {
    const me = await requireRole(request, 'ADMIN');
    const body = await request.json();
    const scope = validScope(body.scope);
    const academicYearId = Number(body.academicYearId);
    if (!scope) return errorResponse('scope ไม่ถูกต้อง', 400);
    if (!Number.isFinite(academicYearId) || academicYearId <= 0) return errorResponse('academicYearId ไม่ถูกต้อง', 400);

    const ay = await prisma.academicYear.findUnique({ where: { id: academicYearId }, select: { id: true } });
    if (!ay) return errorResponse('ไม่พบปีการศึกษา', 404);

    // ── Supervision brief (per teacher, per round) ──
    if (isSupervision(scope)) {
      const teacherId = Number(body.scopeId);
      if (!Number.isFinite(teacherId) || teacherId <= 0) return errorResponse('กรุณาเลือกครู', 400);
      const round = roundOf(scope);

      // HARD GATE — the school must finish + submit this round before the team can get a brief.
      const gate = await checkRoundComplete(teacherId, academicYearId, round);
      if (!gate.ok) return errorResponse(gate.message, 409);

      const row = await prisma.thaiP13Summary.upsert({
        where: { scope_scopeId_academicYearId: { scope, scopeId: teacherId, academicYearId } },
        create: { scope, scopeId: teacherId, academicYearId, status: 'RUNNING', model: OPENROUTER_MODEL, promptVersion: THAI_P13_SUPERVISION_PROMPT_VERSION },
        update: { status: 'RUNNING', error: null, finishedAt: null, model: OPENROUTER_MODEL, promptVersion: THAI_P13_SUPERVISION_PROMPT_VERSION },
        select: { id: true },
      });
      setImmediate(() => {
        runThaiP13Supervision(teacherId, academicYearId, round).catch((e) => console.error('[thai-supervision] job crashed', teacherId, academicYearId, round, e));
      });
      await logAudit({ userId: me.id, action: 'AI_THAI_SUPERVISION_START', entityType: 'ThaiP13Summary', entityId: row.id, after: { teacherId, academicYearId, round, model: OPENROUTER_MODEL } });
      return successResponse({ id: row.id, status: 'RUNNING' }, 'เริ่มจัดทำบทนิเทศด้วย AI — รอผลประมาณ 30 วินาที');
    }

    // ── Leadership summary (individual / school / project) ──
    let scopeId = 0;
    if (scope !== 'project') {
      scopeId = Number(body.scopeId);
      if (!Number.isFinite(scopeId) || scopeId <= 0) return errorResponse(scope === 'individual' ? 'กรุณาเลือกครู' : 'กรุณาเลือกโรงเรียน', 400);
    }

    const row = await prisma.thaiP13Summary.upsert({
      where: { scope_scopeId_academicYearId: { scope, scopeId, academicYearId } },
      create: { scope, scopeId, academicYearId, status: 'RUNNING', model: OPENROUTER_MODEL, promptVersion: THAI_P13_SUMMARY_PROMPT_VERSION },
      update: { status: 'RUNNING', error: null, finishedAt: null, model: OPENROUTER_MODEL, promptVersion: THAI_P13_SUMMARY_PROMPT_VERSION },
      select: { id: true },
    });
    setImmediate(() => {
      runThaiP13Summary(scope as ThaiSummaryScope, scopeId, academicYearId).catch((e) => console.error('[thai-p13-summary] job crashed', scope, scopeId, academicYearId, e));
    });
    await logAudit({ userId: me.id, action: 'AI_THAI_SUMMARY_START', entityType: 'ThaiP13Summary', entityId: row.id, after: { scope, scopeId, academicYearId, model: OPENROUTER_MODEL } });
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
    const scope = validScope(sp.get('scope'));
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
