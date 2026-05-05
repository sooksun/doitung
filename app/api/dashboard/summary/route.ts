// app/api/dashboard/summary/route.ts
// GET /api/dashboard/summary
// completionRate = submitted/total (non-archived); overallQualityIndex = avg(score2 normalized) across Q-Model responses.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, handleApiError, parseIntParam } from '@/lib/api-utils';
import { DashboardSummaryDto } from '@/lib/api-types';

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

    const baseWhere: any = { ...schoolFilter };
    if (academicYearId) baseWhere.academicYearId = academicYearId;
    if (termId) baseWhere.termId = termId;

    const totalSessions = await prisma.evaluationSession.count({
      where: { ...baseWhere, status: { not: 'ARCHIVED' } },
    });
    const submittedSessions = await prisma.evaluationSession.count({
      where: { ...baseWhere, status: { in: ['SUBMITTED', 'REVIEWED'] } },
    });
    const completionRate = totalSessions > 0 ? (submittedSessions / totalSessions) * 100 : 0;

    // Overall quality index = avg of normalized score2 across all Q-Model responses
    const qModel = await prisma.instrument.findFirst({ where: { type: 'Q_MODEL' } });

    let overallQualityIndex = 0;
    if (qModel) {
      const responses = await prisma.evaluationResponse.findMany({
        where: {
          evaluationSession: {
            ...baseWhere,
            status: { not: 'ARCHIVED' },
            instrumentId: qModel.id,
          },
        },
        select: {
          score2: true,
          indicator: { select: { minScore: true, maxScore: true } },
        },
      });

      let total = 0;
      let count = 0;
      for (const r of responses) {
        if (r.score2 === null) continue;
        const range = r.indicator.maxScore - r.indicator.minScore;
        if (range <= 0) continue;
        total += ((r.score2 - r.indicator.minScore) / range) * 100;
        count++;
      }
      if (count > 0) overallQualityIndex = total / count;
    }

    const kpiCards: DashboardSummaryDto['kpiCards'] = [
      {
        label: 'อัตราการทำแบบประเมินสำเร็จ',
        value: Math.round(completionRate),
        unit: '%',
        status:
          completionRate >= 90 ? 'green'
          : completionRate >= 70 ? 'yellow'
          : 'red',
      },
      {
        label: 'ดัชนีคุณภาพโรงเรียนโดยรวม',
        value: Math.round(overallQualityIndex),
        unit: '%',
        status:
          overallQualityIndex >= 85 ? 'green'
          : overallQualityIndex >= 70 ? 'yellow'
          : 'red',
      },
    ];

    const summary: DashboardSummaryDto = {
      completionRate: Math.round(completionRate),
      overallQualityIndex: Math.round(overallQualityIndex),
      kpiCards,
    };

    return successResponse(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
