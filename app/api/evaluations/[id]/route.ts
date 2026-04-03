// app/api/evaluations/[id]/route.ts
// GET /api/evaluations/:id - Get evaluation details
// PATCH /api/evaluations/:id - Update evaluation
// DELETE /api/evaluations/:id - Delete evaluation

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { EvaluationStatus } from '@prisma/client';
import { EvaluationSessionDto } from '@/lib/api-types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
      responsesCount: evaluation._count.responses,
    };

    return successResponse(evaluationDto);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return errorResponse('Invalid evaluation ID', 400);
    }

    const body = await request.json();
    const { status, note } = body;

    const updateData: any = {};
    if (status) {
      updateData.status = status as EvaluationStatus;
      if (status === EvaluationStatus.SUBMITTED && !updateData.submittedAt) {
        updateData.submittedAt = new Date();
      }
    }
    if (note !== undefined) updateData.note = note;

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
        createdAt: evaluation.createdAt,
        submittedAt: evaluation.submittedAt,
      } as EvaluationSessionDto,
      'อัปเดตการประเมินสำเร็จ'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return errorResponse('Invalid evaluation ID', 400);
    }

    // Delete related data (cascade)
    await prisma.evaluationResponse.deleteMany({
      where: { evaluationSessionId: id },
    });

    await prisma.evaluationSession.delete({
      where: { id },
    });

    return successResponse(null, 'ลบการประเมินสำเร็จ');
  } catch (error) {
    return handleApiError(error);
  }
}

