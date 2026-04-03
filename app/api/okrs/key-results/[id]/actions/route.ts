// app/api/okrs/key-results/[id]/actions/route.ts
// POST /api/okrs/key-results/:id/actions - Create action
// GET /api/okrs/key-results/:id/actions - Get actions

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { ActionStatus } from '@prisma/client';
import { OKRActionDto } from '@/lib/api-types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const keyResultId = parseInt(params.id, 10);
    if (isNaN(keyResultId)) {
      return errorResponse('Invalid key result ID', 400);
    }

    const actions = await prisma.oKRAction.findMany({
      where: { keyResultId },
      orderBy: { order: 'asc' },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        evidence: {
          select: {
            id: true,
            url: true,
            description: true,
          },
        },
        _count: {
          select: {
            ratings: true,
          },
        },
        ratings: {
          select: {
            currentState: true,
            desiredState: true,
          },
        },
      },
    });

    const actionsDto: OKRActionDto[] = actions.map((action) => {
      // Calculate average ratings
      let averageCurrentState: number | undefined;
      let averageDesiredState: number | undefined;

      if (action.ratings && action.ratings.length > 0) {
        const currentStates = action.ratings.map((r) => r.currentState);
        const desiredStates = action.ratings.map((r) => r.desiredState);

        averageCurrentState =
          currentStates.reduce((a, b) => a + b, 0) / currentStates.length;
        averageDesiredState =
          desiredStates.reduce((a, b) => a + b, 0) / desiredStates.length;
      }

      return {
        id: action.id,
        keyResultId: action.keyResultId,
        title: action.title,
        description: action.description,
        order: action.order,
        ownerId: action.ownerId,
        startDate: action.startDate,
        endDate: action.endDate,
        status: action.status,
        requiredResources: action.requiredResources,
        risks: action.risks,
        mitigation: action.mitigation,
        expectedOutputs: action.expectedOutputs,
        expectedOutcomes: action.expectedOutcomes,
        evidenceOfSuccess: action.evidenceOfSuccess,
        ratingsCount: action._count.ratings,
        averageCurrentState: averageCurrentState
          ? Math.round(averageCurrentState * 100) / 100
          : undefined,
        averageDesiredState: averageDesiredState
          ? Math.round(averageDesiredState * 100) / 100
          : undefined,
      };
    });

    return successResponse(actionsDto);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const keyResultId = parseInt(params.id, 10);
    if (isNaN(keyResultId)) {
      return errorResponse('Invalid key result ID', 400);
    }

    const body = await request.json();
    const {
      title,
      description,
      order,
      ownerId,
      startDate,
      endDate,
      requiredResources,
      risks,
      mitigation,
      expectedOutputs,
      expectedOutcomes,
      evidenceOfSuccess,
    } = body;

    if (!title) {
      return errorResponse('Missing required field: title', 400);
    }

    const action = await prisma.oKRAction.create({
      data: {
        keyResultId,
        title,
        description: description || null,
        order: order !== undefined ? parseInt(order, 10) : 0,
        ownerId: ownerId ? parseInt(ownerId, 10) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: ActionStatus.PENDING,
        requiredResources: requiredResources ? JSON.stringify(requiredResources) : null,
        risks: risks ? JSON.stringify(risks) : null,
        mitigation: mitigation ? JSON.stringify(mitigation) : null,
        expectedOutputs: expectedOutputs ? JSON.stringify(expectedOutputs) : null,
        expectedOutcomes: expectedOutcomes ? JSON.stringify(expectedOutcomes) : null,
        evidenceOfSuccess: evidenceOfSuccess ? JSON.stringify(evidenceOfSuccess) : null,
      },
    });

    return successResponse(
      {
        id: action.id,
        keyResultId: action.keyResultId,
        title: action.title,
        description: action.description,
        order: action.order,
        ownerId: action.ownerId,
        startDate: action.startDate,
        endDate: action.endDate,
        status: action.status,
        requiredResources: action.requiredResources,
        risks: action.risks,
        mitigation: action.mitigation,
        expectedOutputs: action.expectedOutputs,
        expectedOutcomes: action.expectedOutcomes,
        evidenceOfSuccess: action.evidenceOfSuccess,
      } as OKRActionDto,
      'สร้าง Action สำเร็จ'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

