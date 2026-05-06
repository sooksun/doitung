// lib/ai/schemas/soar-output.ts
// Zod schema enforcing PRD §15 contract: every Item must have evidenceLinks OR evidenceMissing=true.

import { z } from 'zod';

const evidenceLinkSchema = z.object({
  documentId: z.number().int().nullable(),
  pageId: z.number().int().nullable(),
  quote: z.string().min(1),
});

const itemSchema = z
  .object({
    text: z.string().min(1),
    evidenceLinks: z.array(evidenceLinkSchema).default([]),
    evidenceMissing: z.boolean().default(false),
  })
  .refine(
    (i) => i.evidenceLinks.length > 0 || i.evidenceMissing === true,
    { message: 'Item must have at least one evidenceLink or evidenceMissing=true (PRD AC-09)' }
  );

const dimensionSchema = z.object({
  strengths: z.array(itemSchema),
  opportunities: z.array(itemSchema),
  aspirations: z.array(itemSchema),
  results: z.array(itemSchema),
});

const taskSchema = z.object({
  title: z.string().min(1),
  responsible: z.string().nullable(),
  evidenceRequired: z.string().nullable(),
});

export const soarOutputSchema = z.object({
  executiveInsight: z.string().min(1),
  byDimension: z.object({
    'Q-Leadership': dimensionSchema,
    'Q-PLC': dimensionSchema,
    'Q-Learning': dimensionSchema,
    'Q-Students': dimensionSchema,
  }),
  topPriorities: z
    .array(
      z.object({
        indicatorId: z.number().int().nullable(),
        qDimension: z.string(),
        gap: z.number(),
        reason: z.string(),
        recommendedAction: z.string(),
      })
    )
    .max(10),
  plcQuestions: z.array(z.string().min(1)).min(3).max(8),
  evidenceGaps: z.array(
    z.object({
      indicatorId: z.number().int().nullable(),
      qDimension: z.string(),
      missing: z.string(),
    })
  ),
  growthPlan90: z.object({
    day30: z.array(taskSchema),
    day60: z.array(taskSchema),
    day90: z.array(taskSchema),
  }),
});

export type SoarOutput = z.infer<typeof soarOutputSchema>;

// JSON-schema variant for Gemini structured output (Type-based schema is preferred over Zod
// because Gemini's @google/genai expects its own Type enum). We hand-craft this to mirror Zod.
export const SOAR_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'OBJECT',
  required: ['executiveInsight', 'byDimension', 'topPriorities', 'plcQuestions', 'evidenceGaps', 'growthPlan90'],
  properties: {
    executiveInsight: { type: 'STRING' },
    byDimension: {
      type: 'OBJECT',
      required: ['Q-Leadership', 'Q-PLC', 'Q-Learning', 'Q-Students'],
      properties: dimsObject(),
    },
    topPriorities: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['qDimension', 'gap', 'reason', 'recommendedAction'],
        properties: {
          indicatorId: { type: 'INTEGER', nullable: true },
          qDimension: { type: 'STRING' },
          gap: { type: 'NUMBER' },
          reason: { type: 'STRING' },
          recommendedAction: { type: 'STRING' },
        },
      },
    },
    plcQuestions: { type: 'ARRAY', items: { type: 'STRING' } },
    evidenceGaps: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['qDimension', 'missing'],
        properties: {
          indicatorId: { type: 'INTEGER', nullable: true },
          qDimension: { type: 'STRING' },
          missing: { type: 'STRING' },
        },
      },
    },
    growthPlan90: {
      type: 'OBJECT',
      required: ['day30', 'day60', 'day90'],
      properties: {
        day30: { type: 'ARRAY', items: taskSchemaJson() },
        day60: { type: 'ARRAY', items: taskSchemaJson() },
        day90: { type: 'ARRAY', items: taskSchemaJson() },
      },
    },
  },
};

function dimsObject() {
  const dim = dimensionSchemaJson();
  return {
    'Q-Leadership': dim,
    'Q-PLC': dim,
    'Q-Learning': dim,
    'Q-Students': dim,
  };
}

function dimensionSchemaJson() {
  const itm = itemSchemaJson();
  return {
    type: 'OBJECT',
    required: ['strengths', 'opportunities', 'aspirations', 'results'],
    properties: {
      strengths: { type: 'ARRAY', items: itm },
      opportunities: { type: 'ARRAY', items: itm },
      aspirations: { type: 'ARRAY', items: itm },
      results: { type: 'ARRAY', items: itm },
    },
  };
}

function itemSchemaJson() {
  return {
    type: 'OBJECT',
    required: ['text', 'evidenceLinks', 'evidenceMissing'],
    properties: {
      text: { type: 'STRING' },
      evidenceLinks: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          required: ['quote'],
          properties: {
            documentId: { type: 'INTEGER', nullable: true },
            pageId: { type: 'INTEGER', nullable: true },
            quote: { type: 'STRING' },
          },
        },
      },
      evidenceMissing: { type: 'BOOLEAN' },
    },
  };
}

function taskSchemaJson() {
  return {
    type: 'OBJECT',
    required: ['title'],
    properties: {
      title: { type: 'STRING' },
      responsible: { type: 'STRING', nullable: true },
      evidenceRequired: { type: 'STRING', nullable: true },
    },
  };
}
