// app/api/okrs/objectives/route.ts
// GET /api/okrs/objectives - List objectives
// POST /api/okrs/objectives - Create objective

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  handleApiError,
  parsePagination,
  parseIntParam,
} from '@/lib/api-utils';
import { Quarter, OKRStatus } from '@prisma/client';
import { OKRObjectiveDto, PaginatedResponse } from '@/lib/api-types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolId = parseIntParam(searchParams, 'schoolId');
    const networkId = parseIntParam(searchParams, 'networkId');
    const academicYearId = parseIntParam(searchParams, 'academicYearId');
    const dimension = searchParams.get('dimension');
    const status = searchParams.get('status') as OKRStatus | null;
    const ownerId = parseIntParam(searchParams, 'ownerId');
    const quarter = searchParams.get('quarter') as Quarter | null;

    const { page, limit, skip } = parsePagination(searchParams);

    const where: any = {};
    if (schoolId !== undefined) where.schoolId = schoolId;
    if (networkId !== undefined) where.networkId = networkId;
    if (academicYearId !== undefined) where.academicYearId = academicYearId;
    if (dimension) where.dimension = dimension;
    if (status) where.status = status;
    if (ownerId !== undefined) where.ownerId = ownerId;
    if (quarter) where.quarter = quarter;

    const [objectives, total] = await Promise.all([
      prisma.oKRObjective.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          school: {
            select: {
              id: true,
              code: true,
              name: true,
              nameTh: true,
            },
          },
          network: {
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
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          keyResults: {
            include: {
              indicators: {
                select: {
                  indicatorId: true,
                },
              },
            },
          },
          _count: {
            select: {
              keyResults: true,
            },
          },
        },
      }),
      prisma.oKRObjective.count({ where }),
    ]);

    // Calculate progress for each objective
    const objectivesDto: OKRObjectiveDto[] = objectives.map((obj) => {
      // Calculate progress from keyResults
      let progress = 0;
      if (obj.keyResults.length > 0) {
        const krProgresses = obj.keyResults
          .map((kr) => {
            if (kr.baseline === null || kr.target === null || kr.current === null) {
              return null;
            }
            if (kr.target === kr.baseline) {
              return (kr.current / kr.target) * 100;
            }
            return ((kr.current - kr.baseline) / (kr.target - kr.baseline)) * 100;
          })
          .filter((p): p is number => p !== null);
        
        if (krProgresses.length > 0) {
          progress = krProgresses.reduce((a, b) => a + b, 0) / krProgresses.length;
          progress = Math.max(0, Math.min(120, progress)); // Clip to 0-120%
        }
      }

      return {
        id: obj.id,
        code: obj.code,
        title: obj.title,
        description: obj.description,
        dimension: obj.dimension,
        status: obj.status,
        schoolId: obj.schoolId,
        networkId: obj.networkId,
        academicYearId: obj.academicYearId,
        ownerId: obj.ownerId,
        quarter: obj.quarter,
        keyResultsCount: obj._count.keyResults,
        progress,
      };
    });

    const response: PaginatedResponse<OKRObjectiveDto> = {
      items: objectivesDto,
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
      code,
      title,
      description,
      dimension,
      schoolId,
      networkId,
      academicYearId,
      ownerId,
      quarter,
    } = body;

    if (!title) {
      return errorResponse('Missing required field: title', 400);
    }

    const objective = await prisma.oKRObjective.create({
      data: {
        code: code || null,
        title,
        description: description || null,
        dimension: dimension || null,
        status: OKRStatus.DRAFT,
        schoolId: schoolId ? parseInt(schoolId, 10) : null,
        networkId: networkId ? parseInt(networkId, 10) : null,
        academicYearId: academicYearId ? parseInt(academicYearId, 10) : null,
        ownerId: ownerId ? parseInt(ownerId, 10) : null,
        quarter: quarter ? (quarter as Quarter) : null,
      },
    });

    return successResponse(
      {
        id: objective.id,
        code: objective.code,
        title: objective.title,
        description: objective.description,
        dimension: objective.dimension,
        status: objective.status,
        schoolId: objective.schoolId,
        networkId: objective.networkId,
        academicYearId: objective.academicYearId,
        ownerId: objective.ownerId,
        quarter: objective.quarter,
      } as OKRObjectiveDto,
      'สร้าง Objective สำเร็จ'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

