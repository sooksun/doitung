// app/api/instruments/[id]/sections/[sectionId]/route.ts
// PATCH /api/instruments/:id/sections/:sectionId - Update section
// DELETE /api/instruments/:id/sections/:sectionId - Delete section

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, requireAuth } from '@/lib/api-utils';
import { InstrumentSectionDto } from '@/lib/api-types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; sectionId: string } }
) {
  try {
    await requireAuth(request);

    const instrumentId = parseInt(params.id, 10);
    const sectionId = parseInt(params.sectionId, 10);

    if (isNaN(instrumentId) || isNaN(sectionId)) {
      return errorResponse('Invalid instrument ID or section ID', 400);
    }

    // Verify section exists and belongs to instrument
    const section = await prisma.instrumentSection.findFirst({
      where: {
        id: sectionId,
        instrumentId,
      },
    });

    if (!section) {
      return errorResponse('ไม่พบ Section ที่ต้องการ', 404);
    }

    const body = await request.json();
    const { nameTh, nameEn, description, order } = body;

    const updateData: any = {};
    if (nameTh !== undefined) updateData.nameTh = nameTh.trim();
    if (nameEn !== undefined) updateData.nameEn = nameEn?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (order !== undefined) updateData.order = order;

    if (nameTh !== undefined && nameTh.trim() === '') {
      return errorResponse('ชื่อ Section (ภาษาไทย) ไม่สามารถเป็นค่าว่างได้', 400);
    }

    const updatedSection = await prisma.instrumentSection.update({
      where: { id: sectionId },
      data: updateData,
      include: {
        _count: {
          select: {
            indicators: true,
          },
        },
      },
    });

    const sectionDto: InstrumentSectionDto = {
      id: updatedSection.id,
      instrumentId: updatedSection.instrumentId,
      nameTh: updatedSection.nameTh,
      nameEn: updatedSection.nameEn,
      description: updatedSection.description,
      order: updatedSection.order,
      indicatorsCount: updatedSection._count.indicators,
    };

    return successResponse(sectionDto, 'อัปเดต Section สำเร็จ');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; sectionId: string } }
) {
  try {
    await requireAuth(request);

    const instrumentId = parseInt(params.id, 10);
    const sectionId = parseInt(params.sectionId, 10);

    if (isNaN(instrumentId) || isNaN(sectionId)) {
      return errorResponse('Invalid instrument ID or section ID', 400);
    }

    // Verify section exists and belongs to instrument
    const section = await prisma.instrumentSection.findFirst({
      where: {
        id: sectionId,
        instrumentId,
      },
      include: {
        _count: {
          select: {
            indicators: true,
          },
        },
      },
    });

    if (!section) {
      return errorResponse('ไม่พบ Section ที่ต้องการ', 404);
    }

    // Check if section has indicators
    if (section._count.indicators > 0) {
      return errorResponse(
        `ไม่สามารถลบ Section นี้ได้ เนื่องจากมี Indicators อยู่ ${section._count.indicators} ตัว กรุณาลบ Indicators ก่อน`,
        400
      );
    }

    await prisma.instrumentSection.delete({
      where: { id: sectionId },
    });

    return successResponse(null, 'ลบ Section สำเร็จ');
  } catch (error) {
    return handleApiError(error);
  }
}

