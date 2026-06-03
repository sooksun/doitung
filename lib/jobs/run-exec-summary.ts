// lib/jobs/run-exec-summary.ts
// Async job: build the Executive Summary for a SAR document by merging the
// school's QUANTITATIVE Q-Model scoreboard (aggregated from EvaluationResponse,
// same math as /api/dashboard/q-model) with the QUALITATIVE brainstorm text
// stored on the document (bodyText / bodyIceberg). Persists the whole envelope
// into SarDocument.aiSummary.
//
// Unlike run-soar (keyed to one EvaluationSession, approved SAR docs only), this
// is anchored on the brainstorm document itself and uses ALL non-archived
// evaluation sessions for the school+year — it answers "given everything we
// scored and everything we brainstormed, what's the leadership takeaway?".

import { prisma } from '@/lib/prisma';
import { generateJson, friendlyAiError, OPENROUTER_MODEL } from '@/lib/ai/client';
import {
  execSummaryOutputSchema,
  EXEC_SUMMARY_RESPONSE_SCHEMA,
} from '@/lib/ai/schemas/exec-summary-output';
import {
  EXEC_SUMMARY_SYSTEM_PROMPT,
  EXEC_SUMMARY_PROMPT_VERSION,
  buildExecSummaryUserPrompt,
  type ExecSummaryDimension,
} from '@/lib/ai/prompts/exec-summary';
import { redactPII } from '@/lib/ai/redact';

const Q_DIMENSIONS = [
  { key: 'Q-Leadership', labelTh: 'Q-Leadership ผู้บริหาร' },
  { key: 'Q-PLC', labelTh: 'Q-PLC ชุมชนแห่งการเรียนรู้' },
  { key: 'Q-Learning', labelTh: 'Q-Learning การจัดการเรียนรู้' },
  { key: 'Q-Students', labelTh: 'Q-Students ด้านนักเรียน' },
] as const;

interface IcebergLayerVal { current?: string; desired?: string }
interface IcebergVal {
  situations?: IcebergLayerVal;
  patterns?: IcebergLayerVal;
  structures?: IcebergLayerVal;
  mentalModels?: IcebergLayerVal;
}

// Mirror of renderIcebergAsText in the upload route — used only when a document
// somehow has bodyIceberg but no bodyText (older rows / partial writes).
function renderIceberg(ic: IcebergVal): string {
  const sections: Array<[string, IcebergLayerVal | undefined]> = [
    ['ชั้น 1: สถานการณ์ (สิ่งที่เห็นเกิดขึ้น)', ic.situations],
    ['ชั้น 2: รูปแบบของปัญหา (สิ่งที่เกิดซ้ำ)', ic.patterns],
    ['ชั้น 3: โครงสร้าง (กลไก/นโยบาย/ระบบที่ค้ำไว้)', ic.structures],
    ['ชั้น 4: แบบจำลองวิธีคิด (ความเชื่อ/ค่านิยมที่ฝังลึก)', ic.mentalModels],
  ];
  const out: string[] = [];
  for (const [title, layer] of sections) {
    const cur = (layer?.current || '').trim();
    const des = (layer?.desired || '').trim();
    if (!cur && !des) continue;
    out.push(`## ${title}`);
    if (cur) { out.push('สิ่งที่เป็นอยู่:'); out.push(cur); }
    if (des) { out.push(''); out.push('สิ่งที่อยากให้เป็น:'); out.push(des); }
    out.push('');
  }
  return out.join('\n').trim();
}

// Aggregate the per-dimension Q-Model scoreboard for a school+year. Same
// normalization as app/api/dashboard/q-model/route.ts (percent of [min,max]),
// scoped to non-archived sessions of the Q-Model instrument.
async function aggregateScoreboard(
  schoolId: number,
  academicYearId: number,
): Promise<ExecSummaryDimension[]> {
  const qModel = await prisma.instrument.findFirst({
    where: { type: 'Q_MODEL' },
    include: {
      sections: true,
      indicators: { select: { id: true, sectionId: true, minScore: true, maxScore: true } },
    },
  });

  const sessionWhere = {
    status: { not: 'ARCHIVED' as const },
    schoolId,
    academicYearId,
    ...(qModel ? { instrumentId: qModel.id } : {}),
  };

  const rows: ExecSummaryDimension[] = [];
  for (const dim of Q_DIMENSIONS) {
    const section = qModel?.sections.find((s) => s.nameEn === dim.key);
    const indicators = section
      ? qModel!.indicators.filter((i) => i.sectionId === section.id)
      : [];

    if (indicators.length === 0) {
      rows.push({ dimension: dim.key, labelTh: dim.labelTh, current: null, target: null, gap: null, progress: null, status: 'none', responseCount: 0 });
      continue;
    }

    const indicatorIds = indicators.map((i) => i.id);
    const [aggregates, responseCount] = await Promise.all([
      Promise.all(
        indicators.map((ind) =>
          prisma.evaluationResponse.aggregate({
            where: { indicatorId: ind.id, evaluationSession: sessionWhere },
            _avg: { score: true, score2: true },
          }),
        ),
      ),
      prisma.evaluationResponse.count({
        where: { indicatorId: { in: indicatorIds }, evaluationSession: sessionWhere },
      }),
    ]);

    const currentPercents: number[] = [];
    const targetPercents: number[] = [];
    for (let i = 0; i < indicators.length; i++) {
      const ind = indicators[i];
      const range = ind.maxScore - ind.minScore;
      if (range <= 0) continue;
      const avgCur = aggregates[i]._avg.score2;
      const avgTar = aggregates[i]._avg.score;
      if (avgCur !== null) currentPercents.push(Math.max(0, Math.min(100, ((avgCur - ind.minScore) / range) * 100)));
      if (avgTar !== null) targetPercents.push(Math.max(0, Math.min(100, ((avgTar - ind.minScore) / range) * 100)));
    }

    if (responseCount === 0) {
      rows.push({ dimension: dim.key, labelTh: dim.labelTh, current: null, target: null, gap: null, progress: null, status: 'none', responseCount: 0 });
      continue;
    }

    const current = currentPercents.length ? currentPercents.reduce((a, b) => a + b, 0) / currentPercents.length : 0;
    const target = targetPercents.length ? targetPercents.reduce((a, b) => a + b, 0) / targetPercents.length : 0;
    let progress = 0;
    if (target > 0) progress = (current / target) * 100;
    progress = Math.max(0, Math.min(120, progress));
    let status: ExecSummaryDimension['status'] = 'red';
    if (progress >= 90) status = 'green';
    else if (progress >= 70) status = 'yellow';

    rows.push({
      dimension: dim.key,
      labelTh: dim.labelTh,
      current: Math.round(current),
      target: Math.round(target),
      gap: Math.round(target - current),
      progress: Math.round(progress),
      status,
      responseCount,
    });
  }
  return rows;
}

