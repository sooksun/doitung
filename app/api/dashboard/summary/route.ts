// app/api/dashboard/summary/route.ts
// GET /api/dashboard/summary - Overall dashboard summary

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, parseIntParam } from '@/lib/api-utils';
import { DashboardSummaryDto } from '@/lib/api-types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolId = parseIntParam(searchParams, 'schoolId');
    const networkId = parseIntParam(searchParams, 'networkId');
    const academicYearId = parseIntParam(searchParams, 'academicYearId');
    const termId = parseIntParam(searchParams, 'termId');

    // Build filters
    const sessionWhere: any = {
      status: 'SUBMITTED',
    };
    if (academicYearId) sessionWhere.academicYearId = academicYearId;
    if (termId) sessionWhere.termId = termId;

    if (schoolId) {
      sessionWhere.schoolId = schoolId;
    } else if (networkId) {
      const networkMembers = await prisma.schoolNetworkMember.findMany({
        where: { networkId, isActive: true },
        select: { schoolId: true },
      });
      const schoolIds = networkMembers.map((m) => m.schoolId);
      if (schoolIds.length === 0) {
        sessionWhere.schoolId = -1; // No schools
      } else {
        sessionWhere.schoolId = { in: schoolIds };
      }
    }

    // Calculate completion rate
    const totalSessions = await prisma.evaluationSession.count({
      where: sessionWhere,
    });
    const submittedSessions = await prisma.evaluationSession.count({
      where: {
        ...sessionWhere,
        status: 'SUBMITTED',
      },
    });
    const completionRate = totalSessions > 0 ? (submittedSessions / totalSessions) * 100 : 0;

    // Calculate overall quality index (average of all Q-Model dimensions)
    // OPTIMIZED: Use aggregate query instead of loading all sessions
    const qModelInstrument = await prisma.instrument.findFirst({
      where: { type: 'Q_MODEL' },
    });

    let overallQualityIndex = 0;
    if (qModelInstrument) {
      // Get all Q-Model responses with their indicators in one query
      const responses = await prisma.evaluationResponse.findMany({
        where: {
          evaluationSession: {
            ...sessionWhere,
            instrumentId: qModelInstrument.id,
          },
        },
        include: {
          indicator: {
            select: {
              minScore: true,
              maxScore: true,
            },
          },
        },
      });

      if (responses.length > 0) {
        let totalPercent = 0;
        let count = 0;

        for (const response of responses) {
          const indicator = response.indicator;
          const scoreRange = indicator.maxScore - indicator.minScore;
          if (scoreRange > 0) {
            const percent =
              ((response.score - indicator.minScore) / scoreRange) * 100;
            totalPercent += percent;
            count++;
          }
        }

        if (count > 0) {
          overallQualityIndex = totalPercent / count;
        }
      }
    }

    // KPI Cards
    const kpiCards: DashboardSummaryDto['kpiCards'] = [
      {
        label: 'อัตราการทำแบบประเมินสำเร็จ',
        value: Math.round(completionRate),
        unit: '%',
        status:
          completionRate >= 90
            ? ('green' as const)
            : completionRate >= 70
            ? ('yellow' as const)
            : ('red' as const),
      },
      {
        label: 'ดัชนีคุณภาพโรงเรียนโดยรวม',
        value: Math.round(overallQualityIndex),
        unit: '%',
        status:
          overallQualityIndex >= 85
            ? ('green' as const)
            : overallQualityIndex >= 70
            ? ('yellow' as const)
            : ('red' as const),
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

