// lib/jobs/extract-or-ocr.ts
// Async job: read SAR PDF → try pdf-parse first → if Thai-quality is poor, fall back to
// AI provider (OpenRouter) for OCR-style extraction. Persists per-page rows in SarPage.

import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import { generateJson, friendlyAiError } from '@/lib/ai/client';
import {
  SAR_EXTRACT_USER,
  SAR_EXTRACT_RESPONSE_SCHEMA,
} from '@/lib/ai/prompts/sar-thai-extract';
import { getSystemPrompt } from '@/lib/ai/prompt-config';

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

interface AiExtractResult { pages: PdfParsePage[]; pageCount: number; confidences: number[] }

// Pages-per-AI-call. Thai SARs averaged ~5-10k chars/page; at 5 pages we should
// stay well under gemini-2.5-flash's 65k output-token ceiling per chunk while
// keeping the number of round-trips reasonable for a 30-50 page document.
const AI_CHUNK_SIZE = 5;

function parsePagesPayload(raw: any): { pages: PdfParsePage[]; confidences: number[] } {
  // Expected shape: { pages: [{ page, text, confidence? }] }; fall back to bare array
  // for older / non-conforming responses.
  const arr: Array<{ page: number; text: string; confidence?: number }> = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.pages)
      ? raw.pages
      : [];
  const pages: PdfParsePage[] = arr.map((p) => ({ pageNumber: p.page, text: p.text || '' }));
  const confidences = arr.map((p) => (typeof p.confidence === 'number' ? p.confidence : 0.85));
  return { pages, confidences };
}

async function aiExtractRange(filePath: string, startPage: number | null, endPage: number | null, systemPrompt: string): Promise<AiExtractResult> {
  const rangeNote = startPage && endPage
    ? `\n\nสำคัญ: รอบนี้ให้ถอดข้อความ**เฉพาะหน้า ${startPage} ถึง ${endPage}** เท่านั้น (ไม่รวมหน้าก่อนหรือหลังช่วงนี้) คงเลขหน้าจริงตามเอกสาร`
    : '';
  const result = await generateJson({
    systemInstruction: systemPrompt,
    userPrompt: SAR_EXTRACT_USER + rangeNote,
    responseSchema: SAR_EXTRACT_RESPONSE_SCHEMA,
    schemaName: 'sar_extract',
    maxOutputTokens: 32000,
    pdfFiles: [{ path: filePath }],
  });
  const { pages, confidences } = parsePagesPayload(result.json);
  return { pages, pageCount: pages.length, confidences };
}

async function aiExtract(filePath: string, knownPageCount: number, systemPrompt: string): Promise<AiExtractResult> {
  // Short docs: one shot. Long docs: chunk to avoid hitting the per-response
  // token ceiling on Thai content (which inflates badly under JSON encoding).
  if (knownPageCount > 0 && knownPageCount <= AI_CHUNK_SIZE) {
    return aiExtractRange(filePath, null, null, systemPrompt);
  }
  if (knownPageCount === 0) {
    // pdf-parse couldn't even tell us a page count — best-effort single shot
    // with a smaller token budget so we get a clean truncation error if huge.
    console.warn('[aiExtract] page count unknown, falling back to single-shot');
    return aiExtractRange(filePath, null, null, systemPrompt);
  }

  const allPages: PdfParsePage[] = [];
  const allConfidences: number[] = [];
  for (let start = 1; start <= knownPageCount; start += AI_CHUNK_SIZE) {
    const end = Math.min(start + AI_CHUNK_SIZE - 1, knownPageCount);
    console.log(`[aiExtract] chunk pages ${start}-${end} of ${knownPageCount}`);
    const chunk = await aiExtractRange(filePath, start, end, systemPrompt);
    for (let i = 0; i < chunk.pages.length; i++) {
      const p = chunk.pages[i];
      // Guard: model occasionally returns out-of-range pages — keep only what we asked for
      if (p.pageNumber >= start && p.pageNumber <= end) {
        allPages.push(p);
        allConfidences.push(chunk.confidences[i] ?? 0.85);
      }
    }
  }

  // Sort by page number so downstream order is deterministic regardless of model output order
  const indexed = allPages.map((p, i) => ({ p, c: allConfidences[i] }));
  indexed.sort((a, b) => a.p.pageNumber - b.p.pageNumber);
  return {
    pages: indexed.map((x) => x.p),
    pageCount: indexed.length,
    confidences: indexed.map((x) => x.c),
  };
}

