// app/api/admin/ai-prompts/route.ts
// GET /api/admin/ai-prompts — list all manageable AI system prompts (ADMIN only).
// Returns the registry merged with stored overrides (default + override + active).

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, requireRole } from '@/lib/api-utils';
import { listPromptConfigs } from '@/lib/ai/prompt-config';

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, 'ADMIN');
    const items = await listPromptConfigs();
    return successResponse({ items, total: items.length });
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('Unauthorized')) {
      return errorResponse(error.message, 401);
    }
    if (typeof error?.message === 'string' && error.message.startsWith('Forbidden')) {
      return errorResponse(error.message, 403);
    }
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
