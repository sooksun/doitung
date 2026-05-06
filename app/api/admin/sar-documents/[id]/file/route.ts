// app/api/admin/sar-documents/[id]/file/route.ts
// GET /api/admin/sar-documents/:id/file - stream the SAR PDF with auth + school isolation.
// Files are NEVER served via direct /uploads/ URL.

import { NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import { errorResponse, requireAuth, hasRole } from '@/lib/api-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await requireAuth(request);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return errorResponse('Invalid id', 400);

    const doc = await prisma.sarDocument.findUnique({ where: { id } });
    if (!doc) return errorResponse('ไม่พบเอกสาร', 404);

    if (!hasRole(me, 'ADMIN')) {
      const t = await prisma.teacher.findUnique({ where: { userId: me.id } });
      if (!t || t.schoolId !== doc.schoolId) return errorResponse('Forbidden', 403);
    }

    if (!doc.filePath) return errorResponse('เอกสารนี้ไม่มีไฟล์ PDF', 404);
    const fullPath = path.join(process.cwd(), 'public', doc.filePath.replace(/^\//, ''));
    if (!fs.existsSync(fullPath)) return errorResponse('File missing on disk', 404);

    const buf = fs.readFileSync(fullPath);
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(buf.length),
        'Content-Disposition': `inline; filename="sar-${id}.pdf"`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