export async function runExecSummary(sarDocumentId: number): Promise<void> {
  const doc = await prisma.sarDocument.findUnique({
    where: { id: sarDocumentId },
    include: {
      school: { select: { nameTh: true, name: true } },
      academicYear: { select: { year: true } },
    },
  });
  if (!doc) {
    console.error('[runExecSummary] doc not found', sarDocumentId);
    return;
  }

  // Mark RUNNING so the polling UI shows progress even if the API didn't.
  await prisma.sarDocument.update({
    where: { id: sarDocumentId },
    data: {
      aiSummary: {
        status: 'RUNNING',
        startedAt: new Date().toISOString(),
        model: OPENROUTER_MODEL,
        promptVersion: EXEC_SUMMARY_PROMPT_VERSION,
      },
    },
  });

  try {
    const scoreboard = await aggregateScoreboard(doc.schoolId, doc.academicYearId);

    let qualitative = (doc.bodyText || '').trim();
    if (!qualitative && (doc as any).bodyIceberg) {
      qualitative = renderIceberg((doc as any).bodyIceberg as IcebergVal);
    }
    const qualitativeText = redactPII(qualitative).text;

    const userPrompt = buildExecSummaryUserPrompt({
      schoolNameTh: doc.school?.nameTh || doc.school?.name || '',
      academicYearLabel: doc.academicYear?.year || '',
      scoreboard,
      qualitativeText,
    });

    const { json: raw, usage } = await generateJson({
      systemInstruction: EXEC_SUMMARY_SYSTEM_PROMPT,
      userPrompt,
      responseSchema: EXEC_SUMMARY_RESPONSE_SCHEMA,
      schemaName: 'exec_summary',
      maxOutputTokens: 8000,
    });

    let parsed = execSummaryOutputSchema.safeParse(raw);
    let usageRetry: { in: number; out: number } | null = null;
    if (!parsed.success) {
      console.warn('[runExecSummary] schema fail, retrying', sarDocumentId);
      const retry = await generateJson({
        systemInstruction:
          EXEC_SUMMARY_SYSTEM_PROMPT +
          '\n\nรอบก่อนผลลัพธ์ไม่ผ่านโครงสร้าง ให้ตอบใหม่เป็น JSON ที่มีครบทุก field: executiveSummary, quantitativeFindings, qualitativeFindings, discussion, recommendations เท่านั้น',
        userPrompt,
        responseSchema: EXEC_SUMMARY_RESPONSE_SCHEMA,
        schemaName: 'exec_summary',
        maxOutputTokens: 8000,
      });
      usageRetry = retry.usage;
      parsed = execSummaryOutputSchema.safeParse(retry.json);
      if (!parsed.success) {
        throw new Error(
          'Exec summary output failed Zod validation: ' +
            parsed.error.issues.slice(0, 3).map((i) => i.message).join('; '),
        );
      }
    }

    const out = parsed.data;
    await prisma.sarDocument.update({
      where: { id: sarDocumentId },
      data: {
        aiSummary: {
          status: 'DONE',
          finishedAt: new Date().toISOString(),
          model: OPENROUTER_MODEL,
          promptVersion: EXEC_SUMMARY_PROMPT_VERSION,
          scoreboard: scoreboard as any,
          executiveSummary: out.executiveSummary,
          quantitativeFindings: out.quantitativeFindings,
          qualitativeFindings: out.qualitativeFindings,
          discussion: out.discussion,
          recommendations: out.recommendations,
          tokensIn: usage.in + (usageRetry?.in || 0),
          tokensOut: usage.out + (usageRetry?.out || 0),
        },
      },
    });
    console.log(`[runExecSummary] doc=${sarDocumentId} DONE`);
  } catch (err: any) {
    console.error('[runExecSummary] failed', sarDocumentId, err);
    await prisma.sarDocument.update({
      where: { id: sarDocumentId },
      data: {
        aiSummary: {
          status: 'FAILED',
          finishedAt: new Date().toISOString(),
          model: OPENROUTER_MODEL,
          promptVersion: EXEC_SUMMARY_PROMPT_VERSION,
          error: friendlyAiError(err).slice(0, 1000),
        },
      },
    });
  }
}
