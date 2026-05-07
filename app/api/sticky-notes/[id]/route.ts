// app/api/sticky-notes/[id]/route.ts
// PATCH  /api/sticky-notes/:id  → update content / color / x / y / rotation / zIndex
// DELETE /api/sticky-notes/:id  → soft-delete (status = ARCHIVED)

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireAuth, hasRole } from '@/lib/api-utils';

const ALLOWED_COLORS = new Set(['yellow', 'pink', 'mint', 'blue', 'peach', 'lavender']);
const MAX_CONTENT_LEN = 2000;

async function userMaySchool(userId: number, schoolId: number, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true;
  const t = await prisma.teacher.findUnique({ where: { userId } });
  return !!t && t.schoolId === schoolId;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireAuth(request);
    const id = String(params.id || '').trim();
    if (!id) return errorResponse('Invalid id', 400);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return errorResponse('Invalid JSON body', 400);

    const existing = await prisma.stickyNote.findUnique({ where: { id } });
    if (!existing) return errorResponse('ไม่พบโน้ต', 404);

    const isAdmin = hasRole(me, 'ADMIN');
    if (!(await userMaySchool(me.id, existing.schoolId, isAdmin))) {
      return errorResponse('Forbidden', 403);
    }

    const data: Record<string, unknown> = {};
    if (typeof body.content === 'string') data.content = body.content.slice(0, MAX_CONTENT_LEN);
    if (typeof body.color === 'string' && ALLOWED_COLORS.has(body.color)) data.color = body.color;
    if (Number.isFinite(body.x)) data.x = Math.round(body.x);
    if (Number.isFinite(body.y)) data.y = Math.round(body.y);
    if (Number.isFinite(body.rotation)) data.rotation = Math.max(-15, Math.min(15, Math.round(body.rotation)));
    if (Number.isFinite(body.zIndex)) data.zIndex = Math.round(body.zIndex);
    if (body.status === 'ACTIVE' || body.status === 'ARCHIVED') data.status = body.status;

    if (Object.keys(data).length === 0) return errorResponse('ไม่มีฟิลด์ให้อัปเดต', 400);

    const note = await prisma.stickyNote.update({ where: { id }, data });
    return successResponse(note);
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireAuth(request);
    const id = String(params.id || '').trim();
    if (!id) return errorResponse('Invalid id', 400);

    const existing = await prisma.stickyNote.findUnique({ where: { id } });
    if (!existing) return errorResponse('ไม่พบโน้ต', 404);

    const isAdmin = hasRole(me, 'ADMIN');
    if (!(await userMaySchool(me.id, existing.schoolId, isAdmin))) {
      return errorResponse('Forbidden', 403);
    }

    await prisma.stickyNote.update({ where: { id }, data: { status: 'ARCHIVED' } });
    return successResponse({ id, status: 'ARCHIVED' }, 'ลบโน้ตสำเร็จ');
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
