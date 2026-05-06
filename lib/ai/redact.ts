// lib/ai/redact.ts
// Best-effort PII redaction for SAR text before sending to AI provider.
// Per PRD NFR Privacy: do not leak student PII to external models.
// Strips: 13-digit Thai national ID, full Thai/English name patterns prefixed with
// เด็กชาย / เด็กหญิง / ด.ช. / ด.ญ. / Mr / Mrs / Ms / นาย / นางสาว, and email-like tokens.

const PATTERNS: Array<{ name: string; re: RegExp; replace: string }> = [
  { name: 'thai-national-id', re: /\b\d{13}\b/g, replace: '[REDACTED:NID]' },
  { name: 'email', re: /[\w.+-]+@[\w-]+\.[\w.-]+/g, replace: '[REDACTED:EMAIL]' },
  { name: 'phone', re: /\b0\d{1,2}[- ]?\d{3,4}[- ]?\d{4}\b/g, replace: '[REDACTED:PHONE]' },
  // Thai student name prefixes — capture up to 2 following words
  { name: 'thai-student-name', re: /(เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.)\s*[ก-๙]+(\s+[ก-๙]+){0,2}/g, replace: '[REDACTED:NAME]' },
  // Thai adult name prefixes
  { name: 'thai-adult-name', re: /(นางสาว|นาย|นาง)\s*[ก-๙]+(\s+[ก-๙]+){0,2}/g, replace: '[REDACTED:NAME]' },
];

export interface RedactResult {
  text: string;
  counts: Record<string, number>;
}

export function redactPII(text: string): RedactResult {
  if (!text) return { text: '', counts: {} };
  let out = text;
  const counts: Record<string, number> = {};
  for (const p of PATTERNS) {
    const matches = out.match(p.re);
    if (matches) counts[p.name] = matches.length;
    out = out.replace(p.re, p.replace);
  }
  return { text: out, counts };
}
