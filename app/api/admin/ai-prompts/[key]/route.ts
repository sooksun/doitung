// app/api/admin/ai-prompts/[key]/route.ts
// PATCH  — update a prompt override (system prompt text and/or enabled flag).
// DELETE — reset to the code default (remove the override row).
// ADMIN only. Both write an AuditLog entry (entityId=0; the key is in the payload).

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireRole } from '@/lib/api-utils';
import { isPromptKey, setSystemPrompt, resetSystemPrompt, listPromptConfigs } from '@/lib/ai/prompt-config';
import { logAudit } from '@/lib/audit';

function authStatus(error: any): number | null {
  if (typeof error?.message === 'string' && error.message.startsWith('Unauthorized')) return 401;
  if (typeof error?.message === 'string' && error.message.startsWith('Forbidden')) return 403;
  return null;
}

export async function PATCH(request: NextRequest, { params }: { params: { key: string } }) {
  try {
    const me = await requireRole(request, 'ADMIN');
    const key = params.key;
    if (!isPromptKey(key)) return errorResponse('ไม่พบ prompt ที่ระบุ', 400);

    const body = await request.json();
    const patch: { systemPrompt?: string; enabled?: boolean } = {};
    if (typeof body.systemPrompt === 'string') {
      if (!body.systemPrompt.trim()) {
        return errorResponse('ข้อความ prompt ต้องไม่ว่าง (กดปุ่มคืนค่าเริ่มต้นเพื่อกลับไปใช้ค่าระบบ)', 400);
      }
      patch.systemPrompt = body.systemPrompt;
    }
    if (typeof body.enabled === 'boolean') patch.enabled = body.enabled;
    if (Object.keys(patch).length === 0) return errorResponse('ไม่มีฟิลด์ที่จะอัปเดต', 400);

    const before = await prisma.aiPromptConfig.findUnique({ where: { key } });
    await setSystemPrompt(key, patch, me.id);
    const after = await prisma.aiPromptConfig.findUnique({ where: { key } });

    await logAudit({
      userId: me.id,
      action: 'AI_PROMPT_UPDATE',
      entityType: 'AiPromptConfig',
      entityId: 0,
      before: before ? { key, enabled: before.enabled, systemPrompt: before.systemPrompt } : { key, existed: false },
      after: after ? { key, enabled: after.enabled, systemPrompt: after.systemPrompt } : null,
    });

    const view = (await listPromptConfigs()).find((p) => p.key === key);
    return successResponse(view, 'บันทึกสำเร็จ');
  } catch (error: any) {
    const s = authStatus(error);
    if (s) return errorResponse(error.message, s);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { key: string } }) {
  try {
    const me = await requireRole(request, 'ADMIN');
    const key = params.key;
    if (!isPromptKey(key)) return errorResponse('ไม่พบ prompt ที่ระบุ', 400);

    const before = await prisma.aiPromptConfig.findUnique({ where: { key } });
    await resetSystemPrompt(key);

    await logAudit({
      userId: me.id,
      action: 'AI_PROMPT_RESET',
      entityType: 'AiPromptConfig',
      entityId: 0,
      before: before ? { key, enabled: before.enabled, systemPrompt: before.systemPrompt } : { key, existed: false },
      after: null,
    });

    const view = (await listPromptConfigs()).find((p) => p.key === key);
    return successResponse(view, 'คืนค่าเริ่มต้นแล้ว');
  } catch (error: any) {
    const s = authStatus(error);
    if (s) return errorResponse(error.message, s);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
