// app/api/sticky-boards/[id]/close/route.ts
// POST /api/sticky-boards/:id/close
//
// Owner-only. Archives the board: status flips to ARCHIVED and closedAt is
// set to "now". Notes attached to the board are preserved (no cascading
// delete). The accompanying shareKey returns 410 Gone from /api/sticky-notes
// while the board is archived, but **archive is reversible** — opening the
// same Iceberg cell via /api/sticky-boards/get-or-create flips status back
// to ACTIVE and the original shareKey resumes working.
//
// (The route name is kept as `/close` for URL stability. The successful
// response message describes the actual semantics: archive, not permanent
// close.)

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
    if (board.status === 'ARCHIVED') {
      return successResponse(
        { id: board.id, status: 'ARCHIVED', closedAt: board.closedAt },
        'บอร์ดถูกเก็บไว้แล้ว — เปิดใช้งานอีกครั้งได้จากช่องเดิม',
      );
    }

    const updated = await prisma.stickyBoard.update({
      where: { id },
      data: { status: 'ARCHIVED', closedAt: new Date() },
    });

    return successResponse(
      { id: updated.id, status: updated.status, closedAt: updated.closedAt },
      'เก็บบอร์ดเรียบร้อย สามารถเปิดใช้งานอีกครั้งได้จากช่องเดิม',
    );
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
