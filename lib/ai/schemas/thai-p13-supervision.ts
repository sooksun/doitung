// lib/ai/schemas/thai-p13-supervision.ts
// Zod + JSON schema for the THAI_P1_3 per-teacher SUPERVISION brief — the
// pre-visit document the "ทีมหนุนเสริมดอยตุง" (Doitung coaching team) reads
// before going to supervise/coach a teacher. Generated PER ROUND (ครั้งที่ 1 / 2).
// Differs from the leadership summary: it foregrounds what the TEAM should
// observe and how they should coach, not just findings.

import { z } from 'zod';

export const thaiP13SupervisionOutputSchema = z.object({
  // ภาพรวมครูคนนี้สำหรับทีมก่อนเข้านิเทศ — 1-3 short paragraphs.
  executiveSummary: z.string().min(1),
  // จุดเด่นที่ควรชื่นชม/ต่อยอด
  strengths: z.array(z.string().min(1)).min(1).max(8),
  // ประเด็นที่ควรพัฒนา/เฝ้าระวัง
  concerns: z.array(z.string().min(1)).min(1).max(8),
  // ประเด็นที่ทีมควรสังเกต/โฟกัสเมื่อเข้านิเทศในห้องเรียน
  supervisionFocus: z.array(z.string().min(1)).min(1).max(8),
  // ข้อเสนอแนะ/แนวทางการนิเทศ-หนุนเสริมที่ทีมควรทำกับครูคนนี้
  coachingRecommendations: z.array(z.string().min(1)).min(1).max(8),
});

export type ThaiP13SupervisionOutput = z.infer<typeof thaiP13SupervisionOutputSchema>;

export const THAI_P13_SUPERVISION_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  required: ['executiveSummary', 'strengths', 'concerns', 'supervisionFocus', 'coachingRecommendations'],
  properties: {
    executiveSummary: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    concerns: { type: 'array', items: { type: 'string' } },
    supervisionFocus: { type: 'array', items: { type: 'string' } },
    coachingRecommendations: { type: 'array', items: { type: 'string' } },
  },
};
