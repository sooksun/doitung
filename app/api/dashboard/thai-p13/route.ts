// app/api/dashboard/thai-p13/route.ts
// Detailed dashboard aggregation for THAI_P1_3 with drill-down:
//   level=overview              → all schools: KPIs + 5-dimension averages + per-school table
//   level=school&schoolId=      → one school: KPIs + dimensions + per-teacher table
//   level=teacher&teacherId=    → one teacher: dimensions (self/director/target/gap) +
//                                 per-indicator detail + per-round (term) progress + reflections
// Filters: academicYearId (defaults to latest), termId (optional — restrict to one round).
// THAI_P1_3 stores rating in `score`, target in `score2`. SELF = ครูประเมินตนเอง,
// DIRECTOR = ผอ.ประเมิน (EvaluationSession.evaluatorKind). All non-ARCHIVED sessions.

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, requireAuth, parseIntParam } from '@/lib/api-utils';

type Status = 'green' | 'yellow' | 'red' | 'none';
const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const r2 = (v: number | null): number | null => (v == null ? null : Math.round(v * 100) / 100);
const termNo = (name?: string | null): number => (name?.trim().startsWith('2') ? 2 : 1);
// status by rating on the 1–4 scale
const statusOf = (avg: number | null): Status => (avg == null ? 'none' : avg >= 3 ? 'green' : avg >= 2 ? 'yellow' : 'red');

interface RespRow { evaluationSessionId: number; indicatorId: number; score: number; score2: number | null }
interface SessMeta { kind: string | null; schoolId: number; targetTeacherId: number | null; status: string; round: number }

// Aggregate per-section self/director/target over a slice of responses.
function dimensionRows(
  responses: RespRow[],
  sess: Map<number, SessMeta>,
  indSec: Map<number, number | null>,
  sections: { id: number; nameTh: string }[],
) {
  return sections.map((sec) => {
    const self: number[] = [], dir: number[] = [], tgt: number[] = [];
    let count = 0;
    for (const r of responses) {
      if (indSec.get(r.indicatorId) !== sec.id) continue;
      const m = sess.get(r.evaluationSessionId);
      if (!m) continue;
      count++;
      if (m.kind === 'DIRECTOR') { if (r.score != null) dir.push(r.score); }
      else { if (r.score != null) self.push(r.score); if (r.score2 != null) tgt.push(r.score2); }
    }
    const selfAvg = r2(mean(self));
    const targetAvg = r2(mean(tgt));
    return {
      sectionId: sec.id,
      sectionName: sec.nameTh,
      selfAvg,
      directorAvg: r2(mean(dir)),
      targetAvg,
      gap: selfAvg != null && targetAvg != null ? r2(targetAvg - selfAvg) : null,
      status: statusOf(selfAvg),
      responseCount: count,
    };
  });
}

