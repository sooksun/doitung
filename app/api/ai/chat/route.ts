// app/api/ai/chat/route.ts
// POST /api/ai/chat — send a message to the in-app AI assistant.
// Body: { conversationId?: number, message: string }
// Grounds the answer on getKnowledgeBase() (indicators + theory) and the
// admin-editable 'chatbot' system prompt; persists both turns to ChatMessage.
// Gated by middleware (under /api/ai) + requireAuth (owner-scoped).

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireAuth } from '@/lib/api-utils';
import { generateText, friendlyAiError, type ChatTurn } from '@/lib/ai/client';
import { getSystemPrompt } from '@/lib/ai/prompt-config';
import { getKnowledgeBase } from '@/lib/ai/chat-knowledge';

const MAX_INPUT_CHARS = 4000;
const HISTORY_WINDOW = 10; // turns sent to the model (incl. the new question)

export async function POST(request: NextRequest) {
  try {
    const me = await requireAuth(request);
    const body = await request.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) return errorResponse('กรุณาพิมพ์คำถาม', 400);
    if (message.length > MAX_INPUT_CHARS) return errorResponse(`คำถามยาวเกินไป (จำกัด ${MAX_INPUT_CHARS} ตัวอักษร)`, 400);

    // Resolve / create the conversation (owner-scoped)
    let conversationId = Number(body.conversationId) || 0;
    if (conversationId) {
      const conv = await prisma.chatConversation.findUnique({ where: { id: conversationId }, select: { userId: true } });
      if (!conv || conv.userId !== me.id) return errorResponse('ไม่พบห้องสนทนา', 404);
    } else {
      const created = await prisma.chatConversation.create({
        data: { userId: me.id, title: message.slice(0, 60) },
        select: { id: true },
      });
      conversationId = created.id;
    }

    // Save the user's turn, then load the recent window for context
    await prisma.chatMessage.create({ data: { conversationId, role: 'user', content: message } });
    const recent = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_WINDOW,
      select: { role: true, content: true },
    });
    const history: ChatTurn[] = recent
      .reverse()
      .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

    // Ground on theory + indicators, answer, persist
    const [chatbotPrompt, knowledge] = await Promise.all([getSystemPrompt('chatbot'), getKnowledgeBase()]);
    const systemInstruction = `${chatbotPrompt}\n\n========== ฐานความรู้ของระบบ (ใช้ตอบคำถาม) ==========\n${knowledge}`;

    let answer: string;
    try {
      const { text } = await generateText({ systemInstruction, messages: history, maxOutputTokens: 4000 });
      answer = text;
    } catch (aiErr) {
      // Persist a friendly assistant message so the thread stays coherent, and surface the error
      const friendly = friendlyAiError(aiErr);
      await prisma.chatMessage.create({ data: { conversationId, role: 'assistant', content: `ขออภัย ระบบ AI ขัดข้องชั่วคราว: ${friendly}` } });
      await prisma.chatConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      return errorResponse(friendly, 502);
    }

    await prisma.chatMessage.create({ data: { conversationId, role: 'assistant', content: answer } });
    await prisma.chatConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

    return successResponse({ conversationId, answer });
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    return errorResponse(String(error?.message || error), 500);
  }
}
