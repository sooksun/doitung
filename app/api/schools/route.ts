// app/api/schools/route.ts
// GET /api/schools - List schools

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const schools = await prisma.school.findMany({
      where,
      orderBy: { nameTh: 'asc' },
    });

    const schoolsDto = schools.map((school) => ({
      id: school.id,
      code: school.code,
      name: school.name,
      nameTh: school.nameTh,
      address: school.address,
      province: school.province,
      district: school.district,
      isActive: school.isActive,
    }));

    return successResponse(schoolsDto);
  } catch (error) {
    return handleApiError(error);
  }
}

