// app/api/instruments/[id]/indicators/route.ts
// GET /api/instruments/:id/indicators - Get instrument indicators

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, parseIntParam } from '@/lib/api-utils';
import { IndicatorDto } from '@/lib/api-types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const instrumentId = parseInt(params.id, 10);
    if (isNaN(instrumentId)) {
      return errorResponse('Invalid instrument ID', 400);
    }

    const searchParams = request.nextUrl.searchParams;
    const sectionId = parseIntParam(searchParams, 'sectionId');

    const where: any = { instrumentId };
    if (sectionId !== undefined) where.sectionId = sectionId;

    const indicators = await prisma.indicator.findMany({
      where,
      orderBy: [
        { sectionId: 'asc' },
        { itemCode: 'asc' },
        { id: 'asc' },
      ],
      include: {
        section: {
          select: {
            id: true,
            nameTh: true,
            nameEn: true,
            order: true,
          },
        },
      },
    });

    const indicatorsDto: IndicatorDto[] = indicators.map((indicator) => ({
      id: indicator.id,
      instrumentId: indicator.instrumentId,
      sectionId: indicator.sectionId,
      itemCode: indicator.itemCode,
      textTh: indicator.textTh,
      textEn: indicator.textEn,
      scaleType: indicator.scaleType,
      minScore: indicator.minScore,
      maxScore: indicator.maxScore,
      levelDescriptors: indicator.levelDescriptors,
      isActive: indicator.isActive,
    }));

    return successResponse(indicatorsDto);
  } catch (error) {
    return handleApiError(error);
  }
}

