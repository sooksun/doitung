// lib/audit.ts
// Append-only audit log helper. Every write that affects AI/SAR state should call logAudit.

import { prisma } from './prisma';

export type EntityType =
  | 'SarDocument'
  | 'SarPage'
  | 'SarEvidenceLink'
  | 'AiAnalysisRun'
  | 'AiAnalysisOutput'
  | 'FeatureFlag'
  | 'School';

export interface AuditEvent {
  userId: number;
  action: string; // e.g. "SAR_APPROVE", "SAR_PAGE_EDIT", "AI_OUTPUT_REJECT"
  entityType: EntityType;
  entityId: number;
  before?: unknown;
  after?: unknown;
}

/**
 * Append a row to AuditLog. Failures are swallowed and logged — auditing must
 * never break the user-facing operation.
 */
export async function logAudit(event: AuditEvent): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: event.userId,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        before: (event.before ?? null) as any,
        after: (event.after ?? null) as any,
      },
    });
  } catch (err) {
    console.error('[audit] failed to log event', event.action, err);
  }
}
