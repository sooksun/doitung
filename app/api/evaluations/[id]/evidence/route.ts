// app/api/evaluations/[id]/evidence/route.ts
// GET  - list evidence for an evaluation (any authenticated viewer)
// POST - add evidence (owner/ADMIN): multipart with EITHER a `file` (image/document)
//        OR a `url` (e.g. video link), plus optional `description` (caption).
// Files are written under public/uploads/evidence/<sessionId>/ and served statically.

import { NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, requireAuth, hasRole } from '@/lib/api-utils';

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_EXT = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
]);

function uploadsRoot() {
  return path.join(process.cwd(), 'public', 'uploads', 'evidence');
}
function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth(request);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return errorResponse('Invalid evaluation ID', 400);

    const items = await prisma.evidence.findMany({
      where: { evaluationSessionId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, url: true, description: true, sectionId: true, createdAt: true },
    });
    return successResponse(items);
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireAuth(request);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return errorResponse('Invalid evaluation ID', 400);

    const session = await prisma.evaluationSession.findUnique({
      where: { id },
      select: { id: true, evaluatorId: true },
    });
    if (!session) return errorResponse('ไม่พบการประเมินที่ต้องการ', 404);
    if (session.evaluatorId !== me.id && !hasRole(me, 'ADMIN')) {
      return errorResponse('เพิ่มหลักฐานได้เฉพาะเจ้าของการประเมินเท่านั้น', 403);
    }

    const form = await request.formData();
    const description = String(form.get('description') || '').trim() || null;
    const linkUrl = String(form.get('url') || '').trim();
    const sectionIdRaw = form.get('sectionId');
    const sectionId = sectionIdRaw ? parseInt(String(sectionIdRaw), 10) : null;
    const file = form.get('file');
    const hasFile = file instanceof File && file.size > 0;

    if (!hasFile && !linkUrl) {
      return errorResponse('ต้องแนบไฟล์ หรือใส่ลิงก์อย่างน้อย 1 อย่าง', 400);
    }

    let url: string;
    if (hasFile) {
      const f = file as File;
      if (f.size > MAX_BYTES) return errorResponse(`ไฟล์ใหญ่เกินไป (สูงสุด ${MAX_BYTES / 1024 / 1024} MB)`, 413);
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (!ALLOWED_EXT.has(ext)) {
        return errorResponse('รองรับเฉพาะรูปภาพ/เอกสาร (jpg, png, gif, webp, pdf, doc, docx, xls, xlsx, ppt, pptx)', 400);
      }
      const dir = path.join(uploadsRoot(), String(id));
      fs.mkdirSync(dir, { recursive: true });
      const fileName = `${Date.now()}-${sanitize(f.name)}`;
      fs.writeFileSync(path.join(dir, fileName), Buffer.from(await f.arrayBuffer()));
      url = `/uploads/evidence/${id}/${fileName}`;
    } else {
      if (!/^https?:\/\//i.test(linkUrl)) {
        return errorResponse('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://', 400);
      }
      url = linkUrl;
    }

    const ev = await prisma.evidence.create({
      data: { evaluationSessionId: id, url, description, sectionId: Number.isNaN(sectionId as number) ? null : sectionId },
      select: { id: true, url: true, description: true, sectionId: true, createdAt: true },
    });
    return successResponse(ev, 'เพิ่มหลักฐานสำเร็จ');
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    return handleApiError(error);
  }
}
