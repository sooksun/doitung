// app/api/okrs/actions/[id]/ratings/[ratingId]/route.ts
// PATCH /api/okrs/actions/:id/ratings/:ratingId - Update action rating
// DELETE /api/okrs/actions/:id/ratings/:ratingId - Delete action rating

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
} from '@/lib/api-utils';
import { OKRActionRatingDto } from '@/lib/api-types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; ratingId: string } }
) {
  try {
    const user = await requireAuth(request);

    const actionId = parseInt(params.id, 10);
    const ratingId = parseInt(params.ratingId, 10);

    if (isNaN(actionId) || isNaN(ratingId)) {
      return errorResponse('Invalid action ID or rating ID', 400);
    }

    // Verify rating exists and belongs to action
    const rating = await prisma.oKRActionRating.findFirst({
      where: {
        id: ratingId,
        actionId,
      },
    });

    if (!rating) {
      return errorResponse('ไม่พบ Rating ที่ต้องการ', 404);
    }

    // Check if user is the evaluator (only evaluator can edit their own rating)
    if (rating.evaluatorId !== user.id) {
      return errorResponse('คุณไม่มีสิทธิ์แก้ไข Rating นี้ (เฉพาะผู้ประเมินเท่านั้น)', 403);
    }

    const body = await request.json();
    const { currentState, desiredState, comment } = body;

    const updateData: any = {};
    if (currentState !== undefined) {
      if (currentState < 1 || currentState > 5 || !Number.isInteger(currentState)) {
        return errorResponse('currentState ต้องเป็นตัวเลข 1-5', 400);
      }
      updateData.currentState = parseInt(currentState, 10);
    }
    if (desiredState !== undefined) {
      if (desiredState < 1 || desiredState > 5 || !Number.isInteger(desiredState)) {
        return errorResponse('desiredState ต้องเป็นตัวเลข 1-5', 400);
      }
      updateData.desiredState = parseInt(desiredState, 10);
    }
    if (comment !== undefined) {
      updateData.comment = comment?.trim() || null;
    }

    const updatedRating = await prisma.oKRActionRating.update({
      where: { id: ratingId },
      data: updateData,
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
        id: updatedRating.id,
        actionId: updatedRating.actionId,
        currentState: updatedRating.currentState,
        desiredState: updatedRating.desiredState,
        comment: updatedRating.comment,
        evaluatorId: updatedRating.evaluatorId,
        schoolId: updatedRating.schoolId,
        academicYearId: updatedRating.academicYearId,
        termId: updatedRating.termId,
        evaluatedAt: updatedRating.evaluatedAt,
        evaluator: {
          id: updatedRating.evaluator.id,
          name: updatedRating.evaluator.name,
          email: updatedRating.evaluator.email,
        },
      } as OKRActionRatingDto,
      'อัปเดตการประเมินสำเร็จ'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; ratingId: string } }
) {
  try {
    const user = await requireAuth(request);

    const actionId = parseInt(params.id, 10);
    const ratingId = parseInt(params.ratingId, 10);

    if (isNaN(actionId) || isNaN(ratingId)) {
      return errorResponse('Invalid action ID or rating ID', 400);
    }

    // Verify rating exists and belongs to action
    const rating = await prisma.oKRActionRating.findFirst({
      where: {
        id: ratingId,
        actionId,
      },
    });

    if (!rating) {
      return errorResponse('ไม่พบ Rating ที่ต้องการ', 404);
    }

    // Check if user is the evaluator (only evaluator can delete their own rating)
    if (rating.evaluatorId !== user.id) {
      return errorResponse('คุณไม่มีสิทธิ์ลบ Rating นี้ (เฉพาะผู้ประเมินเท่านั้น)', 403);
    }

    await prisma.oKRActionRating.delete({
      where: { id: ratingId },
    });

    return successResponse(null, 'ลบการประเมินสำเร็จ');
  } catch (error) {
    return handleApiError(error);
  }
}

