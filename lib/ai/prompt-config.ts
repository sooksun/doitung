// lib/ai/prompt-config.ts
// Admin-editable overrides for the AI system prompts (global / project-wide).
//
// The code constants in lib/ai/prompts/* stay the canonical DEFAULT. This module
// keeps a registry of which prompts are manageable (key → default + label) and
// resolves the ACTIVE system prompt: a row in AiPromptConfig overrides the default
// when it exists, is enabled, and is non-blank — otherwise the default is used.
//
// Jobs call getSystemPrompt(key); the admin API uses listPromptConfigs / set / reset.
// Only the SYSTEM prompt is overridable — user-prompt builders (with interpolated
// variables) stay in code.

import { prisma } from '@/lib/prisma';
import { EXEC_SUMMARY_SYSTEM_PROMPT } from './prompts/exec-summary';
import { THAI_P13_SUMMARY_SYSTEM_PROMPT } from './prompts/thai-p13-summary';
import { THAI_P13_SUPERVISION_SYSTEM_PROMPT } from './prompts/thai-p13-supervision';
import { SOAR_SYSTEM_PROMPT } from './prompts/soar-coach';
import { SAR_EXTRACT_SYSTEM } from './prompts/sar-thai-extract';

export type PromptKey =
  | 'exec-summary'
  | 'thai-p13-summary'
  | 'thai-p13-supervision'
  | 'soar'
  | 'sar-extract';

export interface PromptMeta {
  key: PromptKey;
  label: string;
  description: string;
  /** Canonical default system prompt from the code constants. */
  default: string;
}

// Single source of truth for which prompts are manageable + their defaults.
export const PROMPT_REGISTRY: PromptMeta[] = [
  {
    key: 'thai-p13-summary',
    label: 'สรุปผู้บริหาร — ภาษาไทย ป.1–3',
    description: 'บทสรุปผลการประเมินภาษาไทย ป.1–3 (รายบุคคล/โรงเรียน/เครือข่าย/โครงการ)',
    default: THAI_P13_SUMMARY_SYSTEM_PROMPT,
  },
  {
    key: 'thai-p13-supervision',
    label: 'บทนิเทศ — ภาษาไทย ป.1–3',
    description: 'บทสรุปรายบุคคลสำหรับทีมหนุนเสริมก่อนเข้านิเทศ (รายรอบ)',
    default: THAI_P13_SUPERVISION_SYSTEM_PROMPT,
  },
  {
    key: 'exec-summary',
    label: 'บทสรุปผู้บริหาร — Q-Model (SAR)',
    description: 'สังเคราะห์คะแนน Q-Model + การระดมสมอง Iceberg เป็นบทสรุปผู้บริหาร',
    default: EXEC_SUMMARY_SYSTEM_PROMPT,
  },
  {
    key: 'soar',
    label: 'SOAR Coach — วิเคราะห์ SAR/Q-Model',
    description: 'วิเคราะห์ SOAR + Iceberg รายมิติจากผลประเมินและเอกสาร SAR',
    default: SOAR_SYSTEM_PROMPT,
  },
  {
    key: 'sar-extract',
    label: 'สกัดข้อความ SAR (OCR)',
    description: 'ถอดข้อความภาษาไทยจาก PDF เอกสาร SAR — แก้เฉพาะเมื่อจำเป็น (กระทบความแม่นยำการสกัด)',
    default: SAR_EXTRACT_SYSTEM,
  },
];

const byKey = new Map<PromptKey, PromptMeta>(PROMPT_REGISTRY.map((p) => [p.key, p]));

export function isPromptKey(k: unknown): k is PromptKey {
  return typeof k === 'string' && byKey.has(k as PromptKey);
}

function defaultOf(key: PromptKey): string {
  return byKey.get(key)?.default ?? '';
}

/**
 * Resolve the active system prompt for a key: the admin override when it exists,
 * is enabled and non-blank; otherwise the code default. Used by the AI jobs.
 */
export async function getSystemPrompt(key: PromptKey): Promise<string> {
  const row = await prisma.aiPromptConfig.findUnique({ where: { key } });
  if (row && row.enabled && row.systemPrompt.trim()) return row.systemPrompt;
  return defaultOf(key);
}

export interface PromptConfigView {
  key: PromptKey;
  label: string;
  description: string;
  default: string;
  override: string | null;
  enabled: boolean;
  isOverridden: boolean;
  active: string;
  updatedAt: string | null;
}

/** Merge the registry with stored overrides for the admin UI. */
export async function listPromptConfigs(): Promise<PromptConfigView[]> {
  const rows = await prisma.aiPromptConfig.findMany();
  const rowByKey = new Map(rows.map((r) => [r.key, r]));
  return PROMPT_REGISTRY.map((p) => {
    const r = rowByKey.get(p.key);
    const isOverridden = !!(r && r.systemPrompt.trim());
    const active = r && r.enabled && r.systemPrompt.trim() ? r.systemPrompt : p.default;
    return {
      key: p.key,
      label: p.label,
      description: p.description,
      default: p.default,
      override: r?.systemPrompt ?? null,
      enabled: r?.enabled ?? false,
      isOverridden,
      active,
      updatedAt: r?.updatedAt ? r.updatedAt.toISOString() : null,
    };
  });
}

/** Upsert an override (system prompt text and/or the enabled flag). */
export async function setSystemPrompt(
  key: PromptKey,
  patch: { systemPrompt?: string; enabled?: boolean },
  userId?: number,
): Promise<void> {
  const data: { systemPrompt?: string; enabled?: boolean; updatedById?: number | null } = {};
  if (typeof patch.systemPrompt === 'string') data.systemPrompt = patch.systemPrompt;
  if (typeof patch.enabled === 'boolean') data.enabled = patch.enabled;
  data.updatedById = userId ?? null;
  await prisma.aiPromptConfig.upsert({
    where: { key },
    create: {
      key,
      systemPrompt: patch.systemPrompt ?? '',
      enabled: patch.enabled ?? true,
      updatedById: userId ?? null,
    },
    update: data,
  });
}

/** Remove the override → fall back to the code default. */
export async function resetSystemPrompt(key: PromptKey): Promise<void> {
  await prisma.aiPromptConfig.deleteMany({ where: { key } });
}
