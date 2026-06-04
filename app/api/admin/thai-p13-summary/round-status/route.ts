// app/api/admin/thai-p13-summary/round-status/route.ts
// GET ?teacherId=&academicYearId=&round=1|2 — whether the school has finished
// (submitted + fully answered) this teacher's round, so the UI can show the gate
// state and enable/disable the "สร้างบทนิเทศ" button before the user clicks.
// (Static segment "round-status" takes precedence over the sibling [id] route.)

import { NextRequest } from 'next/server';
import { errorResponse, successResponse, requireAuth } from '@/lib/api-utils';
import { resolveThaiAccess, checkThaiScopeAccess } from '@/lib/thai-summary-access';
import { checkRoundComplete, type Round } from '@/lib/jobs/run-thai-p13-supervision';

export async function GET(request: NextRequest) {
  try {
    const me = await requireAuth(request);
    const acc = await resolveThaiAccess(me);
    if (!acc) return errorResponse('เฉพาะผู้ดูแลระบบหรือผู้อำนวยการเท่านั้น', 403);
    const sp = request.nextUrl.searchParams;
    const teacherId = Number(sp.get('teacherId'));
    const academicYearId = Number(sp.get('academicYearId'));
    const round = Number(sp.get('round')) === 2 ? 2 : 1;
    if (!Number.isFinite(teacherId) || teacherId <= 0) return errorResponse('teacherId ไม่ถูกต้อง', 400);
    if (!Number.isFinite(academicYearId) || academicYearId <= 0) return errorResponse('academicYearId ไม่ถูกต้อง', 400);

    const accErr = await checkThaiScopeAccess(acc, 'individual', teacherId);
    if (accErr) return errorResponse(accErr, 403);

    const status = await checkRoundComplete(teacherId, academicYearId, round as Round);
    return successResponse(status);
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse(String(error?.message || error), 500);
  }
}
