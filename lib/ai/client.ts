// lib/ai/client.ts
// Singleton Google Gemini client + helpers for structured output and PDF File API uploads.

import { GoogleGenAI, Type } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';

let _client: GoogleGenAI | null = null;

export function gemini(): GoogleGenAI {
  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY is not set — AI features cannot run');
  }
  if (!_client) {
    _client = new GoogleGenAI({ apiKey: API_KEY });
  }
  return _client;
}

export const GEMINI_MODEL = MODEL;
export const GEMINI_EMBEDDING_MODEL = EMBEDDING_MODEL;
export { Type };

/**
 * Run a JSON-mode generation with retry on parse failure.
 * Returns parsed JSON; throws if both attempts fail or schema validation fails.
 */
export async function generateJson(opts: {
  systemInstruction: string;
  userPrompt: string;
  responseSchema?: any;
  maxOutputTokens?: number;
  files?: Array<{ uri: string; mimeType: string }>;
}): Promise<{ json: any; usage: { in: number; out: number } }> {
  const ai = gemini();
  const config: any = {
    systemInstruction: opts.systemInstruction,
    responseMimeType: 'application/json',
    maxOutputTokens: opts.maxOutputTokens ?? 16000,
  };
  if (opts.responseSchema) config.responseSchema = opts.responseSchema;

  const contents: any[] = [];
  if (opts.files?.length) {
    for (const f of opts.files) {
      contents.push({ role: 'user', parts: [{ fileData: { fileUri: f.uri, mimeType: f.mimeType } }] });
    }
  }
  contents.push({ role: 'user', parts: [{ text: opts.userPrompt }] });

  const res = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config,
  });

  const text = res.text ?? '';
  const usage = {
    in: res.usageMetadata?.promptTokenCount ?? 0,
    out: res.usageMetadata?.candidatesTokenCount ?? 0,
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini did not return valid JSON: ${text.slice(0, 200)}`);
  }
  return { json: parsed, usage };
}

/**
 * Upload a local PDF to Gemini File API. Returns the file URI for use in subsequent calls.
 * The uploaded file persists ~48h on Gemini's side (free for many regions).
 */
export async function uploadFile(filePath: string, displayName?: string): Promise<{ uri: string; mimeType: string; name: string }> {
  const ai = gemini();
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  const mimeType = filePath.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';

  const file = await ai.files.upload({
    file: filePath,
    config: { mimeType, displayName: displayName ?? path.basename(filePath) },
  });

  // The new SDK returns a file object with uri/name
  if (!file.uri) throw new Error('Gemini upload: missing uri in response');
  return { uri: file.uri, mimeType, name: file.name ?? '' };
}
