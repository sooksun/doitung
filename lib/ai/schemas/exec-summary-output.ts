// lib/ai/schemas/exec-summary-output.ts
// Zod + JSON schema for the "บทสรุปสำหรับผู้บริหาร" (Executive Summary) AI run.
//
// The run merges QUANTITATIVE data (Q-Model evaluation scores, per dimension) with
// QUALITATIVE data (the school's Iceberg brainstorm) and asks the model to discuss
// the two together. Output is intentionally narrow — one summary + a few bullet
// lists — so it renders cleanly as a leadership-facing brief rather than the full
// SOAR coaching report (which lives in lib/ai/schemas/soar-output.ts).

import { z } from 'zod';

export const execSummaryOutputSchema = z.object({
  // The headline brief leadership reads first — 1-3 short paragraphs.
  executiveSummary: z.string().min(1),
  // What the numbers say (ข้อมูลเชิงปริมาณ): gaps, strengths, weak dimensions.
  quantitativeFindings: z.array(z.string().min(1)).min(1).max(8),
  // What the brainstorm says (ข้อมูลเชิงคุณภาพ): themes from the Iceberg layers.
  qualitativeFindings: z.array(z.string().min(1)).min(1).max(8),
  // อภิปรายผล — explicitly ties the numbers to the brainstorm themes.
  discussion: z.string().min(1),
  // ข้อเสนอแนะเชิงนโยบาย/ปฏิบัติ for the school leadership.
  recommendations: z.array(z.string().min(1)).min(1).max(8),
});

export type ExecSummaryOutput = z.infer<typeof execSummaryOutputSchema>;

// JSON-schema (draft-07 / OpenAPI 3.1 style) for OpenRouter's response_format.
// Hand-mirrored from the Zod schema above; strings only, no nullables.
export const EXEC_SUMMARY_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  required: [
    'executiveSummary',
    'quantitativeFindings',
    'qualitativeFindings',
    'discussion',
    'recommendations',
  ],
  properties: {
    executiveSummary: { type: 'string' },
    quantitativeFindings: { type: 'array', items: { type: 'string' } },
    qualitativeFindings: { type: 'array', items: { type: 'string' } },
    discussion: { type: 'string' },
    recommendations: { type: 'array', items: { type: 'string' } },
  },
};
