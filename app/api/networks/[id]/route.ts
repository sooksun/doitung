// app/api/networks/[id]/route.ts
// GET /api/networks/:id - Get network details

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { SchoolNetworkDto } from '@/lib/api-types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return errorResponse('Invalid network ID', 400);
    }

    const network = await prisma.schoolNetwork.findUnique({
      where: { id },
      include: {
        members: {
          where: { isActive: true },
          include: {
            school: {
              select: {
                id: true,
                code: true,
                name: true,
                nameTh: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!network) {
      return errorResponse('ไม่พบเครือข่ายที่ต้องการ', 404);
    }

    const networkDto: SchoolNetworkDto & { schools: any[] } = {
      id: network.id,
      code: network.code,
      name: network.name,
      nameTh: network.nameTh,
      description: network.description,
      isActive: network.isActive,
      membersCount: network._count.members,
      schools: network.members.map((m) => ({
        id: m.school.id,
        code: m.school.code,
        name: m.school.name,
        nameTh: m.school.nameTh,
      })),
    };

    return successResponse(networkDto);
  } catch (error) {
    return handleApiError(error);
  }
}

