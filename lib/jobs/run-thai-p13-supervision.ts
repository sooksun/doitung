// lib/jobs/run-thai-p13-supervision.ts
// Per-teacher SUPERVISION brief for the Doitung coaching team, generated PER
// ROUND (ครั้งที่ 1 / 2). Hard requirement: the school must have COMPLETED
// (submitted + all indicators answered) both the teacher's self-assessment and
// the director's assessment for that round before a brief can be generated —
// checkRoundComplete() enforces this and the API calls it before starting.
//
// Stored in ThaiP13Summary with scope = 'supervision-t1' | 'supervision-t2'
// (round encoded in scope so the existing [scope, scopeId, year] unique key
// keeps working without a schema change). scopeId = targetTeacherId.

import { prisma } from '@/lib/prisma';
import { generateJson, friendlyAiError, OPENROUTER_MODEL } from '@/lib/ai/client';
import {
  thaiP13SupervisionOutputSchema,
  THAI_P13_SUPERVISION_RESPONSE_SCHEMA,
} from '@/lib/ai/schemas/thai-p13-supervision';
import {
  THAI_P13_SUPERVISION_PROMPT_VERSION,
  buildThaiP13SupervisionUserPrompt,
  type SupervisionDimension,
  type SupervisionReflection,
} from '@/lib/ai/prompts/thai-p13-supervision';
import { getSystemPrompt } from '@/lib/ai/prompt-config';
import { redactPII } from '@/lib/ai/redact';

const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round2 = (v: number | null): number | null => (v == null ? null : Math.round(v * 100) / 100);
const termNo = (name?: string | null): number => (name?.trim().startsWith('2') ? 2 : 1);

export type Round = 1 | 2;
export const supervisionScope = (round: Round) => `supervision-t${round}`;

export interface RoundCompletion {
  ok: boolean;
  message: string;
  termLabel: string;
  selfDone: boolean;
  directorDone: boolean;
}

// Hard gate: both the SELF and DIRECTOR sessions for this round must be
// SUBMITTED and have all indicators answered.
export async function checkRoundComplete(
  teacherId: number,
  academicYearId: number,
  round: Round,
): Promise<RoundCompletion> {
  const instrument = await prisma.instrument.findFirst({
    where: { type: 'THAI_P1_3' },
    select: { id: true, _count: { select: { indicators: true } } },
  });
  if (!instrument) {
    return { ok: false, message: 'ไม่พบเครื่องมือประเมินภาษาไทย ป.1–3', termLabel: '', selfDone: false, directorDone: false };
  }
  const total = instrument._count.indicators;

  const sessions = await prisma.evaluationSession.findMany({
    where: { instrumentId: instrument.id, academicYearId, targetTeacherId: teacherId, status: { not: 'ARCHIVED' } },
    select: { evaluatorKind: true, status: true, term: { select: { name: true } }, _count: { select: { responses: true } } },
  });
  const inRound = sessions.filter((s) => termNo(s.term?.name) === round);
  const termLabel = inRound.find((s) => s.term?.name)?.term?.name || `ครั้งที่ ${round}`;

  const done = (kindIsDirector: boolean) =>
    inRound.some((s) =>
      (kindIsDirector ? s.evaluatorKind === 'DIRECTOR' : s.evaluatorKind !== 'DIRECTOR') &&
      s.status === 'SUBMITTED' &&
      s._count.responses >= total,
    );
  const selfDone = done(false);
  const directorDone = done(true);

  let message = '';
  if (selfDone && directorDone) {
    message = `ประเมินครั้งที่ ${round} เสร็จครบทั้งครูและ ผอ. — พร้อมเข้านิเทศ`;
  } else {
    const missing: string[] = [];
    if (!selfDone) missing.push('ครูยังประเมินตนเองไม่เสร็จ/ยังไม่ส่งแบบประเมิน');
    if (!directorDone) missing.push('ผอ. ยังประเมินไม่เสร็จ/ยังไม่ส่งแบบประเมิน');
    message = `ยังสร้างบทนิเทศไม่ได้ — โรงเรียนต้องประเมินครั้งที่ ${round} ให้เสร็จก่อน (${missing.join(' · ')})`;
  }
  return { ok: selfDone && directorDone, message, termLabel, selfDone, directorDone };
}

