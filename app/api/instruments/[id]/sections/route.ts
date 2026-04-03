// app/api/instruments/[id]/sections/route.ts
// GET /api/instruments/:id/sections - Get instrument sections
// POST /api/instruments/:id/sections - Create new section

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, requireAuth } from '@/lib/api-utils';
import { InstrumentSectionDto } from '@/lib/api-types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const instrumentId = parseInt(params.id, 10);
    if (isNaN(instrumentId)) {
      return errorResponse('Invalid instrument ID', 400);
    }

    const sections = await prisma.instrumentSection.findMany({
      where: { instrumentId },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: {
            indicators: true,
          },
        },
      },
    });

    const sectionsDto: InstrumentSectionDto[] = sections.map((section) => ({
      id: section.id,
      instrumentId: section.instrumentId,
      nameTh: section.nameTh,
      nameEn: section.nameEn,
      description: section.description,
      order: section.order,
      indicatorsCount: section._count.indicators,
    }));

    return successResponse(sectionsDto);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(request);

    const instrumentId = parseInt(params.id, 10);
    if (isNaN(instrumentId)) {
      return errorResponse('Invalid instrument ID', 400);
    }

    // Verify instrument exists
    const instrument = await prisma.instrument.findUnique({
      where: { id: instrumentId },
    });

    if (!instrument) {
      return errorResponse('ไม่พบเครื่องมือประเมิน', 404);
    }

    const body = await request.json();
    const { nameTh, nameEn, description, order } = body;

    if (!nameTh || nameTh.trim() === '') {
      return errorResponse('กรุณากรอกชื่อ Section (ภาษาไทย)', 400);
    }

    // Get max order if not provided
    let sectionOrder = order;
    if (sectionOrder === undefined || sectionOrder === null) {
      const maxOrder = await prisma.instrumentSection.findFirst({
        where: { instrumentId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      sectionOrder = maxOrder ? maxOrder.order + 1 : 1;
    }

    const section = await prisma.instrumentSection.create({
      data: {
        instrumentId,
        nameTh: nameTh.trim(),
        nameEn: nameEn?.trim() || null,
        description: description?.trim() || null,
        order: sectionOrder,
      },
      include: {
        _count: {
          select: {
            indicators: true,
          },
        },
      },
    });

    const sectionDto: InstrumentSectionDto = {
      id: section.id,
      instrumentId: section.instrumentId,
      nameTh: section.nameTh,
      nameEn: section.nameEn,
      description: section.description,
      order: section.order,
      indicatorsCount: section._count.indicators,
    };

    return successResponse(sectionDto, 'สร้าง Section สำเร็จ');
  } catch (error) {
    return handleApiError(error);
  }
}

