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

// Iceberg Model layer: each layer captures both the current and the desired state.
// "current" = สิ่งที่เป็นอยู่ — what's actually happening in the school today.
// "desired" = สิ่งที่อยากให้เป็น — the future state the school is aiming for.
const icebergLayerSchema = z.object({
  current: z.array(z.string().min(1).max(400)).min(1).max(5),
  desired: z.array(z.string().min(1).max(400)).min(1).max(5),
});

// Iceberg per Q-dimension: 4 layers from the visible event surface down to the
// mental models that hold the structure in place.
//   situations   = ชั้น 1 สถานการณ์ที่เห็น
//   patterns     = ชั้น 2 รูปแบบของปัญหาที่เกิดซ้ำ
//   structures   = ชั้น 3 โครงสร้าง (นโยบาย / ค่านิยม / ระบบ)
//   mentalModels = ชั้น 4 แบบจำลองวิธีคิด (ความเชื่อ / ทัศนคติ / สมมติฐานที่ฝังลึก)
const icebergPerDimensionSchema = z.object({
  situations: icebergLayerSchema,
  patterns: icebergLayerSchema,
  structures: icebergLayerSchema,
  mentalModels: icebergLayerSchema,
});

export const soarOutputSchema = z.object({
  executiveInsight: z.string().min(1),
  byDimension: z.object({
    'Q-Leadership': dimensionSchema,
    'Q-PLC': dimensionSchema,
    'Q-Learning': dimensionSchema,
    'Q-Students': dimensionSchema,
  }),
  // Iceberg view per dimension — optional so legacy runs (pre-v2) still parse.
  icebergByDimension: z
    .object({
      'Q-Leadership': icebergPerDimensionSchema,
      'Q-PLC': icebergPerDimensionSchema,
      'Q-Learning': icebergPerDimensionSchema,
      'Q-Students': icebergPerDimensionSchema,
    })
    .optional(),
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

// JSON-schema (draft-07 / OpenAPI 3.1 style) for OpenRouter's response_format.
// Uses lowercase types; nullable fields use type-array `['integer', 'null']`.
// Hand-mirrored from the Zod schema above.
export const SOAR_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  required: ['executiveInsight', 'byDimension', 'topPriorities', 'plcQuestions', 'evidenceGaps', 'growthPlan90'],
  properties: {
    executiveInsight: { type: 'string' },
    byDimension: {
      type: 'object',
      required: ['Q-Leadership', 'Q-PLC', 'Q-Learning', 'Q-Students'],
      properties: dimsObject(),
    },
    icebergByDimension: {
      type: 'object',
      required: ['Q-Leadership', 'Q-PLC', 'Q-Learning', 'Q-Students'],
      properties: icebergDimsObject(),
    },
    topPriorities: {
      type: 'array',
      items: {
        type: 'object',
        required: ['qDimension', 'gap', 'reason', 'recommendedAction'],
        properties: {
          indicatorId: { type: ['integer', 'null'] },
          qDimension: { type: 'string' },
          gap: { type: 'number' },
          reason: { type: 'string' },
          recommendedAction: { type: 'string' },
        },
      },
    },
    plcQuestions: { type: 'array', items: { type: 'string' } },
    evidenceGaps: {
      type: 'array',
      items: {
        type: 'object',
        required: ['qDimension', 'missing'],
        properties: {
          indicatorId: { type: ['integer', 'null'] },
          qDimension: { type: 'string' },
          missing: { type: 'string' },
        },
      },
    },
    growthPlan90: {
      type: 'object',
      required: ['day30', 'day60', 'day90'],
      properties: {
        day30: { type: 'array', items: taskSchemaJson() },
        day60: { type: 'array', items: taskSchemaJson() },
        day90: { type: 'array', items: taskSchemaJson() },
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
    type: 'object',
    required: ['strengths', 'opportunities', 'aspirations', 'results'],
    properties: {
      strengths: { type: 'array', items: itm },
      opportunities: { type: 'array', items: itm },
      aspirations: { type: 'array', items: itm },
      results: { type: 'array', items: itm },
    },
  };
}

function itemSchemaJson() {
  return {
    type: 'object',
    required: ['text', 'evidenceLinks', 'evidenceMissing'],
    properties: {
      text: { type: 'string' },
      evidenceLinks: {
        type: 'array',
        items: {
          type: 'object',
          required: ['quote'],
          properties: {
            documentId: { type: ['integer', 'null'] },
            pageId: { type: ['integer', 'null'] },
            quote: { type: 'string' },
          },
        },
      },
      evidenceMissing: { type: 'boolean' },
    },
  };
}

function taskSchemaJson() {
  return {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string' },
      responsible: { type: ['string', 'null'] },
      evidenceRequired: { type: ['string', 'null'] },
    },
  };
}

function icebergDimsObject() {
  const dim = icebergPerDimensionJson();
  return {
    'Q-Leadership': dim,
    'Q-PLC': dim,
    'Q-Learning': dim,
    'Q-Students': dim,
  };
}

function icebergPerDimensionJson() {
  const layer = icebergLayerJson();
  return {
    type: 'object',
    required: ['situations', 'patterns', 'structures', 'mentalModels'],
    properties: {
      situations: layer,
      patterns: layer,
      structures: layer,
      mentalModels: layer,
    },
  };
}

function icebergLayerJson() {
  return {
    type: 'object',
    required: ['current', 'desired'],
    properties: {
      current: { type: 'array', items: { type: 'string' } },
      desired: { type: 'array', items: { type: 'string' } },
    },
  };
}
