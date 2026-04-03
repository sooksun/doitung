// app/api/okrs/objectives/[id]/key-results/route.ts
// GET /api/okrs/objectives/:id/key-results - Get key results
// POST /api/okrs/objectives/:id/key-results - Create key result

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { Quarter } from '@prisma/client';
import { OKRKeyResultDto } from '@/lib/api-types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const objectiveId = parseInt(params.id, 10);
    if (isNaN(objectiveId)) {
      return errorResponse('Invalid objective ID', 400);
    }

    const keyResults = await prisma.oKRKeyResult.findMany({
      where: { objectiveId },
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
    });

    const keyResultsDto: OKRKeyResultDto[] = keyResults.map((kr) => {
      // Calculate progress
      let progress = 0;
      let status: 'green' | 'yellow' | 'red' = 'red';
      
      if (kr.baseline !== null && kr.target !== null && kr.current !== null) {
        if (kr.target === kr.baseline) {
          progress = (kr.current / kr.target) * 100;
        } else {
          progress = ((kr.current - kr.baseline) / (kr.target - kr.baseline)) * 100;
        }
        progress = Math.max(0, Math.min(120, progress));

        // Traffic light status
        if (progress >= 90) status = 'green';
        else if (progress >= 70) status = 'yellow';
        else status = 'red';
      }

      return {
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
        progress,
        status,
        indicatorsCount: kr._count.indicators,
        actionsCount: kr._count.actions,
      };
    });

    return successResponse(keyResultsDto);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const objectiveId = parseInt(params.id, 10);
    if (isNaN(objectiveId)) {
      return errorResponse('Invalid objective ID', 400);
    }

    const body = await request.json();
    const { title, description, baseline, target, unit, quarter, ownerId } = body;

    if (!title) {
      return errorResponse('Missing required field: title', 400);
    }

    const keyResult = await prisma.oKRKeyResult.create({
      data: {
        objectiveId,
        title,
        description: description || null,
        baseline: baseline !== undefined ? parseFloat(baseline) : null,
        target: target !== undefined ? parseFloat(target) : null,
        unit: unit || null,
        quarter: quarter ? (quarter as Quarter) : null,
        ownerId: ownerId ? parseInt(ownerId, 10) : null,
      },
    });

    return successResponse(
      {
        id: keyResult.id,
        objectiveId: keyResult.objectiveId,
        title: keyResult.title,
        description: keyResult.description,
        baseline: keyResult.baseline,
        target: keyResult.target,
        current: keyResult.current,
        unit: keyResult.unit,
        quarter: keyResult.quarter,
        ownerId: keyResult.ownerId,
      } as OKRKeyResultDto,
      'สร้าง Key Result สำเร็จ'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

