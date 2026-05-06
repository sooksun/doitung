// lib/feature-flags.ts
// Per-school feature gating for AI/SAR/Growth-Tracker add-ons.
// Defaults: all flags FALSE — existing assessment flow is unaffected unless an admin opts in.

import { prisma } from './prisma';

export type FeatureKey = 'aiEnabled' | 'sarEnabled' | 'growthTrackerEnabled';

export interface FeatureFlags {
  schoolId: number;
  aiEnabled: boolean;
  sarEnabled: boolean;
  growthTrackerEnabled: boolean;
}

const DEFAULT_FLAGS: Omit<FeatureFlags, 'schoolId'> = {
  aiEnabled: false,
  sarEnabled: false,
  growthTrackerEnabled: false,
};

/**
 * Get the feature flags for a school. If no row exists, returns defaults (all false).
 */
export async function getFeatures(schoolId: number): Promise<FeatureFlags> {
  const row = await prisma.featureFlag.findUnique({ where: { schoolId } });
  if (!row) {
    return { schoolId, ...DEFAULT_FLAGS };
  }
  return {
    schoolId: row.schoolId,
    aiEnabled: row.aiEnabled,
    sarEnabled: row.sarEnabled,
    growthTrackerEnabled: row.growthTrackerEnabled,
  };
}

/**
 * Throw a Forbidden error if the school does not have the requested feature enabled.
 * Use inside API route handlers; the catcher in lib/api-utils handles the 403 response.
 */
export async function requireFeature(schoolId: number, key: FeatureKey): Promise<void> {
  const flags = await getFeatures(schoolId);
  if (!flags[key]) {
    throw new Error(`Forbidden: feature '${key}' is not enabled for this school`);
  }
}

/**
 * Upsert a school's flag row. Used by /api/admin/feature-flags PATCH.
 */
export async function setFeatures(
  schoolId: number,
  patch: Partial<Omit<FeatureFlags, 'schoolId'>>
): Promise<FeatureFlags> {
  const row = await prisma.featureFlag.upsert({
    where: { schoolId },
    update: patch,
    create: { schoolId, ...DEFAULT_FLAGS, ...patch },
  });
  return {
    schoolId: row.schoolId,
    aiEnabled: row.aiEnabled,
    sarEnabled: row.sarEnabled,
    growthTrackerEnabled: row.growthTrackerEnabled,
  };
}
