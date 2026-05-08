// app/api/sticky-boards/get-or-create/route.ts
// POST /api/sticky-boards/get-or-create
//
// Auth required. Body: { contextType, contextId, schoolId }
//
// Returns the StickyBoard for (contextType, contextId), creating it on first
// call. Implementation detail: the route uses `prisma.stickyBoard.upsert`
// against the @@unique([contextType, contextId]) compound key, which makes
// the operation atomic even when two collaborators click the brainstorming
// chip on the same fresh cell within the same millisecond — only one row
// gets created, and the other request finds it via the unique index.
//
// If a prior board for the same context was archived (status = ARCHIVED),
// upsert flips it back to ACTIVE so notes from the previous brainstorming
// session reappear unchanged. The board's `id`, `shareKey`, and `ownerUserId`
// are stable across reactivations — the original creator stays the owner and
// previously-shared links keep working.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireAuth, hasRole } from '@/lib/api-utils';
import { newShareKey } from '@/lib/sticky-guest';

const MAX_CONTEXT_ID_LEN = 255;
const MAX_CONTEXT_TYPE_LEN = 64;

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

    if (!contextType) return errorResponse('Missing contextType', 400);
    if (contextType.length > MAX_CONTEXT_TYPE_LEN) return errorResponse('contextType too long', 400);
    if (!contextId) return errorResponse('Missing contextId', 400);
    if (contextId.length > MAX_CONTEXT_ID_LEN) return errorResponse('contextId too long', 400);
    if (!Number.isFinite(schoolId) || schoolId <= 0) return errorResponse('Missing schoolId', 400);

    const isAdmin = hasRole(me, 'ADMIN');
    if (!(await userMaySchool(me.id, schoolId, isAdmin))) {
      return errorResponse('Forbidden: ไม่มีสิทธิ์เปิดบอร์ดของโรงเรียนนี้', 403);
    }

    // Atomic get-or-create against the unique (contextType, contextId) index.
    // - On first call:    INSERT new row with caller as owner.
    // - On repeat call:   row exists, `update` reactivates it to ACTIVE if it
    //                     was previously archived (no-op otherwise). The
    //                     ownerUserId / shareKey set on first INSERT are
    //                     immutable — any number of follow-up callers see the
    //                     same id, the same shareKey, and the same owner.
    const board = await prisma.stickyBoard.upsert({
      where: { contextType_contextId: { contextType, contextId } },
      update: {
        status: 'ACTIVE',
        closedAt: null,
      },
      create: {
        shareKey: newShareKey(),
        ownerUserId: me.id,
        schoolId,
        contextType,
        contextId,
        status: 'ACTIVE',
      },
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
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