export async function extractOrOcr(documentId: number): Promise<void> {
  const doc = await prisma.sarDocument.findUnique({ where: { id: documentId } });
  if (!doc) {
    console.error('[extractOrOcr] document not found', documentId);
    return;
  }

  const hasFile = !!doc.filePath;
  const trimmedBody = doc.bodyText?.trim() || '';
  const hasText = trimmedBody.length > 0;

  if (!hasFile && !hasText) {
    await prisma.sarDocument.update({
      where: { id: documentId },
      data: { status: 'UPLOADED', errorMessage: 'ไม่มีข้อมูล: ต้องมี PDF หรือข้อความอย่างน้อยหนึ่งอย่าง' },
    });
    return;
  }

  await prisma.sarDocument.update({
    where: { id: documentId },
    data: { status: 'EXTRACTING', errorMessage: null },
  });

  try {
    let pdfPages: PdfParsePage[] = [];
    let pdfExtractMethod: 'pdf-parse' | 'ai' = 'pdf-parse';
    let pdfConfidences: number[] | null = null;
    let pdfQuality = 0;
    let pdfFileMissing = false;

    if (hasFile) {
      const fullPath = path.join(process.cwd(), 'public', doc.filePath!.replace(/^\//, ''));
      if (!fs.existsSync(fullPath)) {
        if (!hasText) {
          await prisma.sarDocument.update({
            where: { id: documentId },
            data: { status: 'UPLOADED', errorMessage: `File missing on disk: ${fullPath}` },
          });
          return;
        }
        // Text exists — degrade gracefully and proceed with text only
        console.warn('[extractOrOcr] file missing on disk, proceeding with bodyText only', documentId, fullPath);
        pdfFileMissing = true;
      } else {
        const native = await nativeExtract(fullPath);
        pdfPages = native.pages;
        pdfQuality = native.quality;

        if (!native.ok || native.pages.every((p) => p.text.length < 20)) {
          console.log(`[extractOrOcr] doc=${documentId} native quality low (${pdfQuality.toFixed(2)}, pages=${native.pageCount}), falling back to AI`);
          const sarExtractSystem = await getSystemPrompt('sar-extract');
          const g = await aiExtract(fullPath, native.pageCount, sarExtractSystem);
          if (g.pages.length > 0) {
            pdfExtractMethod = 'ai';
            pdfPages = g.pages;
            pdfConfidences = g.confidences;
            pdfQuality = thaiCharRatio(g.pages.map((p) => p.text).join('\n'));
          }
        }
      }
    }

    // Build complete page set: PDF pages + (optional) one trailing manual page
    const rowsToInsert: Array<{
      pageNumber: number;
      rawText: string;
      extractMethod: string;
      confidence: number | null;
      needsReview: boolean;
    }> = [];

    pdfPages.forEach((p, idx) => {
      rowsToInsert.push({
        pageNumber: p.pageNumber,
        rawText: p.text,
        extractMethod: pdfExtractMethod,
        confidence: pdfConfidences ? pdfConfidences[idx] : pdfExtractMethod === 'ai' ? 0.85 : null,
        needsReview: pdfExtractMethod === 'ai' || pdfQuality < 0.6,
      });
    });

    if (hasText) {
      const lastPdfPageNumber = rowsToInsert.length > 0 ? Math.max(...rowsToInsert.map((p) => p.pageNumber)) : 0;
      rowsToInsert.push({
        pageNumber: lastPdfPageNumber + 1,
        rawText: trimmedBody,
        extractMethod: 'manual',
        confidence: 1.0,
        needsReview: false,
      });
    }

    // Recompute overall quality including the manual page (high quality by definition)
    const overallQuality = rowsToInsert.length > 0
      ? thaiCharRatio(rowsToInsert.map((p) => p.rawText).join('\n'))
      : 0;

    // Wipe + re-insert (rerun-friendly)
    await prisma.sarPage.deleteMany({ where: { documentId } });
    if (rowsToInsert.length > 0) {
      await prisma.sarPage.createMany({
        data: rowsToInsert.map((p) => ({
          documentId,
          pageNumber: p.pageNumber,
          rawText: p.rawText,
          cleanedText: p.rawText,
          extractMethod: p.extractMethod,
          confidence: p.confidence,
          needsReview: p.needsReview,
        })),
      });
    }

    // Compose extractionMethod label for display
    let extractionMethod: string;
    if (hasFile && !pdfFileMissing && hasText) {
      extractionMethod = (pdfExtractMethod === 'ai' ? 'openrouter' : 'native') + '+manual';
    } else if (hasFile && !pdfFileMissing) {
      extractionMethod = pdfExtractMethod === 'ai' ? 'openrouter' : 'native';
    } else {
      extractionMethod = 'manual';
    }

    await prisma.sarDocument.update({
      where: { id: documentId },
      data: {
        status: 'NEEDS_REVIEW',
        extractionMethod,
        textQualityScore: Math.round(overallQuality * 1000) / 1000,
        pageCount: rowsToInsert.length,
        errorMessage: pdfFileMissing ? 'ไฟล์ PDF เดิมหาย — ใช้เฉพาะข้อความที่บันทึกไว้' : null,
      },
    });
    console.log(`[extractOrOcr] doc=${documentId} done: method=${extractionMethod} pages=${rowsToInsert.length} quality=${overallQuality.toFixed(2)}`);
  } catch (err: any) {
    console.error('[extractOrOcr] failed', documentId, err);
    await prisma.sarDocument.update({
      where: { id: documentId },
      data: { status: 'UPLOADED', errorMessage: friendlyAiError(err).slice(0, 1000) },
    });
  }
}
