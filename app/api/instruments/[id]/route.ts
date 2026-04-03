// app/api/instruments/[id]/route.ts
// GET /api/instruments/:id - Get instrument details
// PATCH /api/instruments/:id - Update instrument

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, requireRole } from '@/lib/api-utils';
import { InstrumentType } from '@prisma/client';
import { InstrumentDto } from '@/lib/api-types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return errorResponse('Invalid instrument ID', 400);
    }

    const instrument = await prisma.instrument.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            indicators: {
              orderBy: { itemCode: 'asc' },
            },
          },
        },
        _count: {
          select: {
            sections: true,
            indicators: true,
          },
        },
      },
    });

    if (!instrument) {
      return errorResponse('ไม่พบเครื่องมือประเมินที่ต้องการ', 404);
    }

    // Return full instrument with sections and indicators
    return successResponse({
      id: instrument.id,
      code: instrument.code,
      nameTh: instrument.nameTh,
      nameEn: instrument.nameEn,
      description: instrument.description,
      type: instrument.type,
      version: instrument.version,
      isActive: instrument.isActive,
      sections: instrument.sections.map((section) => ({
        id: section.id,
        nameTh: section.nameTh,
        nameEn: section.nameEn,
        order: section.order,
        indicators: section.indicators.map((indicator) => ({
          id: indicator.id,
          itemCode: indicator.itemCode,
          textTh: indicator.textTh,
          textEn: indicator.textEn,
          scaleType: indicator.scaleType,
          maxScore: indicator.maxScore,
          minScore: indicator.minScore,
        })),
      })),
      sectionsCount: instrument._count.sections,
      indicatorsCount: instrument._count.indicators,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(request, 'ADMIN'); // Admin only

    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return errorResponse('Invalid instrument ID', 400);
    }

    const body = await request.json();
    const { nameTh, nameEn, description, version, isActive } = body;

    const updateData: any = {};
    if (nameTh !== undefined) updateData.nameTh = nameTh;
    if (nameEn !== undefined) updateData.nameEn = nameEn;
    if (description !== undefined) updateData.description = description;
    if (version !== undefined) updateData.version = version;
    if (isActive !== undefined) updateData.isActive = isActive;

    const instrument = await prisma.instrument.update({
      where: { id },
      data: updateData,
    });

    return successResponse(
      {
        id: instrument.id,
        code: instrument.code,
        nameTh: instrument.nameTh,
        nameEn: instrument.nameEn,
        description: instrument.description,
        type: instrument.type,
        version: instrument.version,
        isActive: instrument.isActive,
      } as InstrumentDto,
      'อัปเดตเครื่องมือประเมินสำเร็จ'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

