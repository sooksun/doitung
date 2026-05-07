// app/api/sticky-notes/[id]/route.ts
// PATCH  /api/sticky-notes/:id   — partial update (content / color / x / y / rotation / zIndex)
// DELETE /api/sticky-notes/:id   — soft delete (status = ARCHIVED)
//
// Authorization
//   - The note's board must be ACTIVE (else 410 Gone).
//   - Spatial fields (x, y, color, rotation, zIndex) — anyone with the link can
//     change. Collaborative layout is the whole point of the board.
//   - `content` — only the note's author or the board owner may set it. This
//     is the simple race-free model: each user owns their text.
//   - DELETE — author or board owner only.
//
// Identity
//   - Logged-in users authenticate with Bearer; we match against `note.userId`
//     and `board.ownerUserId`.
//   - Guests authenticate with `X-Sticky-Guest-Token`; server hashes and
//     compares against `note.authorToken`.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, getCurrentUser } from '@/lib/api-utils';
import { hashGuestToken, STICKY_GUEST_TOKEN_HEADER } from '@/lib/sticky-guest';

const ALLOWED_COLORS = new Set(['yellow', 'pink', 'mint', 'blue', 'peach', 'lavender']);
const MAX_CONTENT_LEN = 2000;
const SPATIAL_FIELDS = new Set(['x', 'y', 'rotation', 'zIndex', 'color']);

interface CallerCtx {
  meId: number | null;
  tokenHash: string | null;
}

async function loadCaller(request: NextRequest): Promise<CallerCtx> {
  const me = await getCurrentUser(request);
  const rawToken = request.headers.get(STICKY_GUEST_TOKEN_HEADER);
  return {
    meId: me?.id ?? null,
    tokenHash: rawToken && rawToken.length >= 16 ? hashGuestToken(rawToken) : null,
  };
}

function isAuthor(note: { userId: number | null; authorToken: string | null }, c: CallerCtx): boolean {
  if (c.meId !== null && note.userId === c.meId) return true;
  if (c.tokenHash !== null && note.authorToken === c.tokenHash) return true;
  return false;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = String(params.id || '').trim();
    if (!id) return errorResponse('Invalid id', 400);

    const note = await prisma.stickyNote.findUnique({ where: { id } });
    if (!note) return errorResponse('ไม่พบโน้ต', 404);
    if (!note.boardId) return errorResponse('โน้ตเก่าที่ไม่ได้ผูกบอร์ด — ใช้แก้ไขไม่ได้', 410);

    const board = await prisma.stickyBoard.findUnique({ where: { id: note.boardId } });
    if (!board) return errorResponse('ไม่พบบอร์ดที่ผูกอยู่', 404);
    if (board.status !== 'ACTIVE') {
      return errorResponse('บอร์ดนี้ถูกปิดโดยเจ้าของแล้ว', 410);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return errorResponse('Invalid JSON body', 400);

    const ctx = await loadCaller(request);
    const isOwner = ctx.meId !== null && ctx.meId === board.ownerUserId;
    const author = isAuthor(note, ctx);

    // Build the data slice. Reject content edits for non-author non-owners.
    const data: Record<string, unknown> = {};
    if (typeof body.content === 'string') {
      if (!author && !isOwner) {
        return errorResponse('แก้ไขข้อความได้เฉพาะผู้เขียนหรือเจ้าของบอร์ด', 403);
      }
      data.content = body.content.slice(0, MAX_CONTENT_LEN);
    }
    if (typeof body.color === 'string' && ALLOWED_COLORS.has(body.color)) data.color = body.color;
    if (Number.isFinite(body.x)) data.x = Math.round(body.x);
    if (Number.isFinite(body.y)) data.y = Math.round(body.y);
    if (Number.isFinite(body.rotation)) data.rotation = Math.max(-15, Math.min(15, Math.round(body.rotation)));
    if (Number.isFinite(body.zIndex)) data.zIndex = Math.round(body.zIndex);
    if (body.status === 'ACTIVE' || body.status === 'ARCHIVED') {
      // Lifecycle change is treated like a delete — author or owner only.
      if (!author && !isOwner) {
        return errorResponse('ต้องเป็นผู้เขียนหรือเจ้าของบอร์ด', 403);
      }
      data.status = body.status;
    }

    if (Object.keys(data).length === 0) return errorResponse('ไม่มีฟิลด์ให้อัปเดต', 400);

    // If only spatial fields are touched, allow anyone with the live link.
    const touchedKeys = Object.keys(data);
    const onlySpatial = touchedKeys.every((k) => SPATIAL_FIELDS.has(k));
    if (!onlySpatial && !author && !isOwner) {
      return errorResponse('ไม่มีสิทธิ์แก้ไขโน้ตนี้', 403);
    }

    const updated = await prisma.stickyNote.update({ where: { id }, data });

    // Return decorated shape so the client can refresh local flags.
    const me = await prisma.user.findUnique({
      where: { id: updated.userId ?? -1 },
      select: { name: true },
    }).catch(() => null);
    const out = {
      ...updated,
      authorToken: undefined,
      authorName: updated.authorName || me?.name || null,
      isMine: author,
      isOwner,
      canEditContent: author || isOwner,
      canDelete: author || isOwner,
    };
    return successResponse(out);
  } catch (error: any) {
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = String(params.id || '').trim();
    if (!id) return errorResponse('Invalid id', 400);

    const note = await prisma.stickyNote.findUnique({ where: { id } });
    if (!note) return errorResponse('ไม่พบโน้ต', 404);

    if (note.boardId) {
      const board = await prisma.stickyBoard.findUnique({ where: { id: note.boardId } });
      if (!board) return errorResponse('ไม่พบบอร์ดที่ผูกอยู่', 404);
      if (board.status !== 'ACTIVE') {
        return errorResponse('บอร์ดนี้ถูกปิดโดยเจ้าของแล้ว', 410);
      }

      const ctx = await loadCaller(request);
      const isOwner = ctx.meId !== null && ctx.meId === board.ownerUserId;
      const author = isAuthor(note, ctx);
      if (!author && !isOwner) {
        return errorResponse('ลบได้เฉพาะผู้เขียนโน้ตหรือเจ้าของบอร์ด', 403);
      }
    }

    await prisma.stickyNote.update({ where: { id }, data: { status: 'ARCHIVED' } });
    return successResponse({ id, status: 'ARCHIVED' }, 'ลบโน้ตสำเร็จ');
  } catch (error: any) {
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
