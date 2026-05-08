// app/api/schools/route.ts
// GET /api/schools - List schools
//
// Query param `isActive` (optional) — accepted values:
//   omitted | 'true'  → only active schools (default)
//   'false'           → only deactivated schools
//   'any'             → no isActive filter (active + deactivated)
// Any other value returns 400 so typos like ?isActive=archived fail loudly
// instead of silently dropping the filter.
//
// Admins who need the full list typically use /api/admin/schools instead.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isActiveParam = searchParams.get('isActive');

    const where: any = {};
    if (isActiveParam === null || isActiveParam === 'true') {
      where.isActive = true;
    } else if (isActiveParam === 'false') {
      where.isActive = false;
    } else if (isActiveParam !== 'any') {
      return errorResponse(
        `Invalid isActive value '${isActiveParam}' — expected 'true', 'false', 'any', or omit the param`,
        400
      );
    }
    // isActiveParam === 'any' → leave `where.isActive` unset (no filter)

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

