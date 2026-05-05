// app/api/dashboard/spider-graph/route.ts
// GET /api/dashboard/spider-graph
// Returns 4 Q-Model dimensions with currentState (avg score2) and targetDesiredState (avg score), 1-5 scale.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, handleApiError, parseIntParam } from '@/lib/api-utils';

export interface SpiderGraphDataPoint {
  groupName: string;
  currentState: number;
  targetDesiredState: number;
}

const Q_DIMENSIONS = [
  { key: 'Q-Leadership', labelTh: 'Q-Leadership ผู้บริหาร', order: 1 },
  { key: 'Q-PLC',        labelTh: 'Q-PLC ชุมชนแห่งการเรียนรู้', order: 2 },
  { key: 'Q-Learning',   labelTh: 'Q-Learning การจัดการเรียนรู้', order: 3 },
  { key: 'Q-Students',   labelTh: 'Q-Students ด้านนักเรียน', order: 4 },
];

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const schoolId = parseIntParam(sp, 'schoolId');
    const networkId = parseIntParam(sp, 'networkId');
    const academicYearId = parseIntParam(sp, 'academicYearId');
    const termId = parseIntParam(sp, 'termId');

    let schoolFilter: { schoolId?: number | { in: number[] } } = {};
    if (schoolId) {
      schoolFilter = { schoolId };
    } else if (networkId) {
      const members = await prisma.schoolNetworkMember.findMany({
        where: { networkId, isActive: true },
        select: { schoolId: true },
      });
      const ids = members.map((m) => m.schoolId);
      schoolFilter = { schoolId: ids.length ? { in: ids } : -1 };
    }

    const sessionWhere: any = {
      status: { not: 'ARCHIVED' },
      ...schoolFilter,
    };
    if (academicYearId) sessionWhere.academicYearId = academicYearId;
    if (termId) sessionWhere.termId = termId;

    const qModel = await prisma.instrument.findFirst({
      where: { type: 'Q_MODEL' },
      include: {
        sections: true,
        indicators: { select: { id: true, sectionId: true } },
      },
    });

    const dataPoints: SpiderGraphDataPoint[] = [];

    if (!qModel) {
      for (const dim of Q_DIMENSIONS) {
        dataPoints.push({ groupName: dim.labelTh, currentState: 0, targetDesiredState: 0 });
      }
      return successResponse({ dataPoints });
    }

    for (const dim of Q_DIMENSIONS) {
      const section = qModel.sections.find((s) => s.nameEn === dim.key);
      const indicatorIds = section
        ? qModel.indicators.filter((i) => i.sectionId === section.id).map((i) => i.id)
        : [];

      if (indicatorIds.length === 0) {
        dataPoints.push({ groupName: dim.labelTh, currentState: 0, targetDesiredState: 0 });
        continue;
      }

      const agg = await prisma.evaluationResponse.aggregate({
        where: {
          indicatorId: { in: indicatorIds },
          evaluationSession: { ...sessionWhere, instrumentId: qModel.id },
        },
        _avg: { score: true, score2: true },
      });

      dataPoints.push({
        groupName: dim.labelTh,
        currentState: Math.round((agg._avg.score2 ?? 0) * 10) / 10,
        targetDesiredState: Math.round((agg._avg.score ?? 0) * 10) / 10,
      });
    }

    return successResponse({ dataPoints });
  } catch (error) {
    return handleApiError(error);
  }
}
