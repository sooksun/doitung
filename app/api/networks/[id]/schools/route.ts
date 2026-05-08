// app/api/networks/[id]/schools/route.ts
// GET /api/networks/:id/schools - Get schools in network

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { SchoolDto } from '@/lib/api-types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const networkId = parseInt(params.id, 10);
    if (isNaN(networkId)) {
      return errorResponse('Invalid network ID', 400);
    }

    // member.isActive = the school is currently part of the network.
    // school.isActive = the school itself is operational (admin toggle).
    // Dropdowns that consume this endpoint should only see schools that
    // satisfy BOTH — membership active AND school active.
    const members = await prisma.schoolNetworkMember.findMany({
      where: {
        networkId,
        isActive: true,
        school: { isActive: true },
      },
      include: {
        school: true,
      },
    });

    const schoolsDto: SchoolDto[] = members.map((member) => ({
      id: member.school.id,
      code: member.school.code,
      name: member.school.name,
      nameTh: member.school.nameTh,
      address: member.school.address,
      province: member.school.province,
      district: member.school.district,
      isActive: member.school.isActive,
    }));

    return successResponse(schoolsDto);
  } catch (error) {
    return handleApiError(error);
  }
}

