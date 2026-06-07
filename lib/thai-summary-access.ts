// lib/thai-summary-access.ts
// Access control for the THAI_P1_3 AI summary / supervision endpoints.
// ADMIN: everything. SCHOOL_LEADER: only their own school (school + individual +
// supervision scopes scoped to teachers in their school); project scope is admin-only.
// Anyone else: no access.

import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/api-utils';

export interface ThaiAccess { isAdmin: boolean; schoolId: number | null }

// Returns the caller's access context, or null if they have no access at all.
export async function resolveThaiAccess(me: { id: number; roles?: unknown }): Promise<ThaiAccess | null> {
  if (hasRole(me as any, 'ADMIN')) return { isAdmin: true, schoolId: null };
  if (!hasRole(me as any, 'SCHOOL_LEADER')) return null;
  const t = await prisma.teacher.findUnique({ where: { userId: me.id }, select: { schoolId: true } });
  if (!t) return null; // leader not bound to a school → cannot scope
  return { isAdmin: false, schoolId: t.schoolId };
}

// Whether `acc` may act on (scope, scopeId). Returns a Thai error message, or null if allowed.
//   scope='project'                          → admin only
//   scope='network'                          → admin only (spans multiple schools)
//   scope='school'                           → scopeId is a schoolId; must match the leader's
//   scope='individual' | 'supervision-t*'    → scopeId is a teacherId; must be in the leader's school
export async function checkThaiScopeAccess(acc: ThaiAccess, scope: string, scopeId: number): Promise<string | null> {
  if (acc.isAdmin) return null;
  if (scope === 'project') return 'ภาพรวมทั้งโครงการสำหรับผู้ดูแลระบบเท่านั้น';
  if (scope === 'network') return 'สรุประดับกลุ่มเครือข่ายสำหรับผู้ดูแลระบบเท่านั้น';
  if (scope === 'school') {
    return scopeId === acc.schoolId ? null : 'ดูได้เฉพาะโรงเรียนของท่านเท่านั้น';
  }
  // individual / supervision-* → scopeId is a teacherId
  const t = await prisma.teacher.findUnique({ where: { id: scopeId }, select: { schoolId: true } });
  if (!t || t.schoolId !== acc.schoolId) return 'ดูได้เฉพาะครูในโรงเรียนของท่านเท่านั้น';
  return null;
}
