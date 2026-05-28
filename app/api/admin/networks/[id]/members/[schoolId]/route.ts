// app/api/admin/networks/[id]/members/[schoolId]/route.ts
// Admin-only: remove a school from a network.
//
// DELETE /api/admin/networks/:id/members/:schoolId
//   - Soft remove by setting member.isActive=false. The row stays so joinedAt
//     history survives and re-adding via POST will reactivate the same row.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireRole } from '@/lib/api-utils';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; schoolId: string } }
) {
  try {
    await requireRole(request, 'ADMIN');

    const networkId = parseInt(params.id, 10);
    const schoolId = parseInt(params.schoolId, 10);
    if (isNaN(networkId) || isNaN(schoolId)) {
      return errorResponse('Invalid id', 400);
    }

    const member = await prisma.schoolNetworkMember.findUnique({
      where: { schoolId_networkId: { schoolId, networkId } },
    });

    if (!member) {
      return errorResponse('ไม่พบโรงเรียนในกลุ่มนี้', 404);
    }

    if (!member.isActive) {
      return successResponse({ memberId: member.id }, 'โรงเรียนถูกเอาออกจากกลุ่มอยู่แล้ว');
    }

    const updated = await prisma.schoolNetworkMember.update({
      where: { id: member.id },
      data: { isActive: false },
    });

    return successResponse({ memberId: updated.id }, 'เอาโรงเรียนออกจากกลุ่มเรียบร้อย');
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
