// app/api/live-dashboard/route.ts
// GET /api/live-dashboard - Real-time aggregated data for Live Display Dashboard
// Supports scope: school | network | district. Counts non-ARCHIVED sessions (DRAFT included).
// Supports instrumentId: which assessment tool to aggregate (defaults to the Q-Model instrument).
//   - Q-Model: 4 fixed dimensions matched by InstrumentSection.nameEn; current = score2 (สภาพที่เป็นอยู่), target = score.
//   - Other instruments (e.g. Thai ป.1–3): dimensions = the instrument's own sections; current = score, target = score2.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, parseIntParam, getCurrentUser, hasRole } from '@/lib/api-utils';

const Q_DIMENSIONS = [
  { key: 'Q-Leadership', labelTh: 'Q-Leadership ผู้บริหาร', order: 1 },
  { key: 'Q-PLC',        labelTh: 'Q-PLC ชุมชนแห่งการเรียนรู้', order: 2 },
  { key: 'Q-Learning',   labelTh: 'Q-Learning การจัดการเรียนรู้', order: 3 },
  { key: 'Q-Students',   labelTh: 'Q-Students ด้านนักเรียน', order: 4 },
];

type Status = 'green' | 'yellow' | 'red';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    let scope = sp.get('scope') || 'district'; // school | network | district
    let schoolId = parseIntParam(sp, 'schoolId');
    let networkId = parseIntParam(sp, 'networkId');
    const academicYearId = parseIntParam(sp, 'academicYearId');
    const termId = parseIntParam(sp, 'termId');
    const instrumentId = parseIntParam(sp, 'instrumentId');

    // Access scoping (enforced server-side — this route is otherwise open):
    // a school-bound user (non-admin with a Teacher.schoolId) may ONLY ever see
    // their own school, regardless of the scope/schoolId they request. ADMIN and
    // non-school users (e.g. SUPERVISOR, no Teacher row) keep full access.
    const me = await getCurrentUser(request);
    if (!me) return errorResponse('Unauthorized: กรุณาเข้าสู่ระบบ', 401);
    if (!hasRole(me, 'ADMIN')) {
      const t = await prisma.teacher.findUnique({ where: { userId: me.id }, select: { schoolId: true } });
      if (t?.schoolId) {
        scope = 'school';
        schoolId = t.schoolId;
        networkId = undefined;
      }
    }

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

    // ---- Target instrument (selectable; defaults to Q-Model) ----
    const indicatorSelect = {
      select: { id: true, sectionId: true, itemCode: true, minScore: true, maxScore: true, textTh: true, textEn: true },
    } as const;
    let instrument =
      instrumentId != null
        ? await prisma.instrument.findUnique({
            where: { id: instrumentId },
            include: { sections: true, indicators: indicatorSelect },
          })
        : null;
    if (!instrument) {
      instrument = await prisma.instrument.findFirst({
        where: { type: 'Q_MODEL' },
        include: { sections: true, indicators: indicatorSelect },
      });
    }

    const isQModel = instrument?.type === 'Q_MODEL';
    // "current" = สภาพที่เป็นอยู่/ระดับปัจจุบัน, "target" = เป้าหมาย. Q-Model stores current in score2;
    // teacher-rated tools (Thai ป.1–3) store the rating in score and the target in score2.
    const currentField: 'score' | 'score2' = isQModel ? 'score2' : 'score';

    // Per-instrument session filter
    const instSessionWhere = { ...sessionWhere, instrumentId: instrument?.id ?? -1 };

    // 1. Session counts → completion rate (scoped to the selected instrument)
    const totalSessions = await prisma.evaluationSession.count({ where: instSessionWhere });
    const submittedSessions = await prisma.evaluationSession.count({
      where: { ...instSessionWhere, status: { in: ['SUBMITTED', 'REVIEWED'] } },
    });
    const completionRate = totalSessions > 0
      ? Math.round((submittedSessions / totalSessions) * 100)
      : 0;

    const totalResponses = await prisma.evaluationResponse.count({
      where: { evaluationSession: instSessionWhere },
    });

    // Active evaluators = sessions with activity in the last hour (count distinct evaluators)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSessions = await prisma.evaluationSession.findMany({
      where: {
        ...instSessionWhere,
        OR: [
          { submittedAt: { gte: oneHourAgo } },
          { responses: { some: { createdAt: { gte: oneHourAgo } } } },
        ],
      },
      select: { evaluatorId: true },
    });
    const activeEvaluators = new Set(recentSessions.map((s) => s.evaluatorId)).size;

    // All-time evaluators in scope: distinct evaluatorIds whose session has at least one response.
    const totalEvaluatorRows = await prisma.evaluationSession.findMany({
      where: { ...instSessionWhere, responses: { some: {} } },
      select: { evaluatorId: true },
      distinct: ['evaluatorId'],
    });
    const totalEvaluators = totalEvaluatorRows.length;

    // ---- Dimensions ----
    // Q-Model: the 4 fixed dimensions matched by nameEn. Other instruments: all their sections in order.
    type Dim = { key: string; labelTh: string; order: number; sectionId: number | null };
    let dims: Dim[] = [];
    if (instrument) {
      if (isQModel) {
        dims = Q_DIMENSIONS.map((d) => {
          const sec = instrument!.sections.find((s) => s.nameEn === d.key);
          return { key: d.key, labelTh: d.labelTh, order: d.order, sectionId: sec ? sec.id : null };
        });
      } else {
        dims = instrument.sections
          .slice()
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((s, i) => ({
            key: s.nameEn || `sec-${s.id}`,
            labelTh: s.nameTh,
            order: s.order ?? i + 1,
            sectionId: s.id,
          }));
      }
    }

    const maxScale = instrument?.indicators.reduce((mx, i) => Math.max(mx, i.maxScore), 0) || 5;
    const instrumentName = instrument?.nameTh ?? '';

    const spiderData: Array<{ dimension: string; labelTh: string; current: number; target: number }> = [];
    const dimensionScores: Array<{
      dimension: string;
      labelTh: string;
      percent: number;
      status: Status;
      avgScore: number;
      maxScore: number;
    }> = [];

    for (const dim of dims) {
      const indicators = dim.sectionId != null && instrument
        ? instrument.indicators.filter((i) => i.sectionId === dim.sectionId)
        : [];

      if (indicators.length === 0) {
        spiderData.push({ dimension: dim.key, labelTh: dim.labelTh, current: 0, target: 0 });
        dimensionScores.push({ dimension: dim.key, labelTh: dim.labelTh, percent: 0, status: 'red', avgScore: 0, maxScore: maxScale });
        continue;
      }

      const indicatorIds = indicators.map((i) => i.id);
      const agg = await prisma.evaluationResponse.aggregate({
        where: { indicatorId: { in: indicatorIds }, evaluationSession: instSessionWhere },
        _avg: { score: true, score2: true },
      });
      const avgCurrent = (currentField === 'score2' ? agg._avg.score2 : agg._avg.score) ?? 0;
      const avgTarget = (currentField === 'score2' ? agg._avg.score : agg._avg.score2) ?? 0;

      spiderData.push({
        dimension: dim.key,
        labelTh: dim.labelTh,
        current: Math.round(avgCurrent * 10) / 10,
        target: Math.round(avgTarget * 10) / 10,
      });

      // Per-indicator percent (current field), then average → dimension percent
      const perIndAggs = await Promise.all(
        indicators.map((ind) =>
          prisma.evaluationResponse.aggregate({
            where: { indicatorId: ind.id, evaluationSession: instSessionWhere },
            _avg: { score: true, score2: true },
          })
        )
      );
      const percents: number[] = [];
      for (let i = 0; i < indicators.length; i++) {
        const ind = indicators[i];
        const avg = currentField === 'score2' ? perIndAggs[i]._avg.score2 : perIndAggs[i]._avg.score;
        if (avg === null || avg === undefined) continue;
        const range = ind.maxScore - ind.minScore;
        if (range <= 0) continue;
        percents.push(Math.max(0, Math.min(100, ((avg - ind.minScore) / range) * 100)));
      }
      const percent = percents.length
        ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length)
        : 0;
      let status: Status = 'red';
      if (percent >= 90) status = 'green';
      else if (percent >= 70) status = 'yellow';

      dimensionScores.push({
        dimension: dim.key,
        labelTh: dim.labelTh,
        percent,
        status,
        avgScore: Math.round(avgCurrent * 10) / 10,
        maxScore: indicators[0].maxScore,
      });
    }

    // 4. Overall quality index — average non-zero dimensions
    let overallQualityIndex = 0;
    const nonZero = dimensionScores.filter((d) => d.percent > 0);
    if (nonZero.length > 0) {
      overallQualityIndex = Math.round(
        nonZero.reduce((s, d) => s + d.percent, 0) / nonZero.length
      );
    }

    // 5. Indicator health — all of the instrument's indicators (current state), ordered by
    // dimension order then item code / id.
    const indicatorHealth: Array<{
      code: string | null;
      nameTh: string;
      score: number | null;
      max: number;
      progress: number | null;
      sectionKey: string;
      sectionLabelTh: string;
    }> = [];

    if (instrument) {
      const sectionInfo = new Map<number, { key: string; labelTh: string; order: number }>();
      for (const dim of dims) {
        if (dim.sectionId != null) {
          sectionInfo.set(dim.sectionId, { key: dim.key, labelTh: dim.labelTh, order: dim.order });
        }
      }

      const activeIndicators = instrument.indicators.filter(
        (ind) => ind.sectionId !== null && sectionInfo.has(ind.sectionId)
      );

      const stats = await Promise.all(
        activeIndicators.map(async (ind) => {
          const agg = await prisma.evaluationResponse.aggregate({
            where: { indicatorId: ind.id, evaluationSession: instSessionWhere },
            _avg: { score: true, score2: true },
          });
          const avg = currentField === 'score2' ? agg._avg.score2 : agg._avg.score;
          return { ind, avg };
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
        if (avg !== null && avg !== undefined && range > 0) {
          progress = Math.max(0, Math.min(100, Math.round(((avg - ind.minScore) / range) * 100)));
        }
        const sec = ind.sectionId ? sectionInfo.get(ind.sectionId) : undefined;
        indicatorHealth.push({
          code: ind.itemCode,
          nameTh: ind.textTh,
          score: avg !== null && avg !== undefined ? Math.round(avg * 10) / 10 : null,
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
      instrumentId: instrument?.id ?? null,
      instrumentName,
      maxScale,
      participatingSchools,
      totalSessions,
      totalResponses,
      activeEvaluators,
      totalEvaluators,
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
