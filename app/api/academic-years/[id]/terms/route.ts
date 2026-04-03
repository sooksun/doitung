// app/api/academic-years/[id]/terms/route.ts
// GET /api/academic-years/:id/terms - List terms for an academic year

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const academicYearId = parseInt(params.id, 10);
    if (isNaN(academicYearId)) {
      return errorResponse('Invalid academic year ID', 400);
    }

    const terms = await prisma.term.findMany({
      where: { academicYearId },
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

