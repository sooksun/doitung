// app/api/sticky-notes/route.ts
// GET  /api/sticky-notes?boardKey=<shareKey>      — list ACTIVE notes on a board (public; needs ACTIVE board)
// POST /api/sticky-notes                          — create a note (auth optional; falls back to guest token)
//
// Behaviour
//   - The board must be ACTIVE; closed boards return 410 Gone on every method.
//   - Logged-in callers are identified by Bearer; guests by `X-Sticky-Guest-Token`.
//   - Guests can post and later edit/delete their *own* notes (matched by
//     sha256(token)). They can also drag/recolor any note (collaborative
//     spatial layout).
//
// Note response shape includes server-computed flags so the client doesn't
// need to know the raw token / userId of every other note's author:
//   - `isMine`     — caller authored this note (logged-in match OR token match)
//   - `isOwner`    — caller is the board owner
//   - `canEditContent` — caller may PATCH the `content` field
//   - `canDelete`  — caller may DELETE the note

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, getCurrentUser } from '@/lib/api-utils';
import { hashGuestToken, STICKY_GUEST_TOKEN_HEADER, STICKY_GUEST_NAME_HEADER } from '@/lib/sticky-guest';

const ALLOWED_COLORS = new Set(['yellow', 'pink', 'mint', 'blue', 'peach', 'lavender']);
const MAX_CONTENT_LEN = 2000;
const MAX_NAME_LEN = 80;

// Tiny in-memory rate limit for POST. Resets on container restart, which is
// fine — we just need a brake on accidental loops or low-effort abuse.
const POST_BUCKETS = new Map<string, { count: number; resetAt: number }>();
const POST_LIMIT_PER_MIN = 60;

