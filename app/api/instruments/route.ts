// app/api/instruments/route.ts
// GET /api/instruments - List all instruments
// POST /api/instruments - Create instrument (admin only)

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, requireRole, parsePagination } from '@/lib/api-utils';
import { InstrumentType } from '@prisma/client';
import { InstrumentDto, PaginatedResponse } from '@/lib/api-types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as InstrumentType | null;
    const isActive = searchParams.get('isActive');
    const { page, limit, skip } = parsePagination(searchParams);

    const where: any = {};
    if (type) where.type = type;
    if (isActive !== null) where.isActive = isActive === 'true';

    const [instruments, total] = await Promise.all([
      prisma.instrument.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              sections: true,
              indicators: true,
            },
          },
        },
      }),
      prisma.instrument.count({ where }),
    ]);

    const instrumentsDto: InstrumentDto[] = instruments.map((inst) => ({
      id: inst.id,
      code: inst.code,
      nameTh: inst.nameTh,
      nameEn: inst.nameEn,
      description: inst.description,
      type: inst.type,
      version: inst.version,
      isActive: inst.isActive,
      sectionsCount: inst._count.sections,
      indicatorsCount: inst._count.indicators,
    }));

    const response: PaginatedResponse<InstrumentDto> = {
      items: instrumentsDto,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return successResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, 'ADMIN'); // Admin only

    const body = await request.json();
    const { code, nameTh, nameEn, description, type, version } = body;

    if (!code || !nameTh || !type) {
      return errorResponse('Missing required fields: code, nameTh, type', 400);
    }

    const instrument = await prisma.instrument.create({
      data: {
        code,
        nameTh,
        nameEn,
        description,
        type: type as InstrumentType,
        version,
        isActive: true,
      },
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
      'สร้างเครื่องมือประเมินสำเร็จ'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