async function upsertStatus(scope: string, scopeId: number, academicYearId: number, data: any) {
  await prisma.thaiP13Summary.upsert({
    where: { scope_scopeId_academicYearId: { scope, scopeId, academicYearId } },
    create: { scope, scopeId, academicYearId, ...data },
    update: data,
  });
}

export async function runThaiP13Supervision(teacherId: number, academicYearId: number, round: Round): Promise<void> {
  const scope = supervisionScope(round);
  await upsertStatus(scope, teacherId, academicYearId, {
    status: 'RUNNING', model: OPENROUTER_MODEL, promptVersion: THAI_P13_SUPERVISION_PROMPT_VERSION, error: null, finishedAt: null,
  });

  try {
    // Re-check the gate inside the job (defense against stale POSTs)
    const gate = await checkRoundComplete(teacherId, academicYearId, round);
    if (!gate.ok) throw new Error(gate.message);

    const instrument = await prisma.instrument.findFirst({
      where: { type: 'THAI_P1_3' },
      include: { sections: { orderBy: { order: 'asc' } }, indicators: { select: { id: true, sectionId: true } } },
    });
    if (!instrument) throw new Error('ไม่พบเครื่องมือประเมินภาษาไทย ป.1–3');

    const indicatorSection = new Map<number, number | null>();
    for (const ind of instrument.indicators) indicatorSection.set(ind.id, ind.sectionId);
    const sectionName = new Map<number, string>();
    for (const sec of instrument.sections) sectionName.set(sec.id, sec.nameTh);

    // Round-scoped sessions
    const allSessions = await prisma.evaluationSession.findMany({
      where: { instrumentId: instrument.id, academicYearId, targetTeacherId: teacherId, status: { not: 'ARCHIVED' } },
      select: { id: true, evaluatorKind: true, schoolId: true, term: { select: { name: true } } },
    });
    const sessions = allSessions.filter((s) => termNo(s.term?.name) === round);
    if (sessions.length === 0) throw new Error('ไม่พบข้อมูลการประเมินของครั้งที่ระบุ');

    const sessionKind = new Map<number, string | null>();
    for (const s of sessions) sessionKind.set(s.id, s.evaluatorKind);
    const sessionIds = sessions.map((s) => s.id);
    const responses = await prisma.evaluationResponse.findMany({
      where: { evaluationSessionId: { in: sessionIds } },
      select: { evaluationSessionId: true, indicatorId: true, score: true, score2: true },
    });

    const scoreboard: SupervisionDimension[] = instrument.sections.map((sec) => {
      const self: number[] = [], dir: number[] = [], tgt: number[] = [];
      let count = 0;
      for (const r of responses) {
        if (indicatorSection.get(r.indicatorId) !== sec.id) continue;
        count++;
        const kind = sessionKind.get(r.evaluationSessionId);
        if (kind === 'DIRECTOR') { if (r.score != null) dir.push(r.score); }
        else { if (r.score != null) self.push(r.score); if (r.score2 != null) tgt.push(r.score2); }
      }
      const selfAvg = round2(mean(self));
      const targetAvg = round2(mean(tgt));
      const gap = selfAvg != null && targetAvg != null ? round2(targetAvg - selfAvg) : null;
      return { sectionName: sec.nameTh, selfAvg, directorAvg: round2(mean(dir)), targetAvg, gap, responseCount: count };
    });

    // Round-scoped reflections (SELF sessions only)
    const selfIds = sessions.filter((s) => s.evaluatorKind !== 'DIRECTOR').map((s) => s.id);
    const reflRows = selfIds.length
      ? await prisma.thaiReflection.findMany({
          where: { evaluationSessionId: { in: selfIds } },
          select: { sectionId: true, reflectionText: true },
          orderBy: [{ sectionId: 'asc' }, { id: 'asc' }],
        })
      : [];
    const reflections: SupervisionReflection[] = reflRows
      .map((r) => ({ sectionName: sectionName.get(r.sectionId) || `ด้าน #${r.sectionId}`, text: redactPII(r.reflectionText || '').text.trim() }))
      .filter((r) => r.text.length > 0);

    // Labels
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { user: { select: { name: true } }, school: { select: { nameTh: true, name: true } } },
    });
    const teacherName = teacher?.user?.name || `ครู #${teacherId}`;
    const schoolName = teacher?.school?.nameTh || teacher?.school?.name || '';
    const ay = await prisma.academicYear.findUnique({ where: { id: academicYearId }, select: { year: true } });
    const academicYearLabel = ay?.year ? String(ay.year) : '';

    const promptReflections = reflections.slice(0, 40).map((r) => ({ ...r, text: r.text.length > 700 ? r.text.slice(0, 700) + '…' : r.text }));
    const userPrompt = buildThaiP13SupervisionUserPrompt({
      round, teacherName, schoolName, academicYearLabel, termLabel: gate.termLabel, scoreboard, reflections: promptReflections,
    });

    const baseSystem = await getSystemPrompt('thai-p13-supervision');
    const callAI = async (extra = '') =>
      generateJson({
        systemInstruction: baseSystem + extra,
        userPrompt,
        responseSchema: THAI_P13_SUPERVISION_RESPONSE_SCHEMA,
        schemaName: 'thai_p13_supervision',
        maxOutputTokens: 8000,
      });

    let { json: raw, usage } = await callAI();
    let parsed = thaiP13SupervisionOutputSchema.safeParse(raw);
    let usageRetry: { in: number; out: number } | null = null;
    if (!parsed.success) {
      const retry = await callAI('\n\nรอบก่อนผลลัพธ์ไม่ผ่านโครงสร้าง ให้ตอบใหม่เป็น JSON ที่มีครบทุก field: executiveSummary, strengths, concerns, supervisionFocus, coachingRecommendations เท่านั้น');
      usageRetry = retry.usage;
      parsed = thaiP13SupervisionOutputSchema.safeParse(retry.json);
      if (!parsed.success) throw new Error('ผลลัพธ์ AI ไม่ผ่านการตรวจสอบโครงสร้าง: ' + parsed.error.issues.slice(0, 3).map((i) => i.message).join('; '));
    }

    const out = parsed.data;
    const result = {
      kind: 'supervision' as const,
      round,
      scope, scopeId: teacherId, academicYearId, academicYearLabel,
      termLabel: gate.termLabel,
      subjectLabel: teacherName,
      schoolName,
      teacherCount: 1,
      completion: { selfDone: gate.selfDone, directorDone: gate.directorDone },
      scoreboard,
      reflections,
      ai: {
        executiveSummary: out.executiveSummary,
        strengths: out.strengths,
        concerns: out.concerns,
        supervisionFocus: out.supervisionFocus,
        coachingRecommendations: out.coachingRecommendations,
      },
      generatedAt: new Date().toISOString(),
    };

    await upsertStatus(scope, teacherId, academicYearId, {
      status: 'DONE', finishedAt: new Date(), model: OPENROUTER_MODEL, promptVersion: THAI_P13_SUPERVISION_PROMPT_VERSION,
      result: result as any, tokensIn: usage.in + (usageRetry?.in || 0), tokensOut: usage.out + (usageRetry?.out || 0), error: null,
    });
    console.log(`[runThaiP13Supervision] teacher=${teacherId} round=${round} year=${academicYearId} DONE`);
  } catch (err: any) {
    console.error('[runThaiP13Supervision] failed', teacherId, academicYearId, round, err);
    await upsertStatus(scope, teacherId, academicYearId, { status: 'FAILED', finishedAt: new Date(), error: friendlyAiError(err).slice(0, 1000) });
  }
}
