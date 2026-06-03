// app/api/admin/thai-p13-summary/[id]/route.ts
// GET - fetch a single THAI_P1_3 AI summary row by id (admin only). Used by the
// result view + the print page to render the stored envelope.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireRole } from '@/lib/api-utils';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(request, 'ADMIN');
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return errorResponse('Invalid id', 400);
    const row = await prisma.thaiP13Summary.findUnique({ where: { id } });
    if (!row) return errorResponse('ไม่พบบทสรุป', 404);
    return successResponse(row);
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse(String(error?.message || error), 500);
  }
}
