// app/api/schools/route.ts
// GET /api/schools - List schools
//
// Default: returns only active schools so dropdown pickers / scope filters
// hide schools an admin has switched off in /admin/schools. Admins who need
// the full list (active + inactive) use /api/admin/schools instead. To
// explicitly opt in to deactivated entries from this endpoint, callers can
// pass ?isActive=false or ?isActive=any.

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
    }
    // Any other value (e.g. 'any', 'all') → no isActive filter

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

