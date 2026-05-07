// app/api/admin/sar-documents/[id]/route.ts
// GET    /api/admin/sar-documents/:id - detail with versions and pages summary
// DELETE /api/admin/sar-documents/:id - archive (status = ARCHIVED), keeps file on disk

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, requireAuth, hasRole } from '@/lib/api-utils';
import { logAudit } from '@/lib/audit';

async function checkAccess(userId: number, schoolId: number, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true;
  const t = await prisma.teacher.findUnique({ where: { userId } });
  return !!t && t.schoolId === schoolId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await requireAuth(request);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return errorResponse('Invalid id', 400);

    const doc = await prisma.sarDocument.findUnique({
      where: { id },
      include: {
        academicYear: { select: { id: true, year: true } },
        school: { select: { id: true, code: true, nameTh: true, name: true } },
        uploadedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        versions: {
          orderBy: { versionNo: 'desc' },
          select: {
            id: true,
            versionNo: true,
            createdAt: true,
            changeNote: true,
            createdBy: { select: { name: true } },
          },
        },
        _count: { select: { pages: true } },
      },
    });
    if (!doc) return errorResponse('ไม่พบเอกสาร', 404);

    if (!(await checkAccess(me.id, doc.schoolId, hasRole(me, 'ADMIN')))) {
      return errorResponse('Forbidden', 403);
    }

    return successResponse({
      id: doc.id,
      schoolId: doc.schoolId,
      schoolCode: doc.school?.code,
      schoolName: doc.school?.nameTh || doc.school?.name,
      academicYearId: doc.academicYearId,
      academicYear: doc.academicYear?.year,
      level: doc.level,
      originalFilename: doc.originalFilename,
      filePath: doc.filePath,
      hasFile: !!doc.filePath,
      bodyText: doc.bodyText,
      hasBodyText: !!doc.bodyText,
      bodyIceberg: (doc as any).bodyIceberg ?? null,
      hasIceberg: !!(doc as any).bodyIceberg,
      status: doc.status,
      extractionMethod: doc.extractionMethod,
      textQualityScore: doc.textQualityScore,
      pageCount: doc.pageCount,
      pagesStored: doc._count.pages,
      uploadedBy: doc.uploadedBy,
      approvedBy: doc.approvedBy,
      approvedAt: doc.approvedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      errorMessage: doc.errorMessage,
      versions: doc.versions,
    });
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await requireAuth(request);
    if (!hasRole(me, 'ADMIN')) return errorResponse('Forbidden: เฉพาะ admin', 403);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return errorResponse('Invalid id', 400);

    const before = await prisma.sarDocument.findUnique({ where: { id } });
    if (!before) return errorResponse('ไม่พบเอกสาร', 404);

    const after = await prisma.sarDocument.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    await logAudit({
      userId: me.id,
      action: 'SAR_ARCHIVE',
      entityType: 'SarDocument',
      entityId: id,
      before: { status: before.status },
      after: { status: after.status },
    });

    return successResponse({ id, status: after.status }, 'เก็บถาวรสำเร็จ');
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    if (error?.message?.startsWith('Forbidden')) return errorResponse(error.message, 403);
    return errorResponse('เกิดข้อผิดพลาด', 500);
  }
}
