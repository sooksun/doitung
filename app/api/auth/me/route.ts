// app/api/auth/me/route.ts
// GET /api/auth/me - Get current user

import { NextRequest } from 'next/server';
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

    return successResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
    });
  } catch (error) {
    return errorResponse('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์', 500);
  }
}

