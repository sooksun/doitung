// lib/jobs/extract-or-ocr.ts
// Async job: read SAR PDF → try pdf-parse first → if Thai-quality is poor, fall back to
// AI provider (OpenRouter) for OCR-style extraction. Persists per-page rows in SarPage.

import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import { generateJson, friendlyAiError } from '@/lib/ai/client';
import {
  SAR_EXTRACT_SYSTEM,
  SAR_EXTRACT_USER,
  SAR_EXTRACT_RESPONSE_SCHEMA,
} from '@/lib/ai/prompts/sar-thai-extract';

const MIN_THAI_RATIO = 0.4;

function thaiCharRatio(text: string): number {
  if (!text) return 0;
  const total = text.replace(/\s/g, '').length;
  if (total === 0) return 0;
  const thai = (text.match(/[฀-๿]/g) || []).length;
  return thai / total;
}

interface PdfParsePage {
  text: string;
  pageNumber: number;
}

async function nativeExtract(filePath: string): Promise<{ pages: PdfParsePage[]; pageCount: number; quality: number; ok: boolean }> {
  try {
    const mod: any = await import('pdf-parse');
    const PDFParse: any = mod.PDFParse;
    if (!PDFParse) return { pages: [], pageCount: 0, quality: 0, ok: false };
    const buf = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buf });
    const result = await parser.getText();
    await parser.destroy?.();

    // pdf-parse v2 returns { text, totalPages, pages: [{ pageNumber, text, ... }] }
    let pages: PdfParsePage[] = [];
    let pageCount = 0;
    let allText = '';
    if (Array.isArray(result?.pages) && result.pages.length > 0) {
      pages = result.pages.map((p: any, i: number) => ({
        pageNumber: typeof p.pageNumber === 'number' ? p.pageNumber : i + 1,
        text: String(p.text || '').trim(),
      }));
      pageCount = pages.length;
      allText = pages.map((p) => p.text).join('\n');
    } else if (typeof result?.text === 'string') {
      const pageTexts = result.text.split('\f');
      pages = pageTexts.map((t: string, i: number) => ({ pageNumber: i + 1, text: t.trim() }));
      pageCount = result.totalPages ?? result.numpages ?? pages.length;
      allText = result.text;
    }
    const quality = thaiCharRatio(allText);
    const ok = pages.length > 0 && pages.length === pageCount && quality >= MIN_THAI_RATIO;
    return { pages, pageCount, quality, ok };
  } catch (err) {
    console.warn('[nativeExtract] failed', err);
    return { pages: [], pageCount: 0, quality: 0, ok: false };
  }
}

async function aiExtract(filePath: string): Promise<{ pages: PdfParsePage[]; pageCount: number; confidences: number[] }> {
  // OpenRouter accepts the PDF inline as base64; retry-with-backoff is built into generateJson.
  const result = await generateJson({
    systemInstruction: SAR_EXTRACT_SYSTEM,
    userPrompt: SAR_EXTRACT_USER,
    responseSchema: SAR_EXTRACT_RESPONSE_SCHEMA,
    schemaName: 'sar_extract',
    maxOutputTokens: 64000,
    pdfFiles: [{ path: filePath }],
  });

  // Expected shape: { pages: [{ page, text, confidence? }] }; fall back to bare array
  // for older / non-conforming responses.
  const raw: any = result.json;
  const arr: Array<{ page: number; text: string; confidence?: number }> = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.pages)
      ? raw.pages
      : [];
  const pages: PdfParsePage[] = arr.map((p) => ({ pageNumber: p.page, text: p.text || '' }));
  const confidences = arr.map((p) => (typeof p.confidence === 'number' ? p.confidence : 0.85));
  return { pages, pageCount: pages.length, confidences };
}

export async function extractOrOcr(documentId: number): Promise<void> {
  const doc = await prisma.sarDocument.findUnique({ where: { id: documentId } });
  if (!doc) {
    console.error('[extractOrOcr] document not found', documentId);
    return;
  }

  await prisma.sarDocument.update({
    where: { id: documentId },
    data: { status: 'EXTRACTING', errorMessage: null },
  });

  const fullPath = path.join(process.cwd(), 'public', doc.filePath.replace(/^\//, ''));
  if (!fs.existsSync(fullPath)) {
    await prisma.sarDocument.update({
      where: { id: documentId },
      data: { status: 'UPLOADED', errorMessage: `File missing on disk: ${fullPath}` },
    });
    return;
  }

  try {
    // 1. Native extract
    const native = await nativeExtract(fullPath);
    let extractMethod: 'pdf-parse' | 'ai' = 'pdf-parse';
    let pages = native.pages;
    let pageCount = native.pageCount;
    let confidences: number[] | null = null;
    let quality = native.quality;

    // 2. Decide fallback
    if (!native.ok || native.pages.every((p) => p.text.length < 20)) {
      console.log(`[extractOrOcr] doc=${documentId} native quality low (${quality.toFixed(2)}), falling back to AI`);
      const g = await aiExtract(fullPath);
      if (g.pages.length > 0) {
        extractMethod = 'ai';
        pages = g.pages;
        pageCount = g.pageCount;
        confidences = g.confidences;
        // Re-measure quality on extracted text
        quality = thaiCharRatio(g.pages.map((p) => p.text).join('\n'));
      }
    }

    // 3. Upsert pages (delete old then insert fresh — rerun-friendly)
    await prisma.sarPage.deleteMany({ where: { documentId } });
    if (pages.length > 0) {
      await prisma.sarPage.createMany({
        data: pages.map((p, idx) => ({
          documentId,
          pageNumber: p.pageNumber,
          rawText: p.text,
          cleanedText: p.text,
          extractMethod,
          confidence: confidences ? confidences[idx] : extractMethod === 'ai' ? 0.85 : null,
          needsReview: extractMethod === 'ai' || quality < 0.6,
        })),
      });
    }

    await prisma.sarDocument.update({
      where: { id: documentId },
      data: {
        status: 'NEEDS_REVIEW',
        extractionMethod: extractMethod === 'ai' ? 'openrouter' : 'native',
        textQualityScore: Math.round(quality * 1000) / 1000,
        pageCount,
        errorMessage: null,
      },
    });
    console.log(`[extractOrOcr] doc=${documentId} done: ${extractMethod} ${pages.length} pages quality=${quality.toFixed(2)}`);
  } catch (err: any) {
    console.error('[extractOrOcr] failed', documentId, err);
    await prisma.sarDocument.update({
      where: { id: documentId },
      data: { status: 'UPLOADED', errorMessage: friendlyAiError(err).slice(0, 1000) },
    });
  }
}