// Overall self-rating average across responses (SELF/legacy side only).
function overallSelfAvg(responses: RespRow[], sess: Map<number, SessMeta>): number | null {
  const xs: number[] = [];
  for (const r of responses) {
    const m = sess.get(r.evaluationSessionId);
    if (m && m.kind !== 'DIRECTOR' && r.score != null) xs.push(r.score);
  }
  return r2(mean(xs));
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const sp = request.nextUrl.searchParams;
    const level = sp.get('level') || 'overview';
    const schoolId = parseIntParam(sp, 'schoolId');
    const teacherId = parseIntParam(sp, 'teacherId');
    let academicYearId = parseIntParam(sp, 'academicYearId');
    const termId = parseIntParam(sp, 'termId');

    const instrument = await prisma.instrument.findFirst({
      where: { type: 'THAI_P1_3' },
      include: { sections: { orderBy: { order: 'asc' } }, indicators: { select: { id: true, sectionId: true, itemCode: true, textTh: true } } },
    });
    if (!instrument) return errorResponse('ไม่พบเครื่องมือประเมินภาษาไทย ป.1–3', 404);

    // Default to the latest academic year that has THAI data, else newest year.
    if (!academicYearId) {
      const latest = await prisma.academicYear.findFirst({ orderBy: { year: 'desc' }, select: { id: true } });
      academicYearId = latest?.id;
    }
    const ay = academicYearId ? await prisma.academicYear.findUnique({ where: { id: academicYearId }, select: { year: true } }) : null;

    const indSec = new Map<number, number | null>();
    for (const ind of instrument.indicators) indSec.set(ind.id, ind.sectionId);
    const sections = instrument.sections.map((s) => ({ id: s.id, nameTh: s.nameTh }));
    const totalIndicators = instrument.indicators.length;

    const sessionWhere: any = { status: { not: 'ARCHIVED' }, instrumentId: instrument.id };
    if (academicYearId) sessionWhere.academicYearId = academicYearId;
    if (termId) sessionWhere.termId = termId;
    if (level === 'school' && schoolId) sessionWhere.schoolId = schoolId;
    if (level === 'teacher' && teacherId) sessionWhere.targetTeacherId = teacherId;

    const sessions = await prisma.evaluationSession.findMany({
      where: sessionWhere,
      select: { id: true, evaluatorKind: true, schoolId: true, targetTeacherId: true, status: true, term: { select: { name: true } } },
    });
    const sess = new Map<number, SessMeta>();
    for (const s of sessions) sess.set(s.id, { kind: s.evaluatorKind, schoolId: s.schoolId, targetTeacherId: s.targetTeacherId, status: s.status, round: termNo(s.term?.name) });

    const responses: RespRow[] = sessions.length
      ? await prisma.evaluationResponse.findMany({
          where: { evaluationSessionId: { in: sessions.map((s) => s.id) } },
          select: { evaluationSessionId: true, indicatorId: true, score: true, score2: true },
        })
      : [];

    const yearLabel = ay?.year ? String(ay.year) : '';
    const dims = dimensionRows(responses, sess, indSec, sections);

    // Completion: a teacher counts as "submitted" when their SELF session is SUBMITTED.
    const teacherIdsAll = new Set<number>();
    const teacherSelfSubmitted = new Set<number>();
    for (const s of sessions) {
      if (s.targetTeacherId == null) continue;
      teacherIdsAll.add(s.targetTeacherId);
      if (s.evaluatorKind !== 'DIRECTOR' && s.status === 'SUBMITTED') teacherSelfSubmitted.add(s.targetTeacherId);
    }
    const teacherCount = teacherIdsAll.size;
    const completionRate = teacherCount ? Math.round((teacherSelfSubmitted.size / teacherCount) * 100) : 0;

    // ─────────── TEACHER level ───────────
    if (level === 'teacher') {
      if (!teacherId) return errorResponse('ต้องระบุ teacherId', 400);
      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
        select: { user: { select: { name: true } }, school: { select: { id: true, nameTh: true, name: true } } },
      });

      // Per-indicator detail
      const indMeta = new Map(instrument.indicators.map((i) => [i.id, { itemCode: i.itemCode, textTh: i.textTh, sectionId: i.sectionId }]));
      const perInd = new Map<number, { self: number[]; dir: number[]; tgt: number[] }>();
      for (const r of responses) {
        const m = sess.get(r.evaluationSessionId); if (!m) continue;
        let bucket = perInd.get(r.indicatorId); if (!bucket) { bucket = { self: [], dir: [], tgt: [] }; perInd.set(r.indicatorId, bucket); }
        if (m.kind === 'DIRECTOR') { if (r.score != null) bucket.dir.push(r.score); }
        else { if (r.score != null) bucket.self.push(r.score); if (r.score2 != null) bucket.tgt.push(r.score2); }
      }
      const secName = new Map(sections.map((s) => [s.id, s.nameTh]));
      const indicators = instrument.indicators
        .slice()
        .sort((a, b) => (a.sectionId ?? 0) - (b.sectionId ?? 0) || a.id - b.id)
        .map((i) => {
          const b = perInd.get(i.id) || { self: [], dir: [], tgt: [] };
          return {
            itemCode: i.itemCode, textTh: i.textTh,
            sectionName: i.sectionId ? secName.get(i.sectionId) || '' : '',
            self: r2(mean(b.self)), director: r2(mean(b.dir)), target: r2(mean(b.tgt)),
          };
        });

      // Per-round (term) progress
      const rounds = [1, 2].map((round) => {
        const rResp = responses.filter((r) => sess.get(r.evaluationSessionId)?.round === round);
        const self: number[] = [], tgt: number[] = [];
        for (const r of rResp) { const m = sess.get(r.evaluationSessionId); if (m && m.kind !== 'DIRECTOR') { if (r.score != null) self.push(r.score); if (r.score2 != null) tgt.push(r.score2); } }
        const hasData = sessions.some((s) => termNo(s.term?.name) === round);
        return { round, selfAvg: r2(mean(self)), targetAvg: r2(mean(tgt)), hasData };
      });

      // Reflections (SELF sessions)
      const selfIds = sessions.filter((s) => s.evaluatorKind !== 'DIRECTOR').map((s) => s.id);
      const reflRows = selfIds.length
        ? await prisma.thaiReflection.findMany({ where: { evaluationSessionId: { in: selfIds } }, select: { sectionId: true, reflectionText: true, recordedAt: true, evaluationSessionId: true }, orderBy: [{ sectionId: 'asc' }] })
        : [];
      const reflections = reflRows.map((rf) => ({
        sectionName: secName.get(rf.sectionId) || `ด้าน #${rf.sectionId}`,
        round: sess.get(rf.evaluationSessionId)?.round ?? 1,
        recordedAt: rf.recordedAt,
        text: rf.reflectionText,
      }));

      return successResponse({
        level, academicYearId, yearLabel, instrumentId: instrument.id,
        teacher: { id: teacherId, name: teacher?.user?.name || `ครู #${teacherId}`, schoolId: teacher?.school?.id ?? null, schoolName: teacher?.school?.nameTh || teacher?.school?.name || '' },
        kpis: { overallSelf: overallSelfAvg(responses, sess), completionRate, selfSubmitted: teacherSelfSubmitted.size > 0 },
        dimensions: dims,
        indicators,
        rounds,
        reflections,
      });
    }

    // ─────────── SCHOOL level ───────────
    if (level === 'school') {
      if (!schoolId) return errorResponse('ต้องระบุ schoolId', 400);
      const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { nameTh: true, name: true } });

      // Per-teacher rows
      const byTeacher = new Map<number, RespRow[]>();
      for (const r of responses) {
        const m = sess.get(r.evaluationSessionId); if (!m || m.targetTeacherId == null) continue;
        let arr = byTeacher.get(m.targetTeacherId); if (!arr) { arr = []; byTeacher.set(m.targetTeacherId, arr); }
        arr.push(r);
      }
      const teacherRecords = await prisma.teacher.findMany({ where: { id: { in: [...teacherIdsAll] } }, select: { id: true, user: { select: { name: true } } } });
      const tName = new Map(teacherRecords.map((t) => [t.id, t.user?.name || `ครู #${t.id}`]));
      const teachers = [...teacherIdsAll].map((tid) => {
        const tResp = byTeacher.get(tid) || [];
        const selfAvg = overallSelfAvg(tResp, sess);
        // director + target overall
        const dir: number[] = [], tgt: number[] = [];
        for (const r of tResp) { const m = sess.get(r.evaluationSessionId); if (m?.kind === 'DIRECTOR') { if (r.score != null) dir.push(r.score); } else if (r.score2 != null) tgt.push(r.score2); }
        return {
          teacherId: tid, name: tName.get(tid) || `ครู #${tid}`,
          selfAvg, directorAvg: r2(mean(dir)), targetAvg: r2(mean(tgt)),
          status: statusOf(selfAvg),
          submitted: teacherSelfSubmitted.has(tid),
        };
      }).sort((a, b) => a.name.localeCompare(b.name, 'th'));

      return successResponse({
        level, academicYearId, yearLabel, instrumentId: instrument.id,
        school: { id: schoolId, name: school?.nameTh || school?.name || `โรงเรียน #${schoolId}` },
        kpis: { teacherCount, completionRate, overallSelf: overallSelfAvg(responses, sess), totalResponses: responses.length },
        dimensions: dims,
        teachers,
      });
    }

    // ─────────── OVERVIEW level ───────────
    const bySchool = new Map<number, RespRow[]>();
    for (const r of responses) {
      const m = sess.get(r.evaluationSessionId); if (!m) continue;
      let arr = bySchool.get(m.schoolId); if (!arr) { arr = []; bySchool.set(m.schoolId, arr); }
      arr.push(r);
    }
    const schoolIds = [...bySchool.keys()];
    const schoolRecords = schoolIds.length ? await prisma.school.findMany({ where: { id: { in: schoolIds } }, select: { id: true, code: true, nameTh: true, name: true } }) : [];
    const sInfo = new Map(schoolRecords.map((s) => [s.id, s]));
    // teachers per school
    const teachersPerSchool = new Map<number, Set<number>>();
    const submittedPerSchool = new Map<number, Set<number>>();
    for (const s of sessions) {
      if (s.targetTeacherId == null) continue;
      if (!teachersPerSchool.has(s.schoolId)) teachersPerSchool.set(s.schoolId, new Set());
      teachersPerSchool.get(s.schoolId)!.add(s.targetTeacherId);
      if (s.evaluatorKind !== 'DIRECTOR' && s.status === 'SUBMITTED') {
        if (!submittedPerSchool.has(s.schoolId)) submittedPerSchool.set(s.schoolId, new Set());
        submittedPerSchool.get(s.schoolId)!.add(s.targetTeacherId);
      }
    }
    const schools = schoolIds.map((sid) => {
      const sResp = bySchool.get(sid) || [];
      const selfAvg = overallSelfAvg(sResp, sess);
      const tgt: number[] = [];
      for (const r of sResp) { const m = sess.get(r.evaluationSessionId); if (m && m.kind !== 'DIRECTOR' && r.score2 != null) tgt.push(r.score2); }
      const tcount = teachersPerSchool.get(sid)?.size || 0;
      const scount = submittedPerSchool.get(sid)?.size || 0;
      const info = sInfo.get(sid);
      return {
        schoolId: sid, name: info?.nameTh || info?.name || `โรงเรียน #${sid}`, code: info?.code ?? null,
        teacherCount: tcount, completionRate: tcount ? Math.round((scount / tcount) * 100) : 0,
        selfAvg, targetAvg: r2(mean(tgt)), status: statusOf(selfAvg),
      };
    }).sort((a, b) => (b.selfAvg ?? -1) - (a.selfAvg ?? -1));

    return successResponse({
      level: 'overview', academicYearId, yearLabel, instrumentId: instrument.id, instrumentName: instrument.nameTh,
      totalIndicators,
      kpis: { schoolCount: schoolIds.length, teacherCount, completionRate, overallSelf: overallSelfAvg(responses, sess), totalResponses: responses.length },
      dimensions: dims,
      schools,
    });
  } catch (error: any) {
    if (error?.message?.startsWith('Unauthorized')) return errorResponse(error.message, 401);
    return handleApiError(error);
  }
}
