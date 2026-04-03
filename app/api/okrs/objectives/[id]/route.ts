// app/api/okrs/objectives/[id]/route.ts
// GET /api/okrs/objectives/:id - Get objective details
// PATCH /api/okrs/objectives/:id - Update objective
// DELETE /api/okrs/objectives/:id - Delete objective

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { Quarter, OKRStatus } from '@prisma/client';
import { OKRObjectiveDto } from '@/lib/api-types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return errorResponse('Invalid objective ID', 400);
    }

    const objective = await prisma.oKRObjective.findUnique({
      where: { id },
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
              include: {
                indicator: {
                  select: {
                    id: true,
                    itemCode: true,
                    textTh: true,
                  },
                },
              },
            },
            actions: {
              orderBy: { order: 'asc' },
            },
            owner: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                indicators: true,
                actions: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            keyResults: true,
          },
        },
      },
    });

    if (!objective) {
      return errorResponse('ไม่พบ Objective ที่ต้องการ', 404);
    }

    // Calculate progress
    let progress = 0;
    if (objective.keyResults.length > 0) {
      const krProgresses = objective.keyResults
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
        progress = Math.max(0, Math.min(120, progress));
      }
    }

    // Transform keyResults to include calculated progress
    const keyResults = objective.keyResults.map((kr) => {
      let krProgress = 0;
      if (kr.baseline !== null && kr.target !== null && kr.current !== null) {
        if (kr.target === kr.baseline) {
          krProgress = (kr.current / kr.target) * 100;
        } else {
          krProgress = ((kr.current - kr.baseline) / (kr.target - kr.baseline)) * 100;
        }
        krProgress = Math.max(0, Math.min(120, krProgress));
      }

      // Determine status color
      let status: 'green' | 'yellow' | 'red' = 'red';
      if (krProgress >= 90) status = 'green';
      else if (krProgress >= 70) status = 'yellow';

      return {
        id: kr.id,
        title: kr.title,
        description: kr.description,
        baseline: kr.baseline,
        target: kr.target,
        current: kr.current,
        progress: krProgress,
        status,
        actionsCount: kr._count.actions,
        indicatorsCount: kr._count.indicators,
      };
    });

    const objectiveDto: any = {
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
      keyResultsCount: objective._count.keyResults,
      progress,
      keyResults, // Include keyResults in response
    };

    return successResponse(objectiveDto);
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
      return errorResponse('Invalid objective ID', 400);
    }

    const body = await request.json();
    const { title, description, dimension, status, ownerId, quarter } = body;

    const updateData: any = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dimension !== undefined) updateData.dimension = dimension;
    if (status) updateData.status = status as OKRStatus;
    if (ownerId !== undefined) updateData.ownerId = ownerId ? parseInt(ownerId, 10) : null;
    if (quarter !== undefined) updateData.quarter = quarter ? (quarter as Quarter) : null;

    const objective = await prisma.oKRObjective.update({
      where: { id },
      data: updateData,
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
      'อัปเดต Objective สำเร็จ'
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
      return errorResponse('Invalid objective ID', 400);
    }

    // Cascade delete: keyResults -> actions, indicator links
    await prisma.oKRObjective.delete({
      where: { id },
    });

    return successResponse(null, 'ลบ Objective สำเร็จ');
  } catch (error) {
    return handleApiError(error);
  }
}

