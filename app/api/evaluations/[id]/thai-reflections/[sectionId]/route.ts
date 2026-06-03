// app/api/evaluations/[id]/thai-reflections/[sectionId]/route.ts
// PUT — upsert (create or update) the ThaiReflection for one section.
//   Body: { indicatorIds: number[], reflectionText: string, recordedAt: string (ISO) }
//   Rules: indicatorIds.length >= 3, reflectionText non-empty, recordedAt valid datetime.
// DELETE — remove the reflection for this section (and cascade-deletes its files).

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, requireAuth, hasRole } from '@/lib/api-utils';

type Ctx = { params: { id: string; sectionId: string } };

async function resolveSession(sessionId: number, meId: number, isAdmin: boolean) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: sessionId },
    select: { evaluatorId: true },
  });
  if (!session) return { error: 'ไม่พบการประเมินที่ต้องการ', status: 404 as const };
  if (session.evaluatorId !== meId && !isAdmin)
    return { error: 'บันทึกได้เฉพาะเจ้าของการประเมินเท่านั้น', status: 403 as const };
  return { session };
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  try {
    const me = await requireAuth(request);
    const sessionId = parseInt(params.id, 10);
    const sectionId = parseInt(params.sectionId, 10);
    if (isNaN(sessionId) || isNaN(sectionId)) return errorResponse('Invalid ID', 400);

    const resolved = await resolveSession(sessionId, me.id, hasRole(me, 'ADMIN'));
    if ('error' in resolved) return errorResponse(resolved.error as string, resolved.status);

    const body = await request.json();
    const { indicatorIds, reflectionText, recordedAt } = body;

    if (!Array.isArray(indicatorIds) || indicatorIds.length < 3)
      return errorResponse('ต้องเลือกตัวชี้วัดอย่างน้อย 3 ข้อ', 400);
    if (!reflectionText?.trim())
      return errorResponse('กรุณาระบุการสะท้อนคิด', 400);
    if (!recordedAt)
      return errorResponse('กรุณาระบุวันเวลาที่บันทึก', 400);

    const parsedDate = new Date(recordedAt);
    if (isNaN(parsedDate.getTime()))
      return errorResponse('วันเวลาที่บันทึกไม่ถูกต้อง', 400);

    const ids = (indicatorIds as unknown[]).map(Number).filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length < 3) return errorResponse('ต้องเลือกตัวชี้วัดอย่างน้อย 3 ข้อ', 400);

    const reflection = await prisma.thaiReflection.upsert({
      where: { evaluationSessionId_sectionId: { evaluationSessionId: sessionId, sectionId } },
      create: {
        evaluationSessionId: sessionId,
        sectionId,
        indicatorIds: ids,
        reflectionText: reflectionText.trim(),
        recordedAt: parsedDate,
      },
      update: {
        indicatorIds: ids,
        reflectionText: reflectionText.trim(),
        recordedAt: parsedDate,
      },
      include: { files: { orderBy: { createdAt: 'asc' } } },
    });
    return successResponse(reflection, 'บันทึกการสะท้อนคิดสำเร็จ');
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const me = await requireAuth(request);
    const sessionId = parseInt(params.id, 10);
    const sectionId = parseInt(params.sectionId, 10);
    if (isNaN(sessionId) || isNaN(sectionId)) return errorResponse('Invalid ID', 400);

    const resolved = await resolveSession(sessionId, me.id, hasRole(me, 'ADMIN'));
    if ('error' in resolved) return errorResponse(resolved.error as string, resolved.status);

    await prisma.thaiReflection.deleteMany({
      where: { evaluationSessionId: sessionId, sectionId },
    });
    return successResponse(null, 'ลบการสะท้อนคิดสำเร็จ');
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    return handleApiError(error);
  }
}
