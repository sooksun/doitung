// lib/api-utils.ts
// Utility functions for API routes

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from './api-types';
import { getUserFromToken, extractTokenFromHeader, AuthUser } from './auth';

/**
 * Create a successful API response
 */
export function successResponse<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
  });
}

/**
 * Create an error API response
 */
export function errorResponse(
  error: string | Error,
  status: number = 400
): NextResponse<ApiResponse<null>> {
  const errorMessage = error instanceof Error ? error.message : error;
  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
    },
    { status }
  );
}

/**
 * Handle API route errors consistently
 */
export function handleApiError(error: unknown): NextResponse<ApiResponse<null>> {
  console.error('API Error:', error);

  if (error instanceof Error) {
    // Prisma errors
    if (error.name === 'PrismaClientKnownRequestError') {
      return errorResponse('ข้อมูลไม่ถูกต้องหรือไม่พบข้อมูลที่ต้องการ', 404);
    }
    if (error.name === 'PrismaClientValidationError') {
      return errorResponse('ข้อมูลที่ส่งมาไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง', 400);
    }
    return errorResponse(error.message, 500);
  }

  return errorResponse('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ', 500);
}

/**
 * Parse query parameters for pagination
 */
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Parse optional integer from query params
 */
export function parseIntParam(
  searchParams: URLSearchParams,
  key: string
): number | undefined {
  const value = searchParams.get(key);
  return value ? parseInt(value, 10) : undefined;
}

/**
 * Get current user from request (from JWT token)
 */
export async function getCurrentUser(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return null;
  }

  return getUserFromToken(token);
}

/**
 * Check if user has required role
 */
export function hasRole(user: AuthUser, role: string): boolean {
  return user.roles.includes(role as any);
}

/**
 * Require authentication
 */
export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new Error('Unauthorized: กรุณาเข้าสู่ระบบ');
  }
  return user;
}

/**
 * Require specific role
 */
export async function requireRole(
  request: NextRequest,
  role: string
): Promise<AuthUser> {
  const user = await requireAuth(request);
  if (!hasRole(user, role)) {
    throw new Error(`Forbidden: คุณไม่มีสิทธิ์เข้าถึง (ต้องมี role: ${role})`);
  }
  return user;
}