function rateLimitOk(key: string): boolean {
  const now = Date.now();
  const bucket = POST_BUCKETS.get(key);
  if (!bucket || bucket.resetAt < now) {
    POST_BUCKETS.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= POST_LIMIT_PER_MIN;
}

function clientKey(request: NextRequest, fallback: string): string {
  const xff = request.headers.get('x-forwarded-for');
  const ip = xff ? xff.split(',')[0].trim() : '';
  return `${ip || 'unknown'}|${fallback}`;
}

function readGuestHeaders(request: NextRequest): { rawToken: string | null; name: string | null } {
  const rawToken = request.headers.get(STICKY_GUEST_TOKEN_HEADER);
  let name: string | null = null;
  const enc = request.headers.get(STICKY_GUEST_NAME_HEADER);
  if (enc) {
    try {
      name = decodeURIComponent(enc).slice(0, MAX_NAME_LEN);
    } catch {
      name = enc.slice(0, MAX_NAME_LEN);
    }
  }
  return { rawToken: rawToken && rawToken.length >= 16 ? rawToken : null, name };
}

function decorateNote(
  note: any,
  ctx: { meId: number | null; tokenHash: string | null; ownerUserId: number },
) {
  const isOwner = ctx.meId !== null && ctx.meId === ctx.ownerUserId;
  const isMineByUser = ctx.meId !== null && note.userId === ctx.meId;
  const isMineByToken = ctx.tokenHash !== null && note.authorToken === ctx.tokenHash;
  const isMine = isMineByUser || isMineByToken;
  return {
    ...note,
    // Strip the actual token before sending to anyone — the client only needs
    // the boolean flags below.
    authorToken: undefined,
    isMine,
    isOwner,
    canEditContent: isMine || isOwner,
    canDelete: isMine || isOwner,
  };
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const boardKey = sp.get('boardKey') || '';
    if (!boardKey) return errorResponse('Missing boardKey', 400);

    const board = await prisma.stickyBoard.findUnique({ where: { shareKey: boardKey } });
    if (!board) return errorResponse('ไม่พบบอร์ด', 404);
    if (board.status !== 'ACTIVE') {
      return errorResponse('บอร์ดนี้ถูกปิดโดยเจ้าของแล้ว', 410);
    }

    const me = await getCurrentUser(request);
    const { rawToken } = readGuestHeaders(request);
    const tokenHash = rawToken ? hashGuestToken(rawToken) : null;

    const notes = await prisma.stickyNote.findMany({
      where: { boardId: board.id, status: 'ACTIVE' },
      orderBy: [{ zIndex: 'asc' }, { createdAt: 'asc' }],
    });

    // Pull author display names (for logged-in authors) so the card can show
    // a badge without a second roundtrip.
    const authorIds = Array.from(
      new Set(notes.map((n) => n.userId).filter((v): v is number => typeof v === 'number')),
    );
    const authorUsers = authorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: authorIds } },
          select: { id: true, name: true },
        })
      : [];
    const nameById = new Map<number, string>(authorUsers.map((u) => [u.id, u.name]));

    const decorated = notes.map((n) =>
      decorateNote(
        {
          ...n,
          // Prefer explicit authorName (guest-set) over the User.name fallback.
          authorName: n.authorName || (n.userId ? nameById.get(n.userId) || null : null),
        },
        { meId: me?.id ?? null, tokenHash, ownerUserId: board.ownerUserId },
      ),
    );

    return successResponse(decorated);
  } catch (error: any) {
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return errorResponse('Invalid JSON body', 400);

    const boardKey = String(body.boardKey || '').trim();
    if (!boardKey) return errorResponse('Missing boardKey', 400);

    const board = await prisma.stickyBoard.findUnique({ where: { shareKey: boardKey } });
    if (!board) return errorResponse('ไม่พบบอร์ด', 404);
    if (board.status !== 'ACTIVE') {
      return errorResponse('บอร์ดนี้ถูกปิดโดยเจ้าของแล้ว', 410);
    }

    const me = await getCurrentUser(request);
    const { rawToken, name: headerName } = readGuestHeaders(request);
    const tokenHash = rawToken ? hashGuestToken(rawToken) : null;

    if (!me && !tokenHash) {
      return errorResponse('ต้องมี token (ผู้ใช้ที่ลงชื่อเข้าระบบ หรือ guest token)', 401);
    }

    if (!rateLimitOk(clientKey(request, board.id))) {
      return errorResponse('คำขอบ่อยเกินไป — รอสักครู่แล้วลองใหม่', 429);
    }

    const content = typeof body.content === 'string' ? body.content.slice(0, MAX_CONTENT_LEN) : '';
    const color = ALLOWED_COLORS.has(body.color) ? body.color : 'yellow';
    const x = Number.isFinite(body.x) ? Math.round(body.x) : 100;
    const y = Number.isFinite(body.y) ? Math.round(body.y) : 100;
    const rotation = Number.isFinite(body.rotation) ? Math.max(-15, Math.min(15, Math.round(body.rotation))) : 0;
    const zIndex = Number.isFinite(body.zIndex) ? Math.round(body.zIndex) : 1;
    const layerNo = Number.isFinite(body.layerNo) ? Number(body.layerNo) : null;
    const side = body.side === 'CURRENT' || body.side === 'DESIRED' ? body.side : null;

    // Display name preference: explicit body.authorName > guest header > null.
    const bodyName =
      typeof body.authorName === 'string' ? body.authorName.trim().slice(0, MAX_NAME_LEN) : '';
    const authorName = bodyName || headerName || null;

    const note = await prisma.stickyNote.create({
      data: {
        boardId: board.id,
        schoolId: board.schoolId,
        userId: me?.id ?? null,
        authorToken: me ? null : tokenHash,
        authorName,
        contextType: board.contextType,
        contextId: board.contextId,
        sarId: null,
        layerNo,
        side,
        content,
        color,
        x,
        y,
        rotation,
        zIndex,
        status: 'ACTIVE',
      },
    });

    const out = decorateNote(
      { ...note, authorName: authorName || (me ? me.name : null) },
      { meId: me?.id ?? null, tokenHash, ownerUserId: board.ownerUserId },
    );
    return successResponse(out, 'เพิ่มโน้ตสำเร็จ');
  } catch (error: any) {
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
