// app/api/dashboard/q-model/route.ts
// GET /api/dashboard/q-model
// Per-dimension progress: current = avg(score2 normalized), target = avg(score normalized), progress = current/target.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, handleApiError, parseIntParam } from '@/lib/api-utils';
import { QModelDimensionProgressDto } from '@/lib/api-types';

const Q_DIMENSIONS = [
  { key: 'Q-Leadership', labelTh: 'Q-Leadership ผู้บริหาร' },
  { key: 'Q-PLC',        labelTh: 'Q-PLC ชุมชนแห่งการเรียนรู้' },
  { key: 'Q-Learning',   labelTh: 'Q-Learning การจัดการเรียนรู้' },
  { key: 'Q-Students',   labelTh: 'Q-Students ด้านนักเรียน' },
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
        indicators: { select: { id: true, sectionId: true, minScore: true, maxScore: true } },
      },
    });

    const dimensionProgress: QModelDimensionProgressDto[] = [];

    const emptyRow = (dim: typeof Q_DIMENSIONS[number]) => ({
      dimension: dim.key,
      labelTh: dim.labelTh,
      current: 0,
      target: 0,
      progress: 0,
      status: 'red' as const,
    });

    if (!qModel) {
      for (const dim of Q_DIMENSIONS) dimensionProgress.push(emptyRow(dim));
      return successResponse({ dimensionProgress });
    }

    for (const dim of Q_DIMENSIONS) {
      const section = qModel.sections.find((s) => s.nameEn === dim.key);
      const indicators = section
        ? qModel.indicators.filter((i) => i.sectionId === section.id)
        : [];

      if (indicators.length === 0) {
        dimensionProgress.push(emptyRow(dim));
        continue;
      }

      const aggregates = await Promise.all(
        indicators.map((ind) =>
          prisma.evaluationResponse.aggregate({
            where: {
              indicatorId: ind.id,
              evaluationSession: { ...sessionWhere, instrumentId: qModel.id },
            },
            _avg: { score: true, score2: true },
          })
        )
      );

      const currentPercents: number[] = [];
      const targetPercents: number[] = [];
      for (let i = 0; i < indicators.length; i++) {
        const ind = indicators[i];
        const range = ind.maxScore - ind.minScore;
        if (range <= 0) continue;
        const avgCur = aggregates[i]._avg.score2;
        const avgTar = aggregates[i]._avg.score;
        if (avgCur !== null) {
          currentPercents.push(Math.max(0, Math.min(100, ((avgCur - ind.minScore) / range) * 100)));
        }
        if (avgTar !== null) {
          targetPercents.push(Math.max(0, Math.min(100, ((avgTar - ind.minScore) / range) * 100)));
        }
      }

      const current = currentPercents.length
        ? currentPercents.reduce((a, b) => a + b, 0) / currentPercents.length
        : 0;
      const target = targetPercents.length
        ? targetPercents.reduce((a, b) => a + b, 0) / targetPercents.length
        : 0;

      let progress = 0;
      if (target > 0) progress = (current / target) * 100;
      progress = Math.max(0, Math.min(120, progress));

      let status: 'green' | 'yellow' | 'red' = 'red';
      if (progress >= 90) status = 'green';
      else if (progress >= 70) status = 'yellow';

      dimensionProgress.push({
        dimension: dim.key,
        labelTh: dim.labelTh,
        current: Math.round(current),
        target: Math.round(target),
        progress: Math.round(progress),
        status,
      });
    }

    return successResponse({ dimensionProgress });
  } catch (error) {
    return handleApiError(error);
  }
}
