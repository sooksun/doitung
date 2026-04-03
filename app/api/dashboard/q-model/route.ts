// app/api/dashboard/q-model/route.ts
// GET /api/dashboard/q-model - Q-Model progress by dimension
// OPTIMIZED: Batch queries to reduce N+1 problem

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, parseIntParam } from '@/lib/api-utils';
import { QModelDimensionProgressDto } from '@/lib/api-types';

const Q_DIMENSIONS = [
  { dimension: 'Q-Leadership', labelTh: 'Q-Leadership' },
  { dimension: 'Q-PLC', labelTh: 'Q-PLC' },
  { dimension: 'Q-Learning', labelTh: 'Q-Learning' },
  { dimension: 'Q-Goal', labelTh: 'Q-Goal' },
  { dimension: 'Q-Info', labelTh: 'Q-Info' },
  { dimension: 'Q-Network', labelTh: 'Q-Network' },
];

/**
 * Batch calculate indicator percents to avoid N+1 queries
 */
async function calculateIndicatorPercentsBatch(
  indicatorIds: number[],
  filters: {
    schoolId?: number;
    networkId?: number;
    academicYearId?: number;
    termId?: number;
  }
): Promise<Map<number, number>> {
  if (indicatorIds.length === 0) {
    return new Map();
  }

  // Get all indicators at once
  const indicators = await prisma.indicator.findMany({
    where: { id: { in: indicatorIds } },
    select: {
      id: true,
      instrumentId: true,
      minScore: true,
      maxScore: true,
    },
  });

  if (indicators.length === 0) {
    return new Map();
  }

  // Build session where clause (shared for all indicators)
  const sessionWhere: any = {
    status: 'SUBMITTED',
  };

  if (filters.academicYearId) {
    sessionWhere.academicYearId = filters.academicYearId;
  }
  if (filters.termId) {
    sessionWhere.termId = filters.termId;
  }

  // Handle school/network filter
  let schoolIds: number[] | undefined;
  if (filters.schoolId) {
    schoolIds = [filters.schoolId];
  } else if (filters.networkId) {
    const networkMembers = await prisma.schoolNetworkMember.findMany({
      where: { networkId: filters.networkId, isActive: true },
      select: { schoolId: true },
    });
    schoolIds = networkMembers.map((m) => m.schoolId);
    if (schoolIds.length === 0) {
      return new Map(); // No schools in network
    }
  }

  if (schoolIds) {
    sessionWhere.schoolId = { in: schoolIds };
  }

  // Group indicators by instrumentId to optimize queries
  const indicatorsByInstrument = new Map<number, typeof indicators>();
  for (const ind of indicators) {
    if (!indicatorsByInstrument.has(ind.instrumentId)) {
      indicatorsByInstrument.set(ind.instrumentId, []);
    }
    indicatorsByInstrument.get(ind.instrumentId)!.push(ind);
  }

  const result = new Map<number, number>();

  // Calculate percents for each instrument group
  for (const [instrumentId, instIndicators] of indicatorsByInstrument) {
    // Batch aggregate queries for all indicators in this instrument
    const avgResults = await Promise.all(
      instIndicators.map((ind) =>
        prisma.evaluationResponse.aggregate({
          where: {
            indicatorId: ind.id,
            evaluationSession: {
              ...sessionWhere,
              instrumentId,
            },
          },
          _avg: {
            score: true,
          },
        })
      )
    );

    // Calculate percent for each indicator
    for (let i = 0; i < instIndicators.length; i++) {
      const indicator = instIndicators[i];
      const avgResult = avgResults[i];

      if (!avgResult._avg.score) {
        continue;
      }

      const avgScore = avgResult._avg.score;
      const minScore = indicator.minScore;
      const maxScore = indicator.maxScore;

      // Normalize to 0-100
      if (maxScore === minScore) {
        result.set(indicator.id, 100);
      } else {
        const percent = ((avgScore - minScore) / (maxScore - minScore)) * 100;
        result.set(indicator.id, Math.max(0, Math.min(100, percent)));
      }
    }
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolId = parseIntParam(searchParams, 'schoolId');
    const networkId = parseIntParam(searchParams, 'networkId');
    const academicYearId = parseIntParam(searchParams, 'academicYearId');
    const termId = parseIntParam(searchParams, 'termId');

    const filters = {
      schoolId,
      networkId,
      academicYearId,
      termId,
    };

    // Get Q-Model instrument and sections
    const qModelInstrument = await prisma.instrument.findFirst({
      where: { type: 'Q_MODEL' },
      include: {
        sections: {
          where: {
            nameTh: {
              contains: 'Q-',
            },
          },
        },
      },
    });

    if (!qModelInstrument) {
      return errorResponse('ไม่พบเครื่องมือ Q-Model', 404);
    }

    // Batch: Get all indicators for all sections at once
    const sectionIds = qModelInstrument.sections.map((s) => s.id);
    const allIndicators = await prisma.indicator.findMany({
      where: {
        instrumentId: qModelInstrument.id,
        sectionId: { in: sectionIds },
      },
    });

    // Group indicators by section
    const indicatorsBySection = new Map<number, typeof allIndicators>();
    for (const ind of allIndicators) {
      if (ind.sectionId === null) continue; // Skip indicators without section
      if (!indicatorsBySection.has(ind.sectionId)) {
        indicatorsBySection.set(ind.sectionId, []);
      }
      indicatorsBySection.get(ind.sectionId)!.push(ind);
    }

    // Batch: Get all OKR Objectives at once
    const okrWhere: any = {
      status: { not: 'ARCHIVED' },
      dimension: { in: Q_DIMENSIONS.map((d) => d.dimension) },
    };
    if (schoolId) okrWhere.schoolId = schoolId;
    if (networkId) okrWhere.networkId = networkId;
    if (academicYearId) okrWhere.academicYearId = academicYearId;

    const okrObjectives = await prisma.oKRObjective.findMany({
      where: okrWhere,
      include: {
        keyResults: true,
      },
    });

    // Group OKRs by dimension
    const okrsByDimension = new Map<string, typeof okrObjectives>();
    for (const obj of okrObjectives) {
      if (obj.dimension === null) continue; // Skip OKRs without dimension
      if (!okrsByDimension.has(obj.dimension)) {
        okrsByDimension.set(obj.dimension, []);
      }
      okrsByDimension.get(obj.dimension)!.push(obj);
    }

    // Batch calculate all indicator percents at once
    const indicatorPercents = await calculateIndicatorPercentsBatch(
      allIndicators.map((ind) => ind.id),
      filters
    );

    const dimensionProgress: QModelDimensionProgressDto[] = [];

    for (const dim of Q_DIMENSIONS) {
      // Find section matching this dimension
      const section = qModelInstrument.sections.find((s) =>
        s.nameTh.includes(dim.dimension)
      );

      if (!section) {
        dimensionProgress.push({
          dimension: dim.dimension,
          labelTh: dim.labelTh,
          current: 0,
          target: 80, // Default target
          progress: 0,
          status: 'red',
        });
        continue;
      }

      // Get indicators for this section (from pre-loaded data)
      const indicators = indicatorsBySection.get(section.id) || [];

      if (indicators.length === 0) {
        dimensionProgress.push({
          dimension: dim.dimension,
          labelTh: dim.labelTh,
          current: 0,
          target: 80,
          progress: 0,
          status: 'red',
        });
        continue;
      }

      // Calculate average percent for this dimension (from pre-calculated map)
      const percents: number[] = [];
      for (const indicator of indicators) {
        const percent = indicatorPercents.get(indicator.id);
        if (percent !== undefined && percent !== null) {
          percents.push(percent);
        }
      }

      const current = percents.length > 0
        ? percents.reduce((a, b) => a + b, 0) / percents.length
        : 0;

      // Get target from OKRs (from pre-loaded data)
      const okrObjective = okrsByDimension.get(dim.dimension)?.[0];

      let target = 80; // Default target
      if (okrObjective && okrObjective.keyResults.length > 0) {
        // Use average target from KRs
        const targets = okrObjective.keyResults
          .map((kr) => kr.target)
          .filter((t): t is number => t !== null);
        if (targets.length > 0) {
          target = targets.reduce((a, b) => a + b, 0) / targets.length;
        }
      }

      // Calculate progress
      let progress = 0;
      if (target > 0) {
        progress = (current / target) * 100;
      }
      progress = Math.max(0, Math.min(120, progress));

      // Traffic light status
      let status: 'green' | 'yellow' | 'red' = 'red';
      if (progress >= 90) status = 'green';
      else if (progress >= 70) status = 'yellow';

      dimensionProgress.push({
        dimension: dim.dimension,
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

