// app/api/academic-years/route.ts
// GET /api/academic-years - List academic years

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const academicYears = await prisma.academicYear.findMany({
      orderBy: { year: 'desc' },
    });

    const academicYearsDto = academicYears.map((year) => ({
      id: year.id,
      year: year.year,
    }));

    return successResponse(academicYearsDto);
  } catch (error) {
    return handleApiError(error);
  }
}

