// app/api/admin/networks/[id]/members/route.ts
// Admin-only: list / add member schools of a school network.
//
// GET  /api/admin/networks/:id/members           - list all members (active+inactive) + the school metadata
// POST /api/admin/networks/:id/members { schoolId } - add a school. If a row already
//      exists (re-add after a previous remove) we flip isActive back on instead of
//      throwing on the @@unique([schoolId, networkId]).

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireRole } from '@/lib/api-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(request, 'ADMIN');

    const networkId = parseInt(params.id, 10);
    if (isNaN(networkId)) return errorResponse('Invalid network id', 400);

    const network = await prisma.schoolNetwork.findUnique({
      where: { id: networkId },
      select: { id: true },
    });
    if (!network) return errorResponse('ไม่พบกลุ่มโรงเรียน', 404);

    const members = await prisma.schoolNetworkMember.findMany({
      where: { networkId },
      orderBy: [{ isActive: 'desc' }, { joinedAt: 'desc' }],
      include: {
        school: {
          select: {
            id: true,
            code: true,
            name: true,
            nameTh: true,
            province: true,
            district: true,
            isActive: true,
          },
        },
      },
    });

    return successResponse({
      items: members.map((m) => ({
        memberId: m.id,
        joinedAt: m.joinedAt,
        isActive: m.isActive,
        school: m.school,
      })),
    });
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('Unauthorized')) {
      return errorResponse(error.message, 401);
    }
    if (typeof error?.message === 'string' && error.message.startsWith('Forbidden')) {
      return errorResponse(error.message, 403);
    }
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(request, 'ADMIN');

    const networkId = parseInt(params.id, 10);
    if (isNaN(networkId)) return errorResponse('Invalid network id', 400);

    const body = await request.json().catch(() => ({}));
    const schoolId = typeof body?.schoolId === 'number' ? body.schoolId : NaN;
    if (isNaN(schoolId)) return errorResponse('ต้องระบุ schoolId (number)', 400);

    const [network, school] = await Promise.all([
      prisma.schoolNetwork.findUnique({ where: { id: networkId }, select: { id: true } }),
      prisma.school.findUnique({ where: { id: schoolId }, select: { id: true, name: true, nameTh: true } }),
    ]);
    if (!network) return errorResponse('ไม่พบกลุ่มโรงเรียน', 404);
    if (!school) return errorResponse('ไม่พบโรงเรียน', 404);

    const existing = await prisma.schoolNetworkMember.findUnique({
      where: { schoolId_networkId: { schoolId, networkId } },
    });

    if (existing) {
      if (existing.isActive) {
        return errorResponse('โรงเรียนนี้อยู่ในกลุ่มอยู่แล้ว', 409);
      }
      const reactivated = await prisma.schoolNetworkMember.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
      return successResponse(
        { memberId: reactivated.id, schoolId, networkId },
        'เพิ่มโรงเรียนกลับเข้ากลุ่มแล้ว'
      );
    }

    const created = await prisma.schoolNetworkMember.create({
      data: { schoolId, networkId, isActive: true },
    });

    return successResponse(
      { memberId: created.id, schoolId, networkId },
      'เพิ่มโรงเรียนเข้ากลุ่มเรียบร้อย'
    );
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('Unauthorized')) {
      return errorResponse(error.message, 401);
    }
    if (typeof error?.message === 'string' && error.message.startsWith('Forbidden')) {
      return errorResponse(error.message, 403);
    }
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
