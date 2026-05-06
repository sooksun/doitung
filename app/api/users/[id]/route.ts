// app/api/users/[id]/route.ts
// GET    /api/users/:id  - get user (self or admin)
// PATCH  /api/users/:id  - update name/email/phone (self or admin); isActive admin-only

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
  hasRole,
} from '@/lib/api-utils';

function permissionResponse(error: any) {
  if (typeof error?.message === 'string' && error.message.startsWith('Unauthorized')) {
    return Response.json({ success: false, error: error.message }, { status: 401 });
  }
  if (typeof error?.message === 'string' && error.message.startsWith('Forbidden')) {
    return Response.json({ success: false, error: error.message }, { status: 403 });
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await requireAuth(request);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return errorResponse('Invalid user ID', 400);

    if (me.id !== id && !hasRole(me, 'ADMIN')) {
      return errorResponse('Forbidden: คุณไม่มีสิทธิ์เข้าถึงข้อมูลผู้ใช้คนนี้', 403);
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        roles: { select: { role: { select: { name: true } } } },
        teacher: {
          select: {
            schoolId: true,
            school: { select: { id: true, code: true, nameTh: true, name: true } },
          },
        },
      },
    });

    if (!user) return errorResponse('ไม่พบผู้ใช้', 404);

    return successResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles.map((r) => r.role.name),
      school: user.teacher?.school
        ? {
            id: user.teacher.school.id,
            code: user.teacher.school.code,
            nameTh: user.teacher.school.nameTh || user.teacher.school.name,
          }
        : null,
    });
  } catch (error) {
    const r = permissionResponse(error);
    if (r) return r;
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await requireAuth(request);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return errorResponse('Invalid user ID', 400);

    const isAdmin = hasRole(me, 'ADMIN');
    const isSelf = me.id === id;
    if (!isSelf && !isAdmin) {
      return errorResponse('Forbidden: คุณไม่มีสิทธิ์แก้ไขผู้ใช้คนนี้', 403);
    }

    const body = await request.json();
    const data: any = {};

    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (!name) return errorResponse('ชื่อต้องไม่ว่าง', 400);
      data.name = name;
    }

    if (typeof body.email === 'string') {
      const email = body.email.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return errorResponse('รูปแบบอีเมลไม่ถูกต้อง', 400);
      }
      // Uniqueness check (exclude current user)
      const dup = await prisma.user.findFirst({
        where: { email, NOT: { id } },
        select: { id: true },
      });
      if (dup) return errorResponse('อีเมลนี้ถูกใช้แล้ว', 409);
      data.email = email;
    }

    if (body.phone === null || body.phone === '') {
      data.phone = null;
    } else if (typeof body.phone === 'string') {
      data.phone = body.phone.trim();
    }

    // isActive — admin only
    if (typeof body.isActive === 'boolean') {
      if (!isAdmin) {
        return errorResponse('Forbidden: เฉพาะ admin เท่านั้นที่เปลี่ยนสถานะใช้งานได้', 403);
      }
      data.isActive = body.isActive;
    }

    if (Object.keys(data).length === 0) {
      return errorResponse('ไม่มีข้อมูลที่ต้องอัปเดต', 400);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        updatedAt: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    });

    return successResponse({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      phone: updated.phone,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt,
      roles: updated.roles.map((r) => r.role.name),
    }, 'บันทึกข้อมูลสำเร็จ');
  } catch (error) {
    const r = permissionResponse(error);
    if (r) return r;
    return handleApiError(error);
  }
}
