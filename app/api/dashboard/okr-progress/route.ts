// app/api/dashboard/okr-progress/route.ts
// GET /api/dashboard/okr-progress - OKR progress

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, parseIntParam } from '@/lib/api-utils';
import { OKRObjectiveDto, OKRKeyResultDto } from '@/lib/api-types';
import { calculateKRProgress, calculateObjectiveProgress } from '@/lib/rbm-calculator';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolId = parseIntParam(searchParams, 'schoolId');
    const networkId = parseIntParam(searchParams, 'networkId');
    const academicYearId = parseIntParam(searchParams, 'academicYearId');
    const objectiveId = parseIntParam(searchParams, 'objectiveId');

    const where: any = {
      status: { not: 'ARCHIVED' },
    };

    if (objectiveId) {
      where.id = objectiveId;
    }
    if (schoolId) where.schoolId = schoolId;
    if (networkId) where.networkId = networkId;
    if (academicYearId) where.academicYearId = academicYearId;

    const objectives = await prisma.oKRObjective.findMany({
      where,
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
          },
        },
        keyResults: {
          include: {
            _count: {
              select: {
                indicators: true,
                actions: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const objectivesDto: (OKRObjectiveDto & { keyResults: OKRKeyResultDto[] })[] = [];

    for (const obj of objectives) {
      // Calculate objective progress
      const progress = await calculateObjectiveProgress(obj.id);

      // Calculate KR progresses
      const keyResultsDto: OKRKeyResultDto[] = [];
      for (const kr of obj.keyResults) {
        const krProgress = await calculateKRProgress(kr.id);
        keyResultsDto.push({
          id: kr.id,
          objectiveId: kr.objectiveId,
          title: kr.title,
          description: kr.description,
          baseline: kr.baseline,
          target: kr.target,
          current: kr.current,
          unit: kr.unit,
          quarter: kr.quarter,
          ownerId: kr.ownerId,
          progress: krProgress?.progress || 0,
          status: krProgress?.status || 'red',
          indicatorsCount: kr._count.indicators,
          actionsCount: kr._count.actions,
        });
      }

      objectivesDto.push({
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
        keyResultsCount: obj.keyResults.length,
        progress,
        keyResults: keyResultsDto,
      });
    }

    return successResponse({ objectives: objectivesDto });
  } catch (error) {
    return handleApiError(error);
  }
}

