// lib/jobs/run-thai-p13-summary.ts
// Async job: build the THAI_P1_3 end-of-year AI summary for one of three scopes
// (individual teacher / school / whole project), for a given academic year.
//
// Aggregates per-dimension average ratings split by ครู (SELF) vs ผอ. (DIRECTOR)
// plus the teacher's target (score2), collects the qualitative reflection digest,
// then asks the model to synthesise a leadership brief. The whole envelope
// (scoreboard + reflections + AI output) is persisted to ThaiP13Summary.result
// so the Excel / Word / print-PDF exports can render without re-querying.

import { prisma } from '@/lib/prisma';
import { generateJson, friendlyAiError, OPENROUTER_MODEL } from '@/lib/ai/client';
import {
  thaiP13SummaryOutputSchema,
  THAI_P13_SUMMARY_RESPONSE_SCHEMA,
} from '@/lib/ai/schemas/thai-p13-summary';
import {
  THAI_P13_SUMMARY_SYSTEM_PROMPT,
  THAI_P13_SUMMARY_PROMPT_VERSION,
  buildThaiP13SummaryUserPrompt,
  type ThaiSummaryScope,
  type ThaiSummaryDimension,
  type ThaiReflectionDigestItem,
} from '@/lib/ai/prompts/thai-p13-summary';
import { redactPII } from '@/lib/ai/redact';

const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round2 = (v: number | null): number | null => (v == null ? null : Math.round(v * 100) / 100);

// term number from a Term.name like "1/2568" / "2/2568" — leading digit decides.
const termNo = (name?: string | null): number => (name?.trim().startsWith('2') ? 2 : 1);

export interface ThaiSummaryResult {
  scope: ThaiSummaryScope;
  scopeId: number;
  academicYearId: number;
  academicYearLabel: string;
  subjectLabel: string;
  teacherCount: number;
  schoolCount?: number;
  scoreboard: ThaiSummaryDimension[];
  reflections: ThaiReflectionDigestItem[];
  ai: {
    executiveSummary: string;
    strengths: string[];
    improvements: string[];
    reflectionInsights: string[];
    recommendations: string[];
  };
  generatedAt: string;
}

async function upsertStatus(scope: string, scopeId: number, academicYearId: number, data: any) {
  await prisma.thaiP13Summary.upsert({
    where: { scope_scopeId_academicYearId: { scope, scopeId, academicYearId } },
    create: { scope, scopeId, academicYearId, ...data },
    update: data,
  });
}

