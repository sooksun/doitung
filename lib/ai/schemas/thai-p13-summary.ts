// lib/ai/schemas/thai-p13-summary.ts
// Zod + JSON schema for the THAI_P1_3 end-of-year AI summary.
// One output shape is reused for all three scopes (individual / school / project);
// the prompt varies but the leadership-facing brief is structured the same way:
// an overview + strengths + areas to develop + reflection insights + recommendations.

import { z } from 'zod';

export const thaiP13SummaryOutputSchema = z.object({
  // บทสรุปภาพรวม — 1-3 short paragraphs an admin reads first.
  executiveSummary: z.string().min(1),
  // จุดแข็ง — what the scores/reflections show is going well.
  strengths: z.array(z.string().min(1)).min(1).max(8),
  // จุดที่ควรพัฒนา — weak dimensions / gaps.
  improvements: z.array(z.string().min(1)).min(1).max(8),
  // ประเด็นสำคัญจากการสะท้อนคิด — themes distilled from teachers' reflections.
  reflectionInsights: z.array(z.string().min(1)).min(0).max(8),
  // ข้อเสนอแนะเชิงปฏิบัติ — actionable next steps.
  recommendations: z.array(z.string().min(1)).min(1).max(8),
});

export type ThaiP13SummaryOutput = z.infer<typeof thaiP13SummaryOutputSchema>;

// JSON-schema for OpenRouter response_format. Hand-mirrored; strings only.
export const THAI_P13_SUMMARY_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  required: ['executiveSummary', 'strengths', 'improvements', 'reflectionInsights', 'recommendations'],
  properties: {
    executiveSummary: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    improvements: { type: 'array', items: { type: 'string' } },
    reflectionInsights: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
  },
};
