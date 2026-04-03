// lib/rbm-calculator.ts
// RBM (Results-Based Management) Calculation Logic

import { prisma } from './prisma';

export interface IndicatorPercentResult {
  indicatorId: number;
  percent: number;
  avgScore: number;
}

export interface KRProgressResult {
  krId: number;
  current: number;
  progress: number;
  status: 'green' | 'yellow' | 'red';
}

/**
 * Calculate normalized percentage (0-100) for an indicator
 * based on evaluation responses with filters
 */
export async function calculateIndicatorPercent(
  indicatorId: number,
  filters: {
    schoolId?: number;
    networkId?: number;
    academicYearId?: number;
    termId?: number;
  }
): Promise<number | null> {
  // Get indicator to get min/max scores
  const indicator = await prisma.indicator.findUnique({
    where: { id: indicatorId },
  });

  if (!indicator) {
    return null;
  }

  // Build where clause for evaluation sessions
  const sessionWhere: any = {
    instrumentId: indicator.instrumentId,
    status: 'SUBMITTED',
  };

  if (filters.academicYearId) {
    sessionWhere.academicYearId = filters.academicYearId;
  }
  if (filters.termId) {
    sessionWhere.termId = filters.termId;
  }

  if (filters.schoolId) {
    sessionWhere.schoolId = filters.schoolId;
  } else if (filters.networkId) {
    // Get schools in network
    const networkMembers = await prisma.schoolNetworkMember.findMany({
      where: { networkId: filters.networkId, isActive: true },
      select: { schoolId: true },
    });
    const schoolIds = networkMembers.map((m) => m.schoolId);
    if (schoolIds.length === 0) {
      return null;
    }
    sessionWhere.schoolId = { in: schoolIds };
  }

  // Get average score for this indicator
  const avgResult = await prisma.evaluationResponse.aggregate({
    where: {
      indicatorId,
      evaluationSession: sessionWhere,
    },
    _avg: {
      score: true,
    },
  });

  if (!avgResult._avg.score) {
    return null;
  }

  const avgScore = avgResult._avg.score;
  const minScore = indicator.minScore;
  const maxScore = indicator.maxScore;

  // Normalize to 0-100
  if (maxScore === minScore) {
    return 100; // Perfect score
  }

  const percent = ((avgScore - minScore) / (maxScore - minScore)) * 100;
  return Math.max(0, Math.min(100, percent));
}

/**
 * Calculate current value for a Key Result
 * (weighted average of linked indicator percentages)
 */
export async function calculateKRCurrent(
  keyResultId: number,
  filters: {
    schoolId?: number;
    networkId?: number;
    academicYearId?: number;
    termId?: number;
  }
): Promise<number | null> {
  // Get KR with linked indicators
  const keyResult = await prisma.oKRKeyResult.findUnique({
    where: { id: keyResultId },
    include: {
      indicators: {
        include: {
          indicator: true,
        },
      },
    },
  });

  if (!keyResult || keyResult.indicators.length === 0) {
    return null;
  }

  // Calculate percentage for each linked indicator
  let sumWeighted = 0;
  let sumWeight = 0;

  for (const link of keyResult.indicators) {
    const percent = await calculateIndicatorPercent(link.indicatorId, filters);
    if (percent === null) continue;

    const weight = link.weight ?? 1.0;
    sumWeighted += weight * percent;
    sumWeight += weight;
  }

  if (sumWeight === 0) {
    return null;
  }

  const current = sumWeighted / sumWeight;
  return Math.max(0, Math.min(100, current));
}

/**
 * Calculate progress percentage for a Key Result
 */
export async function calculateKRProgress(keyResultId: number): Promise<KRProgressResult | null> {
  const keyResult = await prisma.oKRKeyResult.findUnique({
    where: { id: keyResultId },
  });

  if (!keyResult) {
    return null;
  }

  const baseline = keyResult.baseline ?? 0;
  const target = keyResult.target ?? 100;
  const current = keyResult.current ?? 0;

  let progress = 0;
  if (target === baseline) {
    progress = (current / target) * 100;
  } else {
    progress = ((current - baseline) / (target - baseline)) * 100;
  }
  progress = Math.max(0, Math.min(120, progress)); // Clip to 0-120%

  // Traffic light status
  let status: 'green' | 'yellow' | 'red' = 'red';
  if (progress >= 90) status = 'green';
  else if (progress >= 70) status = 'yellow';

  return {
    krId: keyResultId,
    current,
    progress,
    status,
  };
}

/**
 * Calculate progress percentage for an Objective
 * (average of all KR progresses)
 */
export async function calculateObjectiveProgress(
  objectiveId: number
): Promise<number> {
  const objective = await prisma.oKRObjective.findUnique({
    where: { id: objectiveId },
    include: {
      keyResults: true,
    },
  });

  if (!objective || objective.keyResults.length === 0) {
    return 0;
  }

  const krProgresses: number[] = [];
  for (const kr of objective.keyResults) {
    const krProgress = await calculateKRProgress(kr.id);
    if (krProgress) {
      krProgresses.push(krProgress.progress);
    }
  }

  if (krProgresses.length === 0) {
    return 0;
  }

  const avgProgress = krProgresses.reduce((a, b) => a + b, 0) / krProgresses.length;
  return Math.max(0, Math.min(120, avgProgress));
}

/**
 * Update current values for all KRs (batch update)
 * Useful for refreshing data after new evaluations
 */
export async function updateKRCurrentValues(filters?: {
  schoolId?: number;
  networkId?: number;
  academicYearId?: number;
  termId?: number;
}) {
  const keyResults = await prisma.oKRKeyResult.findMany({
    include: {
      indicators: true,
    },
  });

  const updates = [];
  for (const kr of keyResults) {
    const current = await calculateKRCurrent(kr.id, filters || {});
    if (current !== null) {
      updates.push(
        prisma.oKRKeyResult.update({
          where: { id: kr.id },
          data: { current },
        })
      );
    }
  }

  await prisma.$transaction(updates);
  return updates.length;
}