export async function runThaiP13Summary(
  scope: ThaiSummaryScope,
  scopeId: number,
  academicYearId: number,
): Promise<void> {
  await upsertStatus(scope, scopeId, academicYearId, {
    status: 'RUNNING',
    model: OPENROUTER_MODEL,
    promptVersion: THAI_P13_SUMMARY_PROMPT_VERSION,
    error: null,
    finishedAt: null,
  });

  try {
    const instrument = await prisma.instrument.findFirst({
      where: { type: 'THAI_P1_3' },
      include: {
        sections: { orderBy: { order: 'asc' } },
        indicators: { select: { id: true, sectionId: true } },
      },
    });
    if (!instrument) throw new Error('ไม่พบเครื่องมือประเมินภาษาไทย ป.1–3');

    const indicatorSection = new Map<number, number | null>();
    for (const ind of instrument.indicators) indicatorSection.set(ind.id, ind.sectionId);

    // Sessions in scope
    const sessionWhere: any = {
      status: { not: 'ARCHIVED' as const },
      instrumentId: instrument.id,
      academicYearId,
    };
    if (scope === 'individual') sessionWhere.targetTeacherId = scopeId;
    else if (scope === 'school') sessionWhere.schoolId = scopeId;

    const sessions = await prisma.evaluationSession.findMany({
      where: sessionWhere,
      select: {
        id: true, evaluatorKind: true, schoolId: true, targetTeacherId: true,
        term: { select: { name: true } },
      },
    });
    if (sessions.length === 0) throw new Error('ยังไม่มีข้อมูลการประเมินสำหรับช่วงที่เลือก');

    const sessionKind = new Map<number, string | null>();
    const sessionTerm = new Map<number, number>();
    for (const s of sessions) {
      sessionKind.set(s.id, s.evaluatorKind);
      sessionTerm.set(s.id, termNo(s.term?.name));
    }

    const sessionIds = sessions.map((s) => s.id);
    const responses = await prisma.evaluationResponse.findMany({
      where: { evaluationSessionId: { in: sessionIds } },
      select: { evaluationSessionId: true, indicatorId: true, score: true, score2: true },
    });

    // Per-section aggregation
    const scoreboard: ThaiSummaryDimension[] = instrument.sections.map((sec) => {
      const selfScores: number[] = [];
      const dirScores: number[] = [];
      const targetScores: number[] = [];
      let count = 0;
      for (const r of responses) {
        if (indicatorSection.get(r.indicatorId) !== sec.id) continue;
        count++;
        const kind = sessionKind.get(r.evaluationSessionId);
        if (kind === 'DIRECTOR') {
          if (r.score != null) dirScores.push(r.score);
        } else {
          // SELF (or legacy null) — count as teacher side
          if (r.score != null) selfScores.push(r.score);
          if (r.score2 != null) targetScores.push(r.score2);
        }
      }
      return {
        sectionName: sec.nameTh,
        selfAvg: round2(mean(selfScores)),
        directorAvg: round2(mean(dirScores)),
        targetAvg: round2(mean(targetScores)),
        responseCount: count,
      };
    });

    if (responses.length === 0) throw new Error('ยังไม่มีคำตอบในการประเมินสำหรับช่วงที่เลือก');

    // Reflection digest (SELF sessions only — DIRECTOR doesn't write reflections)
    const selfSessionIds = sessions.filter((s) => s.evaluatorKind !== 'DIRECTOR').map((s) => s.id);
    const sectionName = new Map<number, string>();
    for (const sec of instrument.sections) sectionName.set(sec.id, sec.nameTh);

    const reflRows = selfSessionIds.length
      ? await prisma.thaiReflection.findMany({
          where: { evaluationSessionId: { in: selfSessionIds } },
          select: { evaluationSessionId: true, sectionId: true, reflectionText: true },
          orderBy: [{ sectionId: 'asc' }, { id: 'asc' }],
        })
      : [];

    const reflections: ThaiReflectionDigestItem[] = reflRows.map((r) => ({
      sectionName: sectionName.get(r.sectionId) || `ด้าน #${r.sectionId}`,
      term: sessionTerm.get(r.evaluationSessionId) || 1,
      text: redactPII(r.reflectionText || '').text.trim(),
    })).filter((r) => r.text.length > 0);

    // Subject label + counts
    const ay = await prisma.academicYear.findUnique({ where: { id: academicYearId }, select: { year: true } });
    const academicYearLabel = ay?.year ? String(ay.year) : '';
    const distinctTeachers = new Set(sessions.map((s) => s.targetTeacherId).filter(Boolean)).size;
    const distinctSchools = new Set(sessions.map((s) => s.schoolId)).size;

    let subjectLabel = 'ทั้งโครงการ (ทุกโรงเรียน)';
    let teacherCount = distinctTeachers;
    let schoolCount: number | undefined;
    if (scope === 'individual') {
      const t = await prisma.teacher.findUnique({ where: { id: scopeId }, select: { user: { select: { name: true } } } });
      subjectLabel = t?.user?.name || `ครู #${scopeId}`;
      teacherCount = 1;
    } else if (scope === 'school') {
      const sc = await prisma.school.findUnique({ where: { id: scopeId }, select: { nameTh: true, name: true } });
      subjectLabel = sc?.nameTh || sc?.name || `โรงเรียน #${scopeId}`;
    } else {
      schoolCount = distinctSchools;
    }

    // Prompt (truncate reflection text to keep the request bounded)
    const promptReflections = reflections.slice(0, 60).map((r) => ({
      ...r,
      text: r.text.length > 600 ? r.text.slice(0, 600) + '…' : r.text,
    }));
    const userPrompt = buildThaiP13SummaryUserPrompt({
      scope, academicYearLabel, subjectLabel, teacherCount,
      schoolCount, scoreboard, reflections: promptReflections,
    });

    const callAI = async (extra = '') => {
      const { json, usage } = await generateJson({
        systemInstruction: THAI_P13_SUMMARY_SYSTEM_PROMPT + extra,
        userPrompt,
        responseSchema: THAI_P13_SUMMARY_RESPONSE_SCHEMA,
        schemaName: 'thai_p13_summary',
        maxOutputTokens: 8000,
      });
      return { json, usage };
    };

    let { json: raw, usage } = await callAI();
    let parsed = thaiP13SummaryOutputSchema.safeParse(raw);
    let usageRetry: { in: number; out: number } | null = null;
    if (!parsed.success) {
      const retry = await callAI(
        '\n\nรอบก่อนผลลัพธ์ไม่ผ่านโครงสร้าง ให้ตอบใหม่เป็น JSON ที่มีครบทุก field: executiveSummary, strengths, improvements, reflectionInsights, recommendations เท่านั้น',
      );
      usageRetry = retry.usage;
      parsed = thaiP13SummaryOutputSchema.safeParse(retry.json);
      if (!parsed.success) {
        throw new Error('ผลลัพธ์ AI ไม่ผ่านการตรวจสอบโครงสร้าง: ' + parsed.error.issues.slice(0, 3).map((i) => i.message).join('; '));
      }
    }

    const out = parsed.data;
    const result: ThaiSummaryResult = {
      scope, scopeId, academicYearId, academicYearLabel, subjectLabel,
      teacherCount, schoolCount, scoreboard, reflections,
      ai: {
        executiveSummary: out.executiveSummary,
        strengths: out.strengths,
        improvements: out.improvements,
        reflectionInsights: out.reflectionInsights,
        recommendations: out.recommendations,
      },
      generatedAt: new Date().toISOString(),
    };

    await upsertStatus(scope, scopeId, academicYearId, {
      status: 'DONE',
      finishedAt: new Date(),
      model: OPENROUTER_MODEL,
      promptVersion: THAI_P13_SUMMARY_PROMPT_VERSION,
      result: result as any,
      tokensIn: usage.in + (usageRetry?.in || 0),
      tokensOut: usage.out + (usageRetry?.out || 0),
      error: null,
    });
    console.log(`[runThaiP13Summary] ${scope}/${scopeId}/${academicYearId} DONE`);
  } catch (err: any) {
    console.error('[runThaiP13Summary] failed', scope, scopeId, academicYearId, err);
    await upsertStatus(scope, scopeId, academicYearId, {
      status: 'FAILED',
      finishedAt: new Date(),
      error: friendlyAiError(err).slice(0, 1000),
    });
  }
}
