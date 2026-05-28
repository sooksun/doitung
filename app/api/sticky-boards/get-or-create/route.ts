// app/api/sticky-boards/get-or-create/route.ts
// POST /api/sticky-boards/get-or-create
//
// Auth required. Body: { contextType, contextId, schoolId }
//
// Returns the StickyBoard for (contextType, contextId), creating it on first
// call. Atomic against the @@unique([contextType, contextId]) compound key.
//
// Strategy: explicit findUnique → create-with-P2002-fallback → optional
// reactivate-if-archived. We deliberately AVOID `upsert` here because callers
// (the Iceberg seed feature) need to know whether THIS request actually
// inserted the row — `wasJustCreated: true` only fires for the one request
// that won the race; concurrent callers that hit P2002 and re-fetch see
// `wasJustCreated: false`. Without this, every page reload looks like "first
// time" to the client and the seed runs again, duplicating notes.
//
// If a prior board for the same context was archived (status = ARCHIVED), it
// is flipped back to ACTIVE so notes from the previous brainstorming session
// reappear unchanged. The board's `id`, `shareKey`, and `ownerUserId` are
// stable across reactivations — the original creator stays the owner and
// previously-shared links keep working.

import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
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

    // Step 1 — find existing row. On the common "board already exists" path
    // we do exactly one read.
    let board = await prisma.stickyBoard.findUnique({
      where: { contextType_contextId: { contextType, contextId } },
    });

    let wasJustCreated = false;

    // Step 2 — if absent, attempt to insert. Two concurrent first-callers can
    // both reach this branch; the unique index guarantees only one INSERT
    // succeeds, and the other catches P2002 and re-fetches the winner's row.
    if (!board) {
      try {
        board = await prisma.stickyBoard.create({
          data: {
            shareKey: newShareKey(),
            ownerUserId: me.id,
            schoolId,
            contextType,
            contextId,
            status: 'ACTIVE',
          },
        });
        wasJustCreated = true;
      } catch (e: unknown) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          // Race lost to another concurrent first-caller — re-fetch the row
          // they just inserted. wasJustCreated stays false, which is correct:
          // *we* did not create it, so we must not seed.
          board = await prisma.stickyBoard.findUnique({
            where: { contextType_contextId: { contextType, contextId } },
          });
          if (!board) throw e; // unreachable in practice
        } else {
          throw e;
        }
      }
    }

    // Step 3 — reactivate if the existing row was archived. Skips when the
    // row was just created (it's already ACTIVE).
    if (!wasJustCreated && board.status === 'ARCHIVED') {
      board = await prisma.stickyBoard.update({
        where: { id: board.id },
        data: { status: 'ACTIVE', closedAt: null },
      });
    }

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
      // Clients use this to gate one-time setup work (Iceberg cell text → seed
      // sticky notes) so reloads/re-opens never duplicate notes.
      wasJustCreated,
    });
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
