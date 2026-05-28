// app/api/evaluations/[id]/route.ts
// GET /api/evaluations/:id - Get evaluation details
// PATCH /api/evaluations/:id - Update evaluation
// DELETE /api/evaluations/:id - Delete evaluation

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, requireAuth, hasRole } from '@/lib/api-utils';
import { EvaluationStatus } from '@prisma/client';
import { EvaluationSessionDto } from '@/lib/api-types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await requireAuth(request);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return errorResponse('Invalid evaluation ID', 400);
    }

    const evaluation = await prisma.evaluationSession.findUnique({
      where: { id },
      include: {
        instrument: true,
        school: true,
        academicYear: true,
        term: true,
        evaluator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        targetTeacher: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        responses: {
          include: {
            indicator: {
              include: {
                section: {
                  select: {
                    id: true,
                    nameTh: true,
                    order: true,
                  },
                },
              },
            },
          },
          orderBy: [
            {
              indicator: {
                section: {
                  order: 'asc',
                },
              },
            },
            {
              indicator: {
                itemCode: 'asc',
              },
            },
          ],
        },
        _count: {
          select: {
            responses: true,
          },
        },
      },
    });

    if (!evaluation) {
      return errorResponse('ไม่พบการประเมินที่ต้องการ', 404);
    }

    // Authorization scope: ADMIN sees everything; everyone else must have a
    // direct relationship to the session — evaluator, target teacher, or a
    // member of the same school (SCHOOL_ADMIN / SCHOOL_LEADER / TEACHER bound
    // via Teacher.schoolId). Anything else is 403 so PII (evaluator email,
    // reflection text) doesn't leak via ID guessing.
    if (!hasRole(me, 'ADMIN')) {
      const isEvaluator = evaluation.evaluatorId === me.id;
      const isTargetTeacher = evaluation.targetTeacher?.user?.id === me.id;
      let inSameSchool = false;
      if (!isEvaluator && !isTargetTeacher) {
        const teacher = await prisma.teacher.findUnique({
          where: { userId: me.id },
          select: { schoolId: true },
        });
        inSameSchool = !!teacher && teacher.schoolId === evaluation.schoolId;
      }
      if (!isEvaluator && !isTargetTeacher && !inSameSchool) {
        return errorResponse('คุณไม่มีสิทธิ์เข้าถึงการประเมินนี้', 403);
      }
    }

    const evaluationDto: EvaluationSessionDto = {
      id: evaluation.id,
      instrumentId: evaluation.instrumentId,
      schoolId: evaluation.schoolId,
      academicYearId: evaluation.academicYearId,
      termId: evaluation.termId,
      evaluatorId: evaluation.evaluatorId,
      targetTeacherId: evaluation.targetTeacherId,
      targetSchoolId: evaluation.targetSchoolId,
      status: evaluation.status,
      note: evaluation.note,
      reflection: evaluation.reflection,
      createdAt: evaluation.createdAt,
      submittedAt: evaluation.submittedAt,
      instrument: {
        id: evaluation.instrument.id,
        code: evaluation.instrument.code,
        nameTh: evaluation.instrument.nameTh,
        nameEn: evaluation.instrument.nameEn,
        description: evaluation.instrument.description,
        type: evaluation.instrument.type,
        version: evaluation.instrument.version,
        isActive: evaluation.instrument.isActive,
      },
      school: {
        id: evaluation.school.id,
        code: evaluation.school.code,
        name: evaluation.school.name,
        nameTh: evaluation.school.nameTh,
      },
      academicYear: {
        id: evaluation.academicYear.id,
        year: evaluation.academicYear.year,
      },
      term: evaluation.term
        ? {
            id: evaluation.term.id,
            name: evaluation.term.name,
          }
        : undefined,
      evaluator: evaluation.evaluator
        ? {
            id: evaluation.evaluator.id,
            name: evaluation.evaluator.name,
            email: evaluation.evaluator.email,
          }
        : undefined,
      targetTeacherName: evaluation.targetTeacher?.user?.name ?? null,
      responsesCount: evaluation._count.responses,
    };

    return successResponse(evaluationDto);
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await requireAuth(request);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return errorResponse('Invalid evaluation ID', 400);
    }

    const existing = await prisma.evaluationSession.findUnique({
      where: { id },
      select: { evaluatorId: true },
    });
    if (!existing) return errorResponse('ไม่พบการประเมินที่ต้องการ', 404);
    if (existing.evaluatorId !== me.id && !hasRole(me, 'ADMIN')) {
      return errorResponse('คุณสามารถแก้ไขได้เฉพาะการประเมินของตนเองเท่านั้น', 403);
    }

    const body = await request.json();
    const { status, note, reflection } = body;

    const updateData: any = {};
    if (status) {
      updateData.status = status as EvaluationStatus;
      if (status === EvaluationStatus.SUBMITTED && !updateData.submittedAt) {
        updateData.submittedAt = new Date();
      }
    }
    if (note !== undefined) updateData.note = note;
    if (reflection !== undefined) updateData.reflection = reflection;

    const evaluation = await prisma.evaluationSession.update({
      where: { id },
      data: updateData,
    });

    return successResponse(
      {
        id: evaluation.id,
        instrumentId: evaluation.instrumentId,
        schoolId: evaluation.schoolId,
        academicYearId: evaluation.academicYearId,
        termId: evaluation.termId,
        evaluatorId: evaluation.evaluatorId,
        targetTeacherId: evaluation.targetTeacherId,
        targetSchoolId: evaluation.targetSchoolId,
        status: evaluation.status,
        note: evaluation.note,
        reflection: evaluation.reflection,
        createdAt: evaluation.createdAt,
        submittedAt: evaluation.submittedAt,
      } as EvaluationSessionDto,
      'อัปเดตการประเมินสำเร็จ'
    );
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await requireAuth(request);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return errorResponse('Invalid evaluation ID', 400);
    }

    const existing = await prisma.evaluationSession.findUnique({
      where: { id },
      select: { evaluatorId: true, status: true },
    });
    if (!existing) return errorResponse('ไม่พบการประเมินที่ต้องการ', 404);
    if (existing.evaluatorId !== me.id && !hasRole(me, 'ADMIN')) {
      return errorResponse('คุณสามารถเคลียร์ได้เฉพาะการประเมินของตนเองเท่านั้น', 403);
    }
    if (existing.status === 'ARCHIVED') {
      return successResponse({ id, status: existing.status }, 'รายการนี้ถูกเคลียร์อยู่แล้ว');
    }

    // Soft-delete: mark as ARCHIVED so dashboards/lists hide it but the responses
    // (scores, comments) and AI run history are preserved for audit and recovery.
    const archived = await prisma.evaluationSession.update({
      where: { id },
      data: { status: EvaluationStatus.ARCHIVED },
      select: { id: true, status: true },
    });

    return successResponse(archived, 'เคลียร์รายการประเมินสำเร็จ (ซ่อนจากรายการ ข้อมูลยังอยู่)');
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    return handleApiError(error);
  }
}

