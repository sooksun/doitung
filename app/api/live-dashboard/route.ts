// app/api/live-dashboard/route.ts
// GET /api/live-dashboard - Real-time aggregated data for Live Display Dashboard
// Supports scope: school | network | district

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, handleApiError, parseIntParam } from '@/lib/api-utils';

const Q_DIMENSIONS = [
  { dimension: 'Q-Leadership', labelTh: 'Q-Leadership (ภาวะผู้นำ)', order: 1 },
  { dimension: 'Q-PLC', labelTh: 'Q-PLC (ชุมชนแห่งการเรียนรู้)', order: 2 },
  { dimension: 'Q-Learning', labelTh: 'Q-Learning (การจัดการเรียนรู้)', order: 3 },
  { dimension: 'Q-Goal', labelTh: 'Q-Goal (เป้าหมายโรงเรียน)', order: 4 },
  { dimension: 'Q-Info', labelTh: 'Q-Info (ระบบสารสนเทศ)', order: 5 },
  { dimension: 'Q-Network', labelTh: 'Q-Network (เครือข่าย)', order: 6 },
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scope = searchParams.get('scope') || 'district'; // school | network | district
    const schoolId = parseIntParam(searchParams, 'schoolId');
    const networkId = parseIntParam(searchParams, 'networkId');
    const academicYearId = parseIntParam(searchParams, 'academicYearId');
    const termId = parseIntParam(searchParams, 'termId');

    // Build school filter based on scope
    let schoolFilter: { schoolId?: number | { in: number[] } } = {};
    let participatingSchools = 0;
    let scopeLabel = 'เขตพื้นที่การศึกษาทั้งหมด';

    if (scope === 'school' && schoolId) {
      schoolFilter = { schoolId };
      participatingSchools = 1;
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { nameTh: true },
      });
      scopeLabel = school?.nameTh || 'โรงเรียน';
    } else if (scope === 'network' && networkId) {
      const networkMembers = await prisma.schoolNetworkMember.findMany({
        where: { networkId, isActive: true },
        select: { schoolId: true },
      });
      const schoolIds = networkMembers.map((m) => m.schoolId);
      if (schoolIds.length > 0) {
        schoolFilter = { schoolId: { in: schoolIds } };
        participatingSchools = schoolIds.length;
      } else {
        schoolFilter = { schoolId: -1 }; // No schools
      }
      const network = await prisma.schoolNetwork.findUnique({
        where: { id: networkId },
        select: { name: true },
      });
      scopeLabel = network?.name || 'กลุ่มโรงเรียน';
    } else {
      // district — all schools
      const allSchools = await prisma.school.count({ where: { isActive: true } });
      participatingSchools = allSchools;
      scopeLabel = 'เขตพื้นที่การศึกษาทั้งหมด';
    }

    // Build session filter
    const sessionWhere: any = {
      status: 'SUBMITTED',
      ...schoolFilter,
    };
    if (academicYearId) sessionWhere.academicYearId = academicYearId;
    if (termId) sessionWhere.termId = termId;

    // 1. Completion Rate
    const totalSessions = await prisma.evaluationSession.count({ where: sessionWhere });
    const completionRate = totalSessions > 0 ? 100 : 0; // all fetched are SUBMITTED

    // Count total responses
    const totalResponses = await prisma.evaluationResponse.count({
      where: { evaluationSession: sessionWhere },
    });

    // Count active evaluators (users who submitted within last 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSessions = await prisma.evaluationSession.count({
      where: {
        ...sessionWhere,
        updatedAt: { gte: oneHourAgo },
      },
    });

    // 2. Spider Graph Data (from OKRActionRatings per dimension)
    const spiderData: Array<{
      dimension: string;
      labelTh: string;
      current: number;
      target: number;
    }> = [];

    const okrWhere: any = {
      status: { not: 'ARCHIVED' },
    };
    if (scope === 'school' && schoolId) okrWhere.schoolId = schoolId;
    if (scope === 'network' && networkId) okrWhere.networkId = networkId;
    if (academicYearId) okrWhere.academicYearId = academicYearId;

    for (const dim of Q_DIMENSIONS) {
      const objectives = await prisma.oKRObjective.findMany({
        where: { ...okrWhere, dimension: dim.dimension },
        include: {
          keyResults: {
            include: {
              actions: {
                select: {
                  id: true,
                  targetDesiredState: true,
                  ratings: {
                    where: {
                      ...(scope === 'school' && schoolId ? { schoolId } : {}),
                      ...(academicYearId ? { academicYearId } : {}),
                      ...(termId ? { termId } : {}),
                    },
                    orderBy: { evaluatedAt: 'desc' },
                    take: 1,
                    select: { currentState: true },
                  },
                },
              },
            },
          },
        },
      });

      const allActions: Array<{
        targetDesiredState: number | null;
        latestCurrentState: number | null;
      }> = [];

      for (const obj of objectives) {
        for (const kr of obj.keyResults) {
          for (const action of kr.actions) {
            const latestRating = action.ratings.length > 0 ? action.ratings[0] : null;
            allActions.push({
              targetDesiredState: action.targetDesiredState,
              latestCurrentState: latestRating ? latestRating.currentState : null,
            });
          }
        }
      }

      const withCurrent = allActions.filter((a) => a.latestCurrentState !== null);
      const withTarget = allActions.filter((a) => a.targetDesiredState !== null);

      const avgCurrent =
        withCurrent.length > 0
          ? withCurrent.reduce((s, a) => s + (a.latestCurrentState || 0), 0) / withCurrent.length
          : 0;
      const avgTarget =
        withTarget.length > 0
          ? withTarget.reduce((s, a) => s + (a.targetDesiredState || 0), 0) / withTarget.length
          : 0;

      spiderData.push({
        dimension: dim.dimension,
        labelTh: dim.labelTh,
        current: Math.round(avgCurrent * 10) / 10,
        target: Math.round(avgTarget * 10) / 10,
      });
    }

    // 3. Dimension progress (percent-based from EvaluationResponses)
    const qModelInstrument = await prisma.instrument.findFirst({
      where: { type: 'Q_MODEL' },
      include: {
        sections: true,
      },
    });

    const dimensionScores: Array<{
      dimension: string;
      labelTh: string;
      percent: number;
      status: 'green' | 'yellow' | 'red';
    }> = [];

    if (qModelInstrument) {
      const allIndicators = await prisma.indicator.findMany({
        where: { instrumentId: qModelInstrument.id },
        select: { id: true, sectionId: true, minScore: true, maxScore: true },
      });

      for (const dim of Q_DIMENSIONS) {
        const section = qModelInstrument.sections.find((s) => s.nameTh.includes(dim.dimension));
        if (!section) {
          dimensionScores.push({ dimension: dim.dimension, labelTh: dim.labelTh, percent: 0, status: 'red' });
          continue;
        }

        const indicators = allIndicators.filter((ind) => ind.sectionId === section.id);
        if (indicators.length === 0) {
          dimensionScores.push({ dimension: dim.dimension, labelTh: dim.labelTh, percent: 0, status: 'red' });
          continue;
        }

        const avgResults = await Promise.all(
          indicators.map((ind) =>
            prisma.evaluationResponse.aggregate({
              where: {
                indicatorId: ind.id,
                evaluationSession: { ...sessionWhere, instrumentId: qModelInstrument.id },
              },
              _avg: { score: true },
            })
          )
        );

        const percents: number[] = [];
        for (let i = 0; i < indicators.length; i++) {
          const avg = avgResults[i]._avg.score;
          if (!avg) continue;
          const ind = indicators[i];
          const range = ind.maxScore - ind.minScore;
          if (range > 0) {
            percents.push(Math.max(0, Math.min(100, ((avg - ind.minScore) / range) * 100)));
          }
        }

        const percent = percents.length > 0
          ? percents.reduce((a, b) => a + b, 0) / percents.length
          : 0;

        let status: 'green' | 'yellow' | 'red' = 'red';
        if (percent >= 90) status = 'green';
        else if (percent >= 70) status = 'yellow';

        dimensionScores.push({
          dimension: dim.dimension,
          labelTh: dim.labelTh,
          percent: Math.round(percent),
          status,
        });
      }
    }

    // 4. Overall quality index
    let overallQualityIndex = 0;
    if (dimensionScores.length > 0) {
      const nonZero = dimensionScores.filter((d) => d.percent > 0);
      if (nonZero.length > 0) {
        overallQualityIndex = Math.round(
          nonZero.reduce((s, d) => s + d.percent, 0) / nonZero.length
        );
      }
    }

    // 5. Indicator Health (top-level indicators from Q_MODEL)
    const indicatorHealth: Array<{
      name: string;
      nameTh: string;
      score: number;
      max: number;
      progress: number;
    }> = [];

    if (qModelInstrument) {
      const topIndicators = await prisma.indicator.findMany({
        where: { instrumentId: qModelInstrument.id },
        orderBy: { id: 'asc' },
        take: 8,
        select: { id: true, textTh: true, textEn: true, minScore: true, maxScore: true },
      });

      for (const ind of topIndicators) {
        const avgResult = await prisma.evaluationResponse.aggregate({
          where: {
            indicatorId: ind.id,
            evaluationSession: { ...sessionWhere, instrumentId: qModelInstrument.id },
          },
          _avg: { score: true },
        });

        const avg = avgResult._avg.score || 0;
        const range = ind.maxScore - ind.minScore;
        const progress = range > 0 ? Math.round(((avg - ind.minScore) / range) * 100) : 0;

        indicatorHealth.push({
          name: ind.textEn || ind.textTh,
          nameTh: ind.textTh,
          score: Math.round(avg * 10) / 10,
          max: ind.maxScore,
          progress: Math.max(0, Math.min(100, progress)),
        });
      }
    }

    return successResponse({
      lastUpdated: new Date().toISOString(),
      scopeLabel,
      participatingSchools,
      totalSessions,
      totalResponses,
      activeEvaluators: recentSessions,
      completionRate,
      overallQualityIndex,
      spiderData,
      dimensionScores,
      indicatorHealth,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
