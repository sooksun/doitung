// lib/ai/client.ts
// Singleton OpenRouter client (via OpenAI SDK + baseURL override) + helpers for
// JSON-mode generation and inline PDF input. OpenRouter normalises the request
// across providers; for `google/gemini-2.5-flash` PDFs are passed through to
// Gemini's native parser, so behaviour matches the previous direct-Gemini path.

import OpenAI from 'openai';
import fs from 'node:fs';
import path from 'node:path';

const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
const BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const APP_REFERER = process.env.NEXT_PUBLIC_APP_URL || 'https://doitung.cnppai.com';
const APP_TITLE = 'DOITUNG-DE';

let _client: OpenAI | null = null;

export function aiClient(): OpenAI {
  if (!API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set — AI features cannot run');
  }
  if (!_client) {
    _client = new OpenAI({
      apiKey: API_KEY,
      baseURL: BASE_URL,
      defaultHeaders: {
        'HTTP-Referer': APP_REFERER,
        'X-Title': APP_TITLE,
      },
    });
  }
  return _client;
}

export const OPENROUTER_MODEL = MODEL;

// Status codes that are worth retrying. 401/403/404/422 are not — those mean
// the request itself is wrong and another attempt will produce the same error.
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

async function withBackoff<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const status = err?.status ?? err?.response?.status;
      if (!RETRYABLE_STATUS.has(status) || i === attempts - 1) throw err;
      const wait = 1000 * Math.pow(2, i) + Math.floor(Math.random() * 500);
      console.warn(`[ai] transient ${status}, retry ${i + 1}/${attempts} in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

export interface PdfFileInput {
  /** absolute path to a PDF on disk */
  path: string;
  /** display filename sent to the model; defaults to basename(path) */
  filename?: string;
}

/**
 * Run a JSON-mode generation with automatic retry-with-backoff on transient
 * errors. PDF files (if any) are sent inline as base64 data URLs — OpenRouter
 * routes them to the model's native PDF parser when supported.
 *
 * @returns parsed JSON; throws if the model output is not valid JSON or if
 *          all retry attempts fail.
 */
export async function generateJson(opts: {
  systemInstruction: string;
  userPrompt: string;
  /** Optional JSON-schema for structured output. If omitted, relies on
   *  json_object mode + the prompt to produce well-formed JSON. */
  responseSchema?: any;
  /** Schema name; only used when responseSchema is set. Default: 'response'. */
  schemaName?: string;
  maxOutputTokens?: number;
  pdfFiles?: PdfFileInput[];
}): Promise<{ json: any; usage: { in: number; out: number } }> {
  const ai = aiClient();

  const userContent: any[] = [];
  if (opts.pdfFiles?.length) {
    for (const f of opts.pdfFiles) {
      if (!fs.existsSync(f.path)) {
        console.warn(`[ai] pdf missing on disk, skipping: ${f.path}`);
        continue;
      }
      const b64 = fs.readFileSync(f.path).toString('base64');
      const filename = f.filename || path.basename(f.path);
      userContent.push({
        type: 'file',
        file: {
          filename,
          file_data: `data:application/pdf;base64,${b64}`,
        },
      });
    }
  }
  userContent.push({ type: 'text', text: opts.userPrompt });

  const responseFormat: any = opts.responseSchema
    ? {
        type: 'json_schema',
        json_schema: {
          name: opts.schemaName || 'response',
          schema: opts.responseSchema,
          strict: false,
        },
      }
    : { type: 'json_object' };

  const res = await withBackoff(() =>
    ai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: opts.systemInstruction },
        { role: 'user', content: userContent as any },
      ],
      max_tokens: opts.maxOutputTokens ?? 16000,
      response_format: responseFormat,
    })
  );

  // Defensive access: OpenRouter occasionally returns a response object without
  // `choices` populated (e.g. on certain error states or upstream provider hiccups);
  // bare `res.choices[0]` would throw TypeError before our error path runs.
  const choice = res?.choices?.[0];
  const finishReason = choice?.finish_reason || 'unknown';
  const rawText = choice?.message?.content ?? '';
  const usage = {
    in: res?.usage?.prompt_tokens ?? 0,
    out: res?.usage?.completion_tokens ?? 0,
  };

  if (!rawText) {
    throw new Error(
      `AI returned empty response (finish=${finishReason}, choices=${res?.choices?.length ?? 0}). ` +
      `Likely a provider-side error — try again in a moment.`
    );
  }

  // Some Gemini-compat models occasionally wrap JSON in markdown despite json_object
  // mode; strip any leading/trailing ```json fences before parsing.
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\s*```\s*$/, '');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (parseErr: any) {
    const truncated = finishReason === 'length';
    const head = cleaned.slice(0, 200);
    const tail = cleaned.length > 300 ? '…' + cleaned.slice(-100) : '';
    throw new Error(
      `AI returned invalid JSON (len=${cleaned.length}, finish=${finishReason}` +
      `${truncated ? ', TRUNCATED — model hit max_tokens' : ''}, parseErr=${parseErr.message}): ${head}${tail}`
    );
  }
  return { json: parsed, usage };
}

/**
 * Convert an OpenRouter/OpenAI error into a short Thai message suitable for
 * showing to school admins. Falls back to the original message if it doesn't
 * match a known transient class.
 */
export function friendlyAiError(err: any): string {
  const status = err?.status ?? err?.response?.status;
  const msg = String(err?.message || err || '');
  if (status === 429) return 'AI ถูกจำกัดอัตราชั่วคราว (rate limit) — กรุณาลองใหม่ใน 1-2 นาที';
  if (status === 503 || /UNAVAILABLE|overloaded|high demand/i.test(msg)) {
    return 'AI provider โอเวอร์โหลดชั่วคราว — กรุณาลองใหม่ใน 1-2 นาที';
  }
  if (status === 401 || status === 403) return 'AI authentication ล้มเหลว — โปรดตรวจ OPENROUTER_API_KEY';
  if (status === 413 || /too large|payload/i.test(msg)) return 'ไฟล์ PDF ใหญ่เกินไป — กรุณาแบ่งไฟล์';
  return msg.slice(0, 300);
}
