// middleware.ts
// Next.js middleware for authentication

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = ['/api/auth/login', '/api/auth/register'];

// Protected API routes
//
// `/api/sticky-notes` and `/api/sticky-boards` are intentionally NOT in this
// list — they need to accept guest traffic (anyone with a board's shareKey can
// post / read notes via a guest token). The handlers themselves call
// requireAuth for the owner-only operations (close board, clear board,
// get-or-create).
const protectedApiRoutes = [
  '/api/instruments',
  '/api/evaluations',
  '/api/dashboard',
  '/api/networks',
  '/api/users',
  '/api/admin',
  '/api/ai',
  '/api/feature-flags',
  '/api/schools',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if it's a protected API route
  const isProtectedApiRoute = protectedApiRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedApiRoute) {
    // Check for Authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: กรุณาเข้าสู่ระบบ',
        },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

