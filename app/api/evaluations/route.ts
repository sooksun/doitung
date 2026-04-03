// app/api/evaluations/route.ts
// GET /api/evaluations - List evaluations
// POST /api/evaluations - Create evaluation session

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  handleApiError,
  parsePagination,
  parseIntParam,
} from '@/lib/api-utils';
import { EvaluationStatus } from '@prisma/client';
import { EvaluationSessionDto, PaginatedResponse } from '@/lib/api-types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const instrumentId = parseIntParam(searchParams, 'instrumentId');
    const schoolId = parseIntParam(searchParams, 'schoolId');
    const networkId = parseIntParam(searchParams, 'networkId');
    const academicYearId = parseIntParam(searchParams, 'academicYearId');
    const termId = parseIntParam(searchParams, 'termId');
    const evaluatorId = parseIntParam(searchParams, 'evaluatorId');
    const status = searchParams.get('status') as EvaluationStatus | null;

    const { page, limit, skip } = parsePagination(searchParams);

    const where: any = {};
    if (instrumentId !== undefined) where.instrumentId = instrumentId;
    if (academicYearId !== undefined) where.academicYearId = academicYearId;
    if (termId !== undefined) where.termId = termId;
    if (evaluatorId !== undefined) where.evaluatorId = evaluatorId;
    if (status) where.status = status;

    // Handle schoolId and networkId
    if (schoolId !== undefined) {
      where.schoolId = schoolId;
    } else if (networkId !== undefined) {
      // Get schools in network
      const networkMembers = await prisma.schoolNetworkMember.findMany({
        where: { networkId, isActive: true },
        select: { schoolId: true },
      });
      const schoolIds = networkMembers.map((m) => m.schoolId);
      if (schoolIds.length > 0) {
        where.schoolId = { in: schoolIds };
      } else {
        where.schoolId = -1; // No schools in network
      }
    }

    const [evaluations, total] = await Promise.all([
      prisma.evaluationSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          instrument: {
            select: {
              id: true,
              code: true,
              nameTh: true,
              type: true,
            },
          },
          school: {
            select: {
              id: true,
              code: true,
              name: true,
              nameTh: true,
            },
          },
          academicYear: {
            select: {
              id: true,
              year: true,
            },
          },
          term: {
            select: {
              id: true,
              name: true,
            },
          },
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
          _count: {
            select: {
              responses: true,
            },
          },
        },
      }),
      prisma.evaluationSession.count({ where }),
    ]);

    const evaluationsDto: EvaluationSessionDto[] = evaluations.map((evaluation) => ({
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
      instrument: evaluation.instrument
        ? {
            id: evaluation.instrument.id,
            code: evaluation.instrument.code,
            nameTh: evaluation.instrument.nameTh,
            nameEn: null,
            description: null,
            type: evaluation.instrument.type,
            version: null,
            isActive: true,
          }
        : undefined,
      school: evaluation.school
        ? {
            id: evaluation.school.id,
            code: evaluation.school.code,
            name: evaluation.school.name,
            nameTh: evaluation.school.nameTh,
          }
        : undefined,
      academicYear: evaluation.academicYear
        ? {
            id: evaluation.academicYear.id,
            year: evaluation.academicYear.year,
          }
        : undefined,
      term: evaluation.term || undefined,
      responsesCount: evaluation._count.responses,
    }));

    const response: PaginatedResponse<EvaluationSessionDto> = {
      items: evaluationsDto,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return successResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      instrumentId,
      schoolId,
      academicYearId,
      termId,
      evaluatorId,
      targetTeacherId,
      targetSchoolId,
      note,
    } = body;

    if (!instrumentId || !schoolId || !academicYearId || !evaluatorId) {
      return errorResponse('Missing required fields: instrumentId, schoolId, academicYearId, evaluatorId', 400);
    }

    const evaluationSession = await prisma.evaluationSession.create({
      data: {
        instrumentId: parseInt(instrumentId, 10),
        schoolId: parseInt(schoolId, 10),
        academicYearId: parseInt(academicYearId, 10),
        termId: termId ? parseInt(termId, 10) : null,
        evaluatorId: parseInt(evaluatorId, 10),
        targetTeacherId: targetTeacherId ? parseInt(targetTeacherId, 10) : null,
        targetSchoolId: targetSchoolId ? parseInt(targetSchoolId, 10) : null,
        status: EvaluationStatus.DRAFT,
        note: note || null,
      },
      include: {
        instrument: {
          select: {
            id: true,
            code: true,
            nameTh: true,
            type: true,
          },
        },
        school: {
          select: {
            id: true,
            code: true,
            name: true,
            nameTh: true,
          },
        },
      },
    });

    return successResponse(
      {
        id: evaluationSession.id,
        instrumentId: evaluationSession.instrumentId,
        schoolId: evaluationSession.schoolId,
        academicYearId: evaluationSession.academicYearId,
        termId: evaluationSession.termId,
        evaluatorId: evaluationSession.evaluatorId,
        targetTeacherId: evaluationSession.targetTeacherId,
        targetSchoolId: evaluationSession.targetSchoolId,
        status: evaluationSession.status,
        note: evaluationSession.note,
        createdAt: evaluationSession.createdAt,
        submittedAt: evaluationSession.submittedAt,
        instrument: evaluationSession.instrument
          ? {
              id: evaluationSession.instrument.id,
              code: evaluationSession.instrument.code,
              nameTh: evaluationSession.instrument.nameTh,
              nameEn: null,
              description: null,
              type: evaluationSession.instrument.type,
              version: null,
              isActive: true,
            }
          : undefined,
        school: evaluationSession.school
          ? {
              id: evaluationSession.school.id,
              code: evaluationSession.school.code,
              name: evaluationSession.school.name,
              nameTh: evaluationSession.school.nameTh,
            }
          : undefined,
      } as EvaluationSessionDto,
      'สร้างการประเมินสำเร็จ'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

