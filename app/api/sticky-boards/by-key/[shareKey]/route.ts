// app/api/sticky-boards/by-key/[shareKey]/route.ts
// GET /api/sticky-boards/by-key/:shareKey
// PUBLIC — no Bearer required. Lets unauthenticated guests resolve a share
// link to a board so they can decide whether to show notes or a "closed by
// owner" message. Returns 404 only if the key doesn't exist; for closed boards
// we still return 200 with status=CLOSED so the page can render the right UX.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, getCurrentUser } from '@/lib/api-utils';

export async function GET(_request: NextRequest, { params }: { params: { shareKey: string } }) {
  try {
    const shareKey = String(params.shareKey || '').trim();
    if (!shareKey || shareKey.length < 8) return errorResponse('Invalid shareKey', 400);

    const board = await prisma.stickyBoard.findUnique({ where: { shareKey } });
    if (!board) return errorResponse('ไม่พบบอร์ด — อาจถูกลบหรือ link ไม่ถูกต้อง', 404);

    const owner = await prisma.user.findUnique({
      where: { id: board.ownerUserId },
      select: { id: true, name: true },
    });

    // If the caller happens to be authenticated, tell them whether they're the
    // owner — useful for the page to show the "ปิดบอร์ด" button.
    const me = await getCurrentUser(_request);
    const isOwner = !!me && me.id === board.ownerUserId;

    return successResponse({
      id: board.id,
      shareKey: board.shareKey,
      ownerUserId: board.ownerUserId,
      ownerName: owner?.name || null,
      schoolId: board.schoolId,
      contextType: board.contextType,
      contextId: board.contextId,
      status: board.status,
      closedAt: board.closedAt,
      isOwner,
      createdAt: board.createdAt,
    });
  } catch (error: any) {
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
