// app/api/terms/route.ts
// GET /api/terms - List terms (optionally filtered by academicYearId)

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, parseIntParam } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const academicYearId = parseIntParam(searchParams, 'academicYearId');

    const where: any = {};
    if (academicYearId !== undefined) {
      where.academicYearId = academicYearId;
    }

    const terms = await prisma.term.findMany({
      where,
      orderBy: { name: 'asc' }, // Order by name instead of order field
    });

    const termsDto = terms.map((term) => ({
      id: term.id,
      name: term.name,
      academicYearId: term.academicYearId,
      startDate: term.startDate,
      endDate: term.endDate,
    }));

    return successResponse(termsDto);
  } catch (error) {
    return handleApiError(error);
  }
}

