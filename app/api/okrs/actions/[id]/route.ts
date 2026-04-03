// app/api/okrs/actions/[id]/route.ts
// GET /api/okrs/actions/:id - Get action details with Objective and Key Result
// PATCH /api/okrs/actions/:id - Update action (including Set Goal)

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
} from '@/lib/api-utils';
import { OKRActionDto } from '@/lib/api-types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actionId = parseInt(params.id, 10);
    if (isNaN(actionId)) {
      return errorResponse('Invalid action ID', 400);
    }

    const action = await prisma.oKRAction.findUnique({
      where: { id: actionId },
      include: {
        keyResult: {
          include: {
            objective: {
              select: {
                id: true,
                title: true,
                description: true,
                dimension: true,
              },
            },
            owner: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
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

    if (!action) {
      return errorResponse('ไม่พบ Action ที่ต้องการ', 404);
    }

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

    const actionDto: OKRActionDto & {
      objective?: {
        id: number;
        title: string;
        description: string | null;
        dimension: string | null;
      };
      keyResult?: {
        id: number;
        title: string;
        description: string | null;
      };
      targetCurrentState?: number | null;
      targetDesiredState?: number | null;
    } = {
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
      targetCurrentState: action.targetCurrentState,
      targetDesiredState: action.targetDesiredState,
      objective: action.keyResult.objective
        ? {
            id: action.keyResult.objective.id,
            title: action.keyResult.objective.title,
            description: action.keyResult.objective.description,
            dimension: action.keyResult.objective.dimension,
          }
        : undefined,
      keyResult: {
        id: action.keyResult.id,
        title: action.keyResult.title,
        description: action.keyResult.description,
      },
    };

    return successResponse(actionDto);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
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
    const { targetDesiredState } = body;

    // Validate goal value if provided
    if (targetDesiredState !== undefined) {
      if (targetDesiredState !== null && (targetDesiredState < 1 || targetDesiredState > 5 || !Number.isInteger(targetDesiredState))) {
        return errorResponse('targetDesiredState ต้องเป็นตัวเลข 1-5 หรือ null', 400);
      }
    }

    const updatedAction = await prisma.oKRAction.update({
      where: { id: actionId },
      data: {
        ...(targetDesiredState !== undefined && { targetDesiredState: targetDesiredState === null ? null : parseInt(targetDesiredState, 10) }),
      },
      include: {
        keyResult: {
          include: {
            objective: {
              select: {
                id: true,
                title: true,
                description: true,
                dimension: true,
              },
            },
          },
        },
      },
    });

    return successResponse(
      {
        id: updatedAction.id,
        targetDesiredState: updatedAction.targetDesiredState,
      },
      'บันทึกค่าเป้าหมายสำเร็จ'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

