// app/api/users/[id]/password/route.ts
// POST /api/users/:id/password — change a user's password.
//
// Rules:
//   - Self: must supply `currentPassword` and `newPassword`.
//   - Admin editing someone else: only `newPassword` required (admin reset).
//   - Admin editing self: still treated as "self" — currentPassword is required,
//     so a stolen admin token can't silently swap the password without it.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAuth,
  hasRole,
} from '@/lib/api-utils';
import { hashPassword, verifyPassword } from '@/lib/auth';

const MIN_PASSWORD_LENGTH = 8;

function permissionResponse(error: any) {
  if (typeof error?.message === 'string' && error.message.startsWith('Unauthorized')) {
    return Response.json({ success: false, error: error.message }, { status: 401 });
  }
  if (typeof error?.message === 'string' && error.message.startsWith('Forbidden')) {
    return Response.json({ success: false, error: error.message }, { status: 403 });
  }
  return null;
}

export async function POST(
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
      return errorResponse('Forbidden: คุณไม่มีสิทธิ์เปลี่ยนรหัสผ่านของผู้ใช้คนนี้', 403);
    }

    const body = await request.json().catch(() => ({}));
    const currentPassword: unknown = body?.currentPassword;
    const newPassword: unknown = body?.newPassword;

    if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
      return errorResponse(`รหัสผ่านใหม่ต้องยาวอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`, 400);
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { password: true },
    });
    if (!target) return errorResponse('ไม่พบผู้ใช้', 404);

    // Self path — verify current password. Admin-on-someone-else skips this.
    if (isSelf) {
      if (typeof currentPassword !== 'string' || currentPassword.length === 0) {
        return errorResponse('กรุณากรอกรหัสผ่านปัจจุบัน', 400);
      }
      const ok = await verifyPassword(currentPassword, target.password);
      if (!ok) return errorResponse('รหัสผ่านปัจจุบันไม่ถูกต้อง', 400);
      if (currentPassword === newPassword) {
        return errorResponse('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน', 400);
      }
    }

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id },
      data: { password: hashed },
    });

    return successResponse({ id }, 'เปลี่ยนรหัสผ่านสำเร็จ');
  } catch (error) {
    const r = permissionResponse(error);
    if (r) return r;
    return handleApiError(error);
  }
}
