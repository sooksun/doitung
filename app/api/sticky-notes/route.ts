// app/api/sticky-notes/route.ts
// GET  /api/sticky-notes?contextType=ICEBERG_CELL&contextId=...  → list ACTIVE notes for a board
// POST /api/sticky-notes                                          → create a note on a board
//
// Board addressing: (contextType, contextId). MVP uses ICEBERG_CELL with
// contextId = `sar:draft:school:{schoolId}:year:{academicYearId}:iceberg:L{layerNo}:{side}`
// (stable across refreshes before a real SarDocument exists).

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireAuth, hasRole } from '@/lib/api-utils';

const ALLOWED_COLORS = new Set(['yellow', 'pink', 'mint', 'blue', 'peach', 'lavender']);
const MAX_CONTENT_LEN = 2000;
const MAX_CONTEXT_ID_LEN = 255;

async function userMaySchool(userId: number, schoolId: number, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true;
  const t = await prisma.teacher.findUnique({ where: { userId } });
  return !!t && t.schoolId === schoolId;
}

export async function GET(request: NextRequest) {
  try {
    const me = await requireAuth(request);
    const sp = request.nextUrl.searchParams;
    const contextType = sp.get('contextType') || '';
    const contextId = sp.get('contextId') || '';
    if (!contextType || !contextId) {
      return errorResponse('Missing contextType / contextId', 400);
    }
    if (contextId.length > MAX_CONTEXT_ID_LEN) {
      return errorResponse('contextId too long', 400);
    }

    const notes = await prisma.stickyNote.findMany({
      where: { contextType, contextId, status: 'ACTIVE' },
      orderBy: [{ zIndex: 'asc' }, { createdAt: 'asc' }],
    });

    // Authorization: a non-admin can only read boards from their own school.
    if (!hasRole(me, 'ADMIN') && notes.length > 0) {
      const t = await prisma.teacher.findUnique({ where: { userId: me.id } });
      const mySchoolId = t?.schoolId ?? null;
      if (mySchoolId === null || notes.some((n) => n.schoolId !== mySchoolId)) {
        return errorResponse('Forbidden', 403);
      }
    }

    return successResponse(notes);
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
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
      return errorResponse('Forbidden: ไม่มีสิทธิ์สร้าง note ให้โรงเรียนนี้', 403);
    }

    const content = typeof body.content === 'string' ? body.content.slice(0, MAX_CONTENT_LEN) : '';
    const color = ALLOWED_COLORS.has(body.color) ? body.color : 'yellow';
    const x = Number.isFinite(body.x) ? Math.round(body.x) : 100;
    const y = Number.isFinite(body.y) ? Math.round(body.y) : 100;
    const rotation = Number.isFinite(body.rotation) ? Math.max(-15, Math.min(15, Math.round(body.rotation))) : 0;
    const zIndex = Number.isFinite(body.zIndex) ? Math.round(body.zIndex) : 1;
    const sarId = Number.isFinite(body.sarId) && body.sarId > 0 ? Number(body.sarId) : null;
    const layerNo = Number.isFinite(body.layerNo) ? Number(body.layerNo) : null;
    const side = body.side === 'CURRENT' || body.side === 'DESIRED' ? body.side : null;

    const note = await prisma.stickyNote.create({
      data: {
        schoolId,
        userId: me.id,
        contextType,
        contextId,
        sarId,
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

    return successResponse(note, 'เพิ่มโน้ตสำเร็จ');
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
