// app/api/live-dashboard/route.ts
// GET /api/live-dashboard - Real-time aggregated data for Live Display Dashboard
// Supports scope: school | network | district. Counts non-ARCHIVED sessions (DRAFT included).

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, handleApiError, parseIntParam } from '@/lib/api-utils';

const Q_DIMENSIONS = [
  { key: 'Q-Leadership', labelTh: 'Q-Leadership ผู้บริหาร', order: 1 },
  { key: 'Q-PLC',        labelTh: 'Q-PLC ชุมชนแห่งการเรียนรู้', order: 2 },
  { key: 'Q-Learning',   labelTh: 'Q-Learning การจัดการเรียนรู้', order: 3 },
  { key: 'Q-Students',   labelTh: 'Q-Students ด้านนักเรียน', order: 4 },
];

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const scope = sp.get('scope') || 'district'; // school | network | district
    const schoolId = parseIntParam(sp, 'schoolId');
    const networkId = parseIntParam(sp, 'networkId');
    const academicYearId = parseIntParam(sp, 'academicYearId');
    const termId = parseIntParam(sp, 'termId');

    // Resolve scope → school filter
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
      const members = await prisma.schoolNetworkMember.findMany({
        where: { networkId, isActive: true },
        select: { schoolId: true },
      });
      const ids = members.map((m) => m.schoolId);
      if (ids.length) {
        schoolFilter = { schoolId: { in: ids } };
        participatingSchools = ids.length;
      } else {
        schoolFilter = { schoolId: -1 };
      }
      const network = await prisma.schoolNetwork.findUnique({
        where: { id: networkId },
        select: { name: true },
      });
      scopeLabel = network?.name || 'กลุ่มโรงเรียน';
    } else {
      participatingSchools = await prisma.school.count({ where: { isActive: true } });
    }

    const sessionWhere: any = {
      status: { not: 'ARCHIVED' },
      ...schoolFilter,
    };
    if (academicYearId) sessionWhere.academicYearId = academicYearId;
    if (termId) sessionWhere.termId = termId;

    // 1. Session counts → completion rate
    const totalSessions = await prisma.evaluationSession.count({ where: sessionWhere });
    const submittedSessions = await prisma.evaluationSession.count({
      where: { ...sessionWhere, status: { in: ['SUBMITTED', 'REVIEWED'] } },
    });
    const completionRate = totalSessions > 0
      ? Math.round((submittedSessions / totalSessions) * 100)
      : 0;

    const totalResponses = await prisma.evaluationResponse.count({
      where: { evaluationSession: sessionWhere },
    });

    // Active evaluators = sessions with activity in the last hour (count distinct evaluators)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSessions = await prisma.evaluationSession.findMany({
      where: {
        ...sessionWhere,
        OR: [
          { submittedAt: { gte: oneHourAgo } },
          { responses: { some: { createdAt: { gte: oneHourAgo } } } },
        ],
      },
      select: { evaluatorId: true },
    });
    const activeEvaluators = new Set(recentSessions.map((s) => s.evaluatorId)).size;

    // Q-Model instrument
    const qModel = await prisma.instrument.findFirst({
      where: { type: 'Q_MODEL' },
      include: {
        sections: true,
        indicators: { select: { id: true, sectionId: true, itemCode: true, minScore: true, maxScore: true, textTh: true, textEn: true } },
      },
    });

    // 2. Spider data + 3. Dimension scores per Q-Model dimension
    const spiderData: Array<{
      dimension: string;
      labelTh: string;
      current: number;        // avg score2 (1-5)
      target: number;         // avg score (1-5)
    }> = [];

    const dimensionScores: Array<{
      dimension: string;
      labelTh: string;
      percent: number;
      status: 'green' | 'yellow' | 'red';
      avgScore: number;          // avg score2 (1-5 scale, "current" / สภาพที่เป็นอยู่)
      maxScore: number;          // upper bound of indicator scale (5 for Q-Model)
    }> = [];

    if (!qModel) {
      for (const dim of Q_DIMENSIONS) {
        spiderData.push({ dimension: dim.key, labelTh: dim.labelTh, current: 0, target: 0 });
        dimensionScores.push({ dimension: dim.key, labelTh: dim.labelTh, percent: 0, status: 'red', avgScore: 0, maxScore: 5 });
      }
    } else {
      for (const dim of Q_DIMENSIONS) {
        const section = qModel.sections.find((s) => s.nameEn === dim.key);
        const indicators = section
          ? qModel.indicators.filter((i) => i.sectionId === section.id)
          : [];

        if (indicators.length === 0) {
          spiderData.push({ dimension: dim.key, labelTh: dim.labelTh, current: 0, target: 0 });
          dimensionScores.push({ dimension: dim.key, labelTh: dim.labelTh, percent: 0, status: 'red', avgScore: 0, maxScore: 5 });
          continue;
        }

        const indicatorIds = indicators.map((i) => i.id);

        // Aggregate score + score2 across all indicators in this section in one query
        const agg = await prisma.evaluationResponse.aggregate({
          where: {
            indicatorId: { in: indicatorIds },
            evaluationSession: { ...sessionWhere, instrumentId: qModel.id },
          },
          _avg: { score: true, score2: true },
        });

        const avgScore2 = agg._avg.score2 ?? 0;
        const avgScore = agg._avg.score ?? 0;

        spiderData.push({
          dimension: dim.key,
          labelTh: dim.labelTh,
          current: Math.round(avgScore2 * 10) / 10,
          target: Math.round(avgScore * 10) / 10,
        });

        // Per-indicator percent for this section, then average → dimension percent
        const perIndAggs = await Promise.all(
          indicators.map((ind) =>
            prisma.evaluationResponse.aggregate({
              where: {
                indicatorId: ind.id,
                evaluationSession: { ...sessionWhere, instrumentId: qModel.id },
              },
              _avg: { score2: true },
            })
          )
        );
        const percents: number[] = [];
        for (let i = 0; i < indicators.length; i++) {
          const ind = indicators[i];
          const avg = perIndAggs[i]._avg.score2;
          if (avg === null) continue;
          const range = ind.maxScore - ind.minScore;
          if (range <= 0) continue;
          percents.push(Math.max(0, Math.min(100, ((avg - ind.minScore) / range) * 100)));
        }
        const percent = percents.length
          ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length)
          : 0;
        let status: 'green' | 'yellow' | 'red' = 'red';
        if (percent >= 90) status = 'green';
        else if (percent >= 70) status = 'yellow';

        dimensionScores.push({
          dimension: dim.key,
          labelTh: dim.labelTh,
          percent,
          status,
          avgScore: Math.round(avgScore2 * 10) / 10,
          maxScore: indicators[0].maxScore,
        });
      }
    }

    // 4. Overall quality index — average non-zero dimensions
    let overallQualityIndex = 0;
    const nonZero = dimensionScores.filter((d) => d.percent > 0);
    if (nonZero.length > 0) {
      overallQualityIndex = Math.round(
        nonZero.reduce((s, d) => s + d.percent, 0) / nonZero.length
      );
    }

    // 5. Indicator health — ALL 47 Q-Model indicators with current state, ordered by
    // section (dimension order from Q_DIMENSIONS) then by item code / id.
    const indicatorHealth: Array<{
      code: string | null;
      nameTh: string;
      score: number | null;      // null = no data yet
      max: number;
      progress: number | null;
      sectionKey: string;
      sectionLabelTh: string;
    }> = [];

    if (qModel) {
      // Build section lookup → dimension info, with order matching Q_DIMENSIONS.
      // Indicators outside the 4 active dimensions are skipped (legacy sections).
      const sectionInfo = new Map<number, { key: string; labelTh: string; order: number }>();
      for (const sec of qModel.sections) {
        const dim = Q_DIMENSIONS.find((d) => d.key === sec.nameEn);
        if (dim) {
          sectionInfo.set(sec.id, { key: dim.key, labelTh: dim.labelTh, order: dim.order });
        }
      }

      const activeIndicators = qModel.indicators.filter(
        (ind) => ind.sectionId !== null && sectionInfo.has(ind.sectionId)
      );

      const stats = await Promise.all(
        activeIndicators.map(async (ind) => {
          const agg = await prisma.evaluationResponse.aggregate({
            where: {
              indicatorId: ind.id,
              evaluationSession: { ...sessionWhere, instrumentId: qModel.id },
            },
            _avg: { score2: true },
          });
          return { ind, avg: agg._avg.score2 };
        })
      );

      stats.sort((a, b) => {
        const aSec = a.ind.sectionId ? sectionInfo.get(a.ind.sectionId) : undefined;
        const bSec = b.ind.sectionId ? sectionInfo.get(b.ind.sectionId) : undefined;
        const aOrder = aSec?.order ?? 999;
        const bOrder = bSec?.order ?? 999;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.ind.id - b.ind.id;
      });

      for (const { ind, avg } of stats) {
        const range = ind.maxScore - ind.minScore;
        let progress: number | null = null;
        if (avg !== null && range > 0) {
          progress = Math.max(0, Math.min(100, Math.round(((avg - ind.minScore) / range) * 100)));
        }
        const sec = ind.sectionId ? sectionInfo.get(ind.sectionId) : undefined;
        indicatorHealth.push({
          code: ind.itemCode,
          nameTh: ind.textTh,
          score: avg !== null ? Math.round(avg * 10) / 10 : null,
          max: ind.maxScore,
          progress,
          sectionKey: sec?.key ?? '',
          sectionLabelTh: sec?.labelTh ?? '',
        });
      }
    }

    return successResponse({
      lastUpdated: new Date().toISOString(),
      scopeLabel,
      participatingSchools,
      totalSessions,
      totalResponses,
      activeEvaluators,
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
