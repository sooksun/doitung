// lib/jobs/run-soar.ts
// Async job: build SOAR prompt from an EvaluationSession, call AI provider (OpenRouter)
// with structured output, persist parsed result into AiAnalysisOutput rows.
// Caches via inputHash.

import path from 'node:path';
import fs from 'node:fs';
import { prisma } from '@/lib/prisma';
import { generateJson, friendlyAiError, OPENROUTER_MODEL } from '@/lib/ai/client';
import { soarOutputSchema, SOAR_RESPONSE_SCHEMA } from '@/lib/ai/schemas/soar-output';
import {
  SOAR_PROMPT_VERSION,
  buildSoarUserPrompt,
} from '@/lib/ai/prompts/soar-coach';
import { getSystemPrompt } from '@/lib/ai/prompt-config';
import { inputHash } from '@/lib/ai/hash';
import { redactPII } from '@/lib/ai/redact';

const Q_DIM_BY_NAME_EN: Record<string, string> = {
  'Q-Leadership': 'Q-Leadership',
  'Q-PLC': 'Q-PLC',
  'Q-Learning': 'Q-Learning',
  'Q-Students': 'Q-Students',
};

export async function runSoar(runId: number): Promise<void> {
  const run = await prisma.aiAnalysisRun.findUnique({ where: { id: runId } });
  if (!run) {
    console.error('[runSoar] run not found', runId);
    return;
  }

  await prisma.aiAnalysisRun.update({
    where: { id: runId },
    data: { status: 'RUNNING', errorMessage: null },
  });

  try {
    // 1. Load evaluation context
    const session = await prisma.evaluationSession.findUnique({
      where: { id: run.evaluationSessionId },
      include: {
        school: { select: { id: true, nameTh: true, name: true } },
        academicYear: { select: { year: true } },
        term: { select: { name: true } },
        evaluator: { select: { name: true } },
        instrument: { select: { id: true } },
        responses: {
          include: {
            indicator: {
              select: {
                id: true,
                itemCode: true,
                textTh: true,
                section: { select: { nameEn: true } },
              },
            },
          },
        },
      },
    });
    if (!session) throw new Error('EvaluationSession not found');

    const promptInput = {
      schoolNameTh: session.school?.nameTh || session.school?.name || '',
      academicYearLabel: session.academicYear?.year || '',
      termLabel: session.term?.name || null,
      evaluatorName: session.evaluator?.name || '',
      responses: session.responses.map((r) => ({
        indicatorId: r.indicatorId,
        code: r.indicator.itemCode,
        text: r.indicator.textTh,
        qDimension: Q_DIM_BY_NAME_EN[r.indicator.section?.nameEn || ''] || 'Other',
        score: r.score ?? null,
        score2: r.score2 ?? null,
        comment: r.comment,
      })),
      sarDocuments: [] as Array<{ documentId: number; level: string; note: string }>,
    };

    // 2. Approved SAR documents for this school
    const sarDocs = await prisma.sarDocument.findMany({
      where: { schoolId: session.schoolId, status: 'APPROVED' },
      select: { id: true, level: true, filePath: true, bodyText: true },
      orderBy: { id: 'desc' },
      take: 4,
    });
    promptInput.sarDocuments = sarDocs.map((d) => ({
      documentId: d.id,
      level: d.level,
      note: 'cite documentId + page when quoting',
      bodyText: d.bodyText || null,
    }));

    // 3. Cache lookup
    const hash = inputHash(promptInput, SOAR_PROMPT_VERSION, OPENROUTER_MODEL);
    const cached = await prisma.aiAnalysisRun.findFirst({
      where: { inputHash: hash, status: 'DONE', id: { not: runId } },
      include: { outputs: true },
      orderBy: { id: 'desc' },
    });
    if (cached) {
      console.log(`[runSoar] run=${runId} cache hit from run=${cached.id}`);
      for (const out of cached.outputs) {
        await prisma.aiAnalysisOutput.create({
          data: {
            runId,
            outputType: out.outputType,
            jsonOutput: out.jsonOutput as any,
            humanStatus: 'DRAFT',
          },
        });
      }
      await prisma.aiAnalysisRun.update({
        where: { id: runId },
        data: {
          status: 'DONE',
          inputHash: hash,
          finishedAt: new Date(),
          tokensIn: 0,
          tokensOut: 0,
        },
      });
      return;
    }

    // 4. Redact + build user prompt
    const userPrompt = redactPII(buildSoarUserPrompt(promptInput)).text;

    // 5. Collect SAR PDF paths (sent inline as base64 via OpenRouter; skip text-only or missing files)
    const pdfFiles: Array<{ path: string; filename: string }> = [];
    for (const doc of sarDocs) {
      if (!doc.filePath) continue; // text-only doc — content is rendered in the user prompt instead
      const full = path.join(process.cwd(), 'public', doc.filePath.replace(/^\//, ''));
      if (fs.existsSync(full)) {
        pdfFiles.push({ path: full, filename: `sar-${doc.id}.pdf` });
      } else {
        console.warn('[runSoar] SAR doc file missing on disk', doc.id, full);
      }
    }

    // 6. Call AI provider
    const soarSystem = await getSystemPrompt('soar');
    const { json: raw, usage } = await generateJson({
      systemInstruction: soarSystem,
      userPrompt,
      responseSchema: SOAR_RESPONSE_SCHEMA,
      schemaName: 'soar_output',
      maxOutputTokens: 32000,
      pdfFiles,
    });

    // 7. Validate (retry once on schema fail with stricter system instruction)
    let parsed = soarOutputSchema.safeParse(raw);
    let usageRetry: { in: number; out: number } | null = null;
    if (!parsed.success) {
      console.warn('[runSoar] schema fail on first attempt, retrying with stricter system');
      const retryPrompt = `STRICT MODE: ทุก Item ต้องมี evidenceLinks (array, อาจว่าง) และ evidenceMissing (boolean). หาก evidenceLinks ว่าง ต้องตั้ง evidenceMissing=true เสมอ. ตอบ JSON เท่านั้น ห้ามมีคำพูดอื่น.\n\n${userPrompt}`;
      const retry = await generateJson({
        systemInstruction: soarSystem + '\n\n' + 'หากผลลัพธ์รอบก่อนไม่ผ่าน schema ให้ตอบใหม่โดยรักษากฎ evidenceLinks/evidenceMissing อย่างเคร่งครัด',
        userPrompt: retryPrompt,
        responseSchema: SOAR_RESPONSE_SCHEMA,
        schemaName: 'soar_output',
        maxOutputTokens: 32000,
        pdfFiles,
      });
      usageRetry = retry.usage;
      parsed = soarOutputSchema.safeParse(retry.json);
      if (!parsed.success) {
        throw new Error('SOAR output failed Zod validation: ' + parsed.error.issues.slice(0, 3).map((i) => i.message).join('; '));
      }
    }

    const out = parsed.data;

    // 8. Persist outputs by type
    const outputRows: Array<{ outputType: string; jsonOutput: any }> = [
      { outputType: 'executive', jsonOutput: { executiveInsight: out.executiveInsight } },
      { outputType: 'soar', jsonOutput: out.byDimension },
      { outputType: 'priorities', jsonOutput: out.topPriorities },
      { outputType: 'plc_questions', jsonOutput: out.plcQuestions },
      { outputType: 'evidence_gaps', jsonOutput: out.evidenceGaps },
      { outputType: 'plan_30_60_90', jsonOutput: out.growthPlan90 },
    ];
    // Iceberg view (4 layers × 2 perspectives × 4 dimensions). Optional in the
    // Zod schema, so older runs without it still validated; for soar-v2 onwards
    // the prompt forces the model to fill it.
    if (out.icebergByDimension) {
      outputRows.push({ outputType: 'iceberg', jsonOutput: out.icebergByDimension });
    }
    for (const row of outputRows) {
      await prisma.aiAnalysisOutput.create({
        data: { runId, outputType: row.outputType, jsonOutput: row.jsonOutput, humanStatus: 'DRAFT' },
      });
    }

    await prisma.aiAnalysisRun.update({
      where: { id: runId },
      data: {
        status: 'DONE',
        inputHash: hash,
        finishedAt: new Date(),
        tokensIn: usage.in + (usageRetry?.in || 0),
        tokensOut: usage.out + (usageRetry?.out || 0),
      },
    });
    console.log(`[runSoar] run=${runId} DONE (in=${usage.in} out=${usage.out})`);
  } catch (err: any) {
    console.error('[runSoar] failed', runId, err);
    await prisma.aiAnalysisRun.update({
      where: { id: runId },
      data: { status: 'FAILED', errorMessage: friendlyAiError(err).slice(0, 1000), finishedAt: new Date() },
    });
  }
}
