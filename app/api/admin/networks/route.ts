// app/api/admin/networks/route.ts
// Admin-only management of school networks (กลุ่มโรงเรียน).
//
// GET  /api/admin/networks  - list every network (active + inactive) with counts.
// POST /api/admin/networks  - create a new network.
//
// The public /api/networks endpoint stays read-only and is used by dropdowns;
// admin-side mutations live here so non-admin tokens cannot reach them.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireRole } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, 'ADMIN');

    const networks = await prisma.schoolNetwork.findMany({
      orderBy: [{ isActive: 'desc' }, { code: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        nameTh: true,
        description: true,
        isActive: true,
        createdAt: true,
        members: {
          where: { isActive: true },
          select: { id: true },
        },
        _count: {
          select: { members: true },
        },
      },
    });

    const items = networks.map((n) => ({
      id: n.id,
      code: n.code,
      name: n.name,
      nameTh: n.nameTh,
      description: n.description,
      isActive: n.isActive,
      createdAt: n.createdAt,
      activeMembersCount: n.members.length,
      totalMembersCount: n._count.members,
    }));

    return successResponse({
      items,
      total: items.length,
      activeCount: items.filter((n) => n.isActive).length,
      inactiveCount: items.filter((n) => !n.isActive).length,
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

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, 'ADMIN');

    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const nameTh = typeof body?.nameTh === 'string' ? body.nameTh.trim() : '';
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    const isActive = typeof body?.isActive === 'boolean' ? body.isActive : true;

    if (!name && !nameTh) {
      return errorResponse('ต้องระบุชื่อกลุ่ม (name หรือ nameTh)', 400);
    }

    if (code) {
      const dup = await prisma.schoolNetwork.findUnique({ where: { code } });
      if (dup) return errorResponse(`รหัส "${code}" ถูกใช้แล้ว`, 409);
    }

    const created = await prisma.schoolNetwork.create({
      data: {
        name: name || nameTh,
        nameTh: nameTh || null,
        code: code || null,
        description: description || null,
        isActive,
      },
      select: {
        id: true,
        code: true,
        name: true,
        nameTh: true,
        description: true,
        isActive: true,
        createdAt: true,
      },
    });

    return successResponse(
      {
        ...created,
        activeMembersCount: 0,
        totalMembersCount: 0,
      },
      'สร้างกลุ่มโรงเรียนเรียบร้อย'
    );
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
