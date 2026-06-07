// app/api/ai/chat/conversations/[id]/route.ts
// GET    — messages of one conversation (owner-scoped)
// DELETE — remove a conversation + its messages (owner-scoped, cascade)
// Gated by middleware (under /api/ai) + requireAuth.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireAuth } from '@/lib/api-utils';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireAuth(request);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return errorResponse('Invalid id', 400);

    const conv = await prisma.chatConversation.findUnique({
      where: { id },
      select: { id: true, userId: true, title: true },
    });
    if (!conv || conv.userId !== me.id) return errorResponse('ไม่พบห้องสนทนา', 404);

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true, createdAt: true },
    });
    return successResponse({ id: conv.id, title: conv.title, messages });
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    return errorResponse(String(error?.message || error), 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await requireAuth(request);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return errorResponse('Invalid id', 400);

    // Owner-scoped delete; cascade removes messages.
    const res = await prisma.chatConversation.deleteMany({ where: { id, userId: me.id } });
    if (res.count === 0) return errorResponse('ไม่พบห้องสนทนา', 404);
    return successResponse({ deleted: true });
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    return errorResponse(String(error?.message || error), 500);
  }
}
