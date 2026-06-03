// app/api/evaluations/[id]/thai-reflections/route.ts
// GET — list all ThaiReflection records for a session (with attached files).
// Accessible to: the session owner, ADMIN, or any teacher bound to the same school.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, requireAuth, hasRole } from '@/lib/api-utils';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireAuth(request);
    const sessionId = parseInt(params.id, 10);
    if (isNaN(sessionId)) return errorResponse('Invalid session ID', 400);

    const session = await prisma.evaluationSession.findUnique({
      where: { id: sessionId },
      select: { evaluatorId: true, schoolId: true },
    });
    if (!session) return errorResponse('ไม่พบการประเมินที่ต้องการ', 404);

    if (!hasRole(me, 'ADMIN') && session.evaluatorId !== me.id) {
      const teacher = await prisma.teacher.findUnique({ where: { userId: me.id } });
      if (!teacher || teacher.schoolId !== session.schoolId) {
        return errorResponse('คุณไม่มีสิทธิ์ดูการสะท้อนคิดของการประเมินนี้', 403);
      }
    }

    const reflections = await prisma.thaiReflection.findMany({
      where: { evaluationSessionId: sessionId },
      include: { files: { orderBy: { createdAt: 'asc' } } },
      orderBy: { sectionId: 'asc' },
    });
    return successResponse(reflections);
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    return handleApiError(error);
  }
}
