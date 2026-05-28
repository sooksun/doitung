// app/api/admin/networks/[id]/route.ts
// Admin-only: edit / toggle / delete a school network.
//
// PATCH  /api/admin/networks/:id  - update name, nameTh, code, description, isActive
// DELETE /api/admin/networks/:id  - hard delete (only when no member rows exist)
//
// We do NOT cascade members on delete because joining rows carry history (joinedAt).
// If the network has members, the client should toggle isActive=false instead.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireRole } from '@/lib/api-utils';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(request, 'ADMIN');

    const id = parseInt(params.id, 10);
    if (isNaN(id)) return errorResponse('Invalid network id', 400);

    const body = await request.json().catch(() => ({}));

    const before = await prisma.schoolNetwork.findUnique({ where: { id } });
    if (!before) return errorResponse('ไม่พบกลุ่มโรงเรียน', 404);

    const data: Record<string, any> = {};

    if (typeof body?.name === 'string') {
      const v = body.name.trim();
      if (!v) return errorResponse('name ต้องไม่ว่าง', 400);
      data.name = v;
    }
    if (body?.nameTh === null) {
      data.nameTh = null;
    } else if (typeof body?.nameTh === 'string') {
      data.nameTh = body.nameTh.trim() || null;
    }
    if (body?.code === null) {
      data.code = null;
    } else if (typeof body?.code === 'string') {
      const v = body.code.trim();
      if (v && v !== before.code) {
        const dup = await prisma.schoolNetwork.findUnique({ where: { code: v } });
        if (dup) return errorResponse(`รหัส "${v}" ถูกใช้แล้ว`, 409);
      }
      data.code = v || null;
    }
    if (body?.description === null) {
      data.description = null;
    } else if (typeof body?.description === 'string') {
      data.description = body.description.trim() || null;
    }
    if (typeof body?.isActive === 'boolean') {
      data.isActive = body.isActive;
    }

    if (Object.keys(data).length === 0) {
      return errorResponse('ไม่มีข้อมูลที่ต้องอัปเดต', 400);
    }

    const after = await prisma.schoolNetwork.update({
      where: { id },
      data,
      select: {
        id: true,
        code: true,
        name: true,
        nameTh: true,
        description: true,
        isActive: true,
      },
    });

    return successResponse(after, 'บันทึกเรียบร้อย');
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('Unauthorized')) {
      return errorResponse(error.message, 401);
    }
    if (typeof error?.message === 'string' && error.message.startsWith('Forbidden')) {
      return errorResponse(error.message, 403);
    }
    if (error?.code === 'P2002') {
      return errorResponse('รหัสกลุ่มซ้ำกับที่มีอยู่แล้ว', 409);
    }
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(request, 'ADMIN');

    const id = parseInt(params.id, 10);
    if (isNaN(id)) return errorResponse('Invalid network id', 400);

    const network = await prisma.schoolNetwork.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: { where: { isActive: true } },
          },
        },
      },
    });
    if (!network) return errorResponse('ไม่พบกลุ่มโรงเรียน', 404);

    if (network._count.members > 0) {
      return errorResponse(
        `กลุ่มนี้มีโรงเรียนสมาชิก ${network._count.members} แห่ง — ลบสมาชิกออกก่อน หรือใช้การปิดใช้งานแทน`,
        409
      );
    }

    // No active members. Soft-removed member rows (isActive=false) are tombstones
    // with no semantic value once the network is gone — drop them in the same tx
    // so the parent delete doesn't trip the FK.
    await prisma.$transaction([
      prisma.schoolNetworkMember.deleteMany({ where: { networkId: id } }),
      prisma.schoolNetwork.delete({ where: { id } }),
    ]);

    return successResponse({ id }, 'ลบกลุ่มโรงเรียนเรียบร้อย');
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('Unauthorized')) {
      return errorResponse(error.message, 401);
    }
    if (typeof error?.message === 'string' && error.message.startsWith('Forbidden')) {
      return errorResponse(error.message, 403);
    }
    // FK constraint — there's likely an OKRObjective referencing this network
    if (error?.code === 'P2003') {
      return errorResponse('ลบไม่ได้: ยังมีข้อมูลอื่นอ้างถึงกลุ่มนี้ ใช้การปิดใช้งานแทน', 409);
    }
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
