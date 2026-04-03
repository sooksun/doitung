// app/api/okrs/actions/[id]/ratings/route.ts
// GET /api/okrs/actions/:id/ratings - Get action ratings
// POST /api/okrs/actions/:id/ratings - Create action rating

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
  parseIntParam,
  parsePagination,
} from '@/lib/api-utils';
import { OKRActionRatingDto, PaginatedResponse } from '@/lib/api-types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actionId = parseInt(params.id, 10);
    if (isNaN(actionId)) {
      return errorResponse('Invalid action ID', 400);
    }

    const searchParams = request.nextUrl.searchParams;
    const schoolId = parseIntParam(searchParams, 'schoolId');
    const academicYearId = parseIntParam(searchParams, 'academicYearId');
    const termId = parseIntParam(searchParams, 'termId');
    const evaluatorId = parseIntParam(searchParams, 'evaluatorId');
    const { page, limit, skip } = parsePagination(searchParams);

    const where: any = { actionId };
    if (schoolId !== undefined) where.schoolId = schoolId;
    if (academicYearId !== undefined) where.academicYearId = academicYearId;
    if (termId !== undefined) where.termId = termId;
    if (evaluatorId !== undefined) where.evaluatorId = evaluatorId;

    const [ratings, total] = await Promise.all([
      prisma.oKRActionRating.findMany({
        where,
        skip,
        take: limit,
        orderBy: { evaluatedAt: 'desc' },
        include: {
          evaluator: {
            select: {
              id: true,
              name: true,
              email: true,
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
        },
      }),
      prisma.oKRActionRating.count({ where }),
    ]);

    const ratingsDto: OKRActionRatingDto[] = ratings.map((rating) => ({
      id: rating.id,
      actionId: rating.actionId,
      currentState: rating.currentState,
      desiredState: rating.desiredState,
      comment: rating.comment,
      evaluatorId: rating.evaluatorId,
      schoolId: rating.schoolId,
      academicYearId: rating.academicYearId,
      termId: rating.termId,
      evaluatedAt: rating.evaluatedAt,
      evaluator: rating.evaluator
        ? {
            id: rating.evaluator.id,
            name: rating.evaluator.name,
            email: rating.evaluator.email,
          }
        : undefined,
      school: rating.school
        ? {
            id: rating.school.id,
            code: rating.school.code,
            name: rating.school.name,
            nameTh: rating.school.nameTh,
          }
        : undefined,
      academicYear: rating.academicYear
        ? {
            id: rating.academicYear.id,
            year: rating.academicYear.year,
          }
        : undefined,
      term: rating.term
        ? {
            id: rating.term.id,
            name: rating.term.name,
          }
        : undefined,
    }));

    const response: PaginatedResponse<OKRActionRatingDto> = {
      items: ratingsDto,
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);

    const actionId = parseInt(params.id, 10);
    if (isNaN(actionId)) {
      return errorResponse('Invalid action ID', 400);
    }

    // Verify action exists
    const action = await prisma.oKRAction.findUnique({
      where: { id: actionId },
    });

    if (!action) {
      return errorResponse('ไม่พบ Action ที่ต้องการ', 404);
    }

    const body = await request.json();
    const { currentState, desiredState, comment, schoolId, academicYearId, termId } = body;

    // Validate required fields
    if (currentState === undefined || desiredState === undefined) {
      return errorResponse('กรุณากรอก currentState และ desiredState', 400);
    }

    // Validate rating range (1-5)
    if (currentState < 1 || currentState > 5 || !Number.isInteger(currentState)) {
      return errorResponse('currentState ต้องเป็นตัวเลข 1-5', 400);
    }

    if (desiredState < 1 || desiredState > 5 || !Number.isInteger(desiredState)) {
      return errorResponse('desiredState ต้องเป็นตัวเลข 1-5', 400);
    }

    const rating = await prisma.oKRActionRating.create({
      data: {
        actionId,
        currentState: parseInt(currentState, 10),
        desiredState: parseInt(desiredState, 10),
        comment: comment || null,
        evaluatorId: user.id,
        schoolId: schoolId ? parseInt(schoolId, 10) : null,
        academicYearId: academicYearId ? parseInt(academicYearId, 10) : null,
        termId: termId ? parseInt(termId, 10) : null,
      },
      include: {
        evaluator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return successResponse(
      {
        id: rating.id,
        actionId: rating.actionId,
        currentState: rating.currentState,
        desiredState: rating.desiredState,
        comment: rating.comment,
        evaluatorId: rating.evaluatorId,
        schoolId: rating.schoolId,
        academicYearId: rating.academicYearId,
        termId: rating.termId,
        evaluatedAt: rating.evaluatedAt,
        evaluator: {
          id: rating.evaluator.id,
          name: rating.evaluator.name,
          email: rating.evaluator.email,
        },
      } as OKRActionRatingDto,
      'บันทึกการประเมิน Action สำเร็จ'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

