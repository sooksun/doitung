// lib/ai/hash.ts
// Stable hash of canonicalized inputs → AiAnalysisRun.inputHash (cache key per PRD §21).

import { createHash } from 'node:crypto';

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return '{' + entries.map(([k, v]) => JSON.stringify(k) + ':' + canonicalJson(v)).join(',') + '}';
}

export function inputHash(input: unknown, promptVersion: string, model: string): string {
  return createHash('sha256')
    .update(promptVersion + '|' + model + '|' + canonicalJson(input))
    .digest('hex');
}
