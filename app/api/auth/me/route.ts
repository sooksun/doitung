// app/api/auth/me/route.ts
// GET /api/auth/me - Get current user (with bound school for teachers)

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken, extractTokenFromHeader } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return errorResponse('ไม่พบ token กรุณาเข้าสู่ระบบ', 401);
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return errorResponse('Token ไม่ถูกต้องหรือหมดอายุ', 401);
    }

    // Fetch the user's bound school via Teacher record (if any)
    const teacher = await prisma.teacher.findUnique({
      where: { userId: user.id },
      include: {
        school: { select: { id: true, code: true, nameTh: true, name: true } },
      },
    });

    return successResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      school: teacher?.school
        ? {
            id: teacher.school.id,
            code: teacher.school.code,
            nameTh: teacher.school.nameTh || teacher.school.name,
          }
        : null,
    });
  } catch {
    return errorResponse('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์', 500);
  }
}
