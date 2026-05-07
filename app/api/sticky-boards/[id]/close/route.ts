// app/api/sticky-boards/[id]/close/route.ts
// POST /api/sticky-boards/:id/close
// Owner-only. Marks the board CLOSED. Every subsequent shareKey-keyed call to
// /api/sticky-notes returns 410 Gone, and /sticky?key=... shows a friendly
// "closed by owner" message.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireAuth } from '@/lib/api-utils';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireAuth(request);
    const id = String(params.id || '').trim();
    if (!id) return errorResponse('Invalid id', 400);

    const board = await prisma.stickyBoard.findUnique({ where: { id } });
    if (!board) return errorResponse('ไม่พบบอร์ด', 404);
    if (board.ownerUserId !== me.id) {
      return errorResponse('Forbidden: เฉพาะเจ้าของบอร์ดเท่านั้น', 403);
    }
    if (board.status === 'CLOSED') {
      return successResponse({ id: board.id, status: 'CLOSED', closedAt: board.closedAt }, 'บอร์ดถูกปิดอยู่แล้ว');
    }

    const updated = await prisma.stickyBoard.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
    });

    return successResponse(
      { id: updated.id, status: updated.status, closedAt: updated.closedAt },
      'ปิดบอร์ดสำเร็จ — link จะใช้ไม่ได้แล้ว',
    );
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
