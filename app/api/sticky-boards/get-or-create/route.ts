// app/api/sticky-boards/get-or-create/route.ts
// POST /api/sticky-boards/get-or-create
// Auth required. Body: { contextType, contextId, schoolId }
// Finds the active board for (contextType, contextId); creates a new one (with
// the caller as owner) if none exists. Returns enough info for the client to
// build the share URL and decide which buttons to show.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireAuth, hasRole } from '@/lib/api-utils';
import { newShareKey } from '@/lib/sticky-guest';

const MAX_CONTEXT_ID_LEN = 255;

async function userMaySchool(userId: number, schoolId: number, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true;
  const t = await prisma.teacher.findUnique({ where: { userId } });
  return !!t && t.schoolId === schoolId;
}

export async function POST(request: NextRequest) {
  try {
    const me = await requireAuth(request);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return errorResponse('Invalid JSON body', 400);

    const contextType = String(body.contextType || '').trim();
    const contextId = String(body.contextId || '').trim();
    const schoolId = Number(body.schoolId);
    if (!contextType || !contextId) return errorResponse('Missing contextType / contextId', 400);
    if (contextId.length > MAX_CONTEXT_ID_LEN) return errorResponse('contextId too long', 400);
    if (!Number.isFinite(schoolId) || schoolId <= 0) return errorResponse('Missing schoolId', 400);

    const isAdmin = hasRole(me, 'ADMIN');
    if (!(await userMaySchool(me.id, schoolId, isAdmin))) {
      return errorResponse('Forbidden: ไม่มีสิทธิ์เปิดบอร์ดของโรงเรียนนี้', 403);
    }

    // Find any prior board for this context (most recent). We deliberately
    // don't filter by status: if the most recent board is CLOSED, reactivate
    // it so collaborators see the same notes and the original shareKey keeps
    // working — opening a cell again is the user's signal that they want to
    // continue brainstorming where they left off, not start over.
    const existing = await prisma.stickyBoard.findFirst({
      where: { contextType, contextId },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const board =
        existing.status === 'ACTIVE'
          ? existing
          : await prisma.stickyBoard.update({
              where: { id: existing.id },
              data: { status: 'ACTIVE', closedAt: null },
            });
      const owner = await prisma.user.findUnique({
        where: { id: board.ownerUserId },
        select: { id: true, name: true },
      });
      return successResponse({
        id: board.id,
        shareKey: board.shareKey,
        ownerUserId: board.ownerUserId,
        ownerName: owner?.name || null,
        schoolId: board.schoolId,
        contextType: board.contextType,
        contextId: board.contextId,
        status: board.status,
        isOwner: board.ownerUserId === me.id,
        createdAt: board.createdAt,
      });
    }

    const board = await prisma.stickyBoard.create({
      data: {
        shareKey: newShareKey(),
        ownerUserId: me.id,
        schoolId,
        contextType,
        contextId,
        status: 'ACTIVE',
      },
    });

    return successResponse({
      id: board.id,
      shareKey: board.shareKey,
      ownerUserId: board.ownerUserId,
      ownerName: me.name,
      schoolId: board.schoolId,
      contextType: board.contextType,
      contextId: board.contextId,
      status: board.status,
      isOwner: true,
      createdAt: board.createdAt,
    });
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
