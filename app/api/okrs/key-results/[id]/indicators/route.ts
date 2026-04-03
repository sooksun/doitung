// app/api/okrs/key-results/[id]/indicators/route.ts
// POST /api/okrs/key-results/:id/indicators - Link indicator to KR
// DELETE /api/okrs/key-results/:id/indicators/:indicatorId - Unlink indicator

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

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
    const { indicatorId, weight } = body;

    if (!indicatorId) {
      return errorResponse('Missing required field: indicatorId', 400);
    }

    // Verify key result exists
    const keyResult = await prisma.oKRKeyResult.findUnique({
      where: { id: keyResultId },
    });

    if (!keyResult) {
      return errorResponse('ไม่พบ Key Result ที่ต้องการ', 404);
    }

    // Verify indicator exists
    const indicator = await prisma.indicator.findUnique({
      where: { id: parseInt(indicatorId, 10) },
    });

    if (!indicator) {
      return errorResponse('ไม่พบ Indicator ที่ต้องการ', 404);
    }

    const link = await prisma.oKRKeyResultIndicator.upsert({
      where: {
        keyResultId_indicatorId: {
          keyResultId,
          indicatorId: parseInt(indicatorId, 10),
        },
      },
      update: {
        weight: weight !== undefined ? parseFloat(weight) : null,
      },
      create: {
        keyResultId,
        indicatorId: parseInt(indicatorId, 10),
        weight: weight !== undefined ? parseFloat(weight) : null,
      },
    });

    return successResponse(
      {
        keyResultId: link.keyResultId,
        indicatorId: link.indicatorId,
        weight: link.weight,
      },
      'เชื่อมโยง Indicator กับ KR สำเร็จ'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; indicatorId: string } }
) {
  try {
    const keyResultId = parseInt(params.id, 10);
    const indicatorId = parseInt(params.indicatorId, 10);

    if (isNaN(keyResultId) || isNaN(indicatorId)) {
      return errorResponse('Invalid key result ID or indicator ID', 400);
    }

    await prisma.oKRKeyResultIndicator.delete({
      where: {
        keyResultId_indicatorId: {
          keyResultId,
          indicatorId,
        },
      },
    });

    return successResponse(null, 'ยกเลิกการเชื่อมโยง Indicator สำเร็จ');
  } catch (error) {
    return handleApiError(error);
  }
}

