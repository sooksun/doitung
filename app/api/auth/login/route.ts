// app/api/auth/login/route.ts
// POST /api/auth/login - User login

import { NextRequest } from 'next/server';
import { authenticateUser, generateToken } from '@/lib/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse('กรุณากรอกอีเมลและรหัสผ่าน', 400);
    }

    // Authenticate user
    const user = await authenticateUser(email, password);

    if (!user) {
      return errorResponse('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 401);
    }

    // Generate JWT token
    const token = generateToken(user);

    return successResponse(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
        },
      },
      'เข้าสู่ระบบสำเร็จ'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

