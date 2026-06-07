// app/api/ai/chat/conversations/route.ts
// GET /api/ai/chat/conversations — list the current user's chat conversations
// (most recently active first). Gated by middleware + requireAuth.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireAuth } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const me = await requireAuth(request);
    const items = await prisma.chatConversation.findMany({
      where: { userId: me.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, updatedAt: true },
    });
    return successResponse({ items });
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    return errorResponse(String(error?.message || error), 500);
  }
}
