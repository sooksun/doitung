// app/api/networks/route.ts
// GET /api/networks - List networks

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { SchoolNetworkDto } from '@/lib/api-types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const networks = await prisma.schoolNetwork.findMany({
      where,
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const networksDto: SchoolNetworkDto[] = networks.map((network) => ({
      id: network.id,
      code: network.code,
      name: network.name,
      nameTh: network.nameTh,
      description: network.description,
      isActive: network.isActive,
      membersCount: network._count.members,
    }));

    return successResponse(networksDto);
  } catch (error) {
    return handleApiError(error);
  }
}

