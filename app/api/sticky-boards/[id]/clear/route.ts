// app/api/sticky-boards/[id]/clear/route.ts
// POST /api/sticky-boards/:id/clear
// Owner-only. Soft-archives every ACTIVE note on the board. The board itself
// stays ACTIVE — collaborators can keep adding new notes after a clear.

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
    if (board.status !== 'ACTIVE') {
      return errorResponse('บอร์ดถูกเก็บไว้แล้ว — ต้องเปิดใช้งานก่อนจึงจะล้างได้', 410);
    }

    const result = await prisma.stickyNote.updateMany({
      where: { boardId: id, status: 'ACTIVE' },
      data: { status: 'ARCHIVED' },
    });

    return successResponse({ id, cleared: result.count }, `ล้างโน้ต ${result.count} ใบสำเร็จ`);
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
