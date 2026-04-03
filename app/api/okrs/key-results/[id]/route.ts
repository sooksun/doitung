// app/api/okrs/key-results/[id]/route.ts
// GET /api/okrs/key-results/:id - Get key result details
// PATCH /api/okrs/key-results/:id - Update key result
// DELETE /api/okrs/key-results/:id - Delete key result

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
    // Validate params first
    if (!params) {
      console.error(`[GET /api/okrs/key-results] params is null or undefined`);
      return errorResponse('Missing route parameters', 400);
    }

    // Extract id from params
    const idValue = params.id;
    
    console.log(`[GET /api/okrs/key-results] params:`, JSON.stringify(params));
    console.log(`[GET /api/okrs/key-results] params.id:`, idValue, typeof idValue);
    console.log(`[GET /api/okrs/key-results] request.url:`, request.url);
    
    if (!idValue || idValue === 'undefined' || idValue === 'null') {
      console.error(`[GET /api/okrs/key-results] Missing or invalid ID: ${idValue}`);
      // Fallback: extract from URL
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(p => p);
      const idIndex = pathParts.indexOf('key-results');
      if (idIndex >= 0 && idIndex < pathParts.length - 1) {
        const fallbackId = pathParts[idIndex + 1];
        console.log(`[GET /api/okrs/key-results] Using fallback ID from URL: ${fallbackId}`);
        const id = parseInt(fallbackId, 10);
        if (!isNaN(id)) {
          // Continue with fallback ID
          return await fetchKeyResult(id);
        }
      }
      return errorResponse(`Missing key result ID. Received: ${idValue}`, 400);
    }

    const id = parseInt(idValue, 10);
    if (isNaN(id) || id <= 0) {
      console.error(`[GET /api/okrs/key-results] Invalid ID: ${idValue}`);
      return errorResponse(`Invalid key result ID: ${idValue}`, 400);
    }

    return await fetchKeyResult(id);
  } catch (error) {
    console.error(`[GET /api/okrs/key-results] Error:`, error);
    return handleApiError(error);
  }
}

async function fetchKeyResult(id: number) {
  try {
    console.log(`[GET /api/okrs/key-results/${id}] Fetching key result...`);

    const keyResult = await prisma.oKRKeyResult.findUnique({
      where: { id },
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
        actions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            order: true,
            targetDesiredState: true,
          },
        },
        _count: {
          select: {
            indicators: true,
            actions: true,
          },
        },
      },
    });

    if (!keyResult) {
      console.log(`[GET /api/okrs/key-results/${id}] Key result not found`);
      return errorResponse('ไม่พบ Key Result ที่ต้องการ', 404);
    }

    console.log(`[GET /api/okrs/key-results/${id}] Found key result:`, {
      id: keyResult.id,
      title: keyResult.title,
      actionsCount: keyResult.actions.length,
    });

    const keyResultDto: OKRKeyResultDto & {
      objective?: {
        id: number;
        title: string;
        description: string | null;
        dimension: string | null;
      };
      actions?: Array<{
        id: number;
        title: string;
        description: string | null;
        order: number;
        targetDesiredState: number | null;
      }>;
    } = {
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
      indicatorsCount: keyResult._count.indicators,
      actionsCount: keyResult._count.actions,
      objective: keyResult.objective ? {
        id: keyResult.objective.id,
        title: keyResult.objective.title,
        description: keyResult.objective.description,
        dimension: keyResult.objective.dimension,
      } : undefined,
      actions: keyResult.actions.map(a => ({
        id: a.id,
        title: a.title,
        description: a.description,
        order: a.order,
        targetDesiredState: a.targetDesiredState,
      })),
    };

    console.log(`[GET /api/okrs/key-results/${id}] Returning DTO with ${keyResultDto.actions?.length || 0} actions`);
    return successResponse(keyResultDto);
  } catch (error) {
    console.error(`[GET /api/okrs/key-results/${id}] Prisma error:`, error);
    throw error; // Re-throw to be caught by outer try-catch
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!params || !params.id) {
      return errorResponse('Missing key result ID', 400);
    }
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return errorResponse('Invalid key result ID', 400);
    }

    const body = await request.json();
    const { title, description, baseline, target, current, unit, ownerId, quarter } = body;

    const updateData: any = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (baseline !== undefined) updateData.baseline = baseline !== null ? parseFloat(baseline) : null;
    if (target !== undefined) updateData.target = target !== null ? parseFloat(target) : null;
    if (current !== undefined) updateData.current = current !== null ? parseFloat(current) : null;
    if (unit !== undefined) updateData.unit = unit;
    if (ownerId !== undefined) updateData.ownerId = ownerId ? parseInt(ownerId, 10) : null;
    if (quarter !== undefined) updateData.quarter = quarter ? (quarter as Quarter) : null;

    const keyResult = await prisma.oKRKeyResult.update({
      where: { id },
      data: updateData,
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
      'อัปเดต Key Result สำเร็จ'
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
    if (!params || !params.id) {
      return errorResponse('Missing key result ID', 400);
    }
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return errorResponse('Invalid key result ID', 400);
    }

    // Cascade delete: actions, indicator links
    await prisma.oKRKeyResult.delete({
      where: { id },
    });

    return successResponse(null, 'ลบ Key Result สำเร็จ');
  } catch (error) {
    return handleApiError(error);
  }
}
