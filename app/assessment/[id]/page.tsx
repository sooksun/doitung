// app/assessment/[id]/page.tsx
// Assessment form — fill in สภาพที่เป็นอยู่ (score2) and สภาพที่พึงประสงค์ (score)
// Matches original UI from screenshots

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toastConfirm, toastWarning } from '@/lib/toast';
import { checkThaiTargetVsRating } from '@/lib/thai-score-rule';

interface Section {
  id: number;
  nameTh: string;
  nameEn: string | null;
  order: number;
  indicatorsCount: number;
}

interface Indicator {
  id: number;
  sectionId: number | null;
  itemCode: string | null;
  textTh: string;
  minScore: number;
  maxScore: number;
  // 5-level rubric (level 1..5 → descriptor text). Stored as Json on the
  // Indicator row in DB; surfaced as a foldable row under each item so the
  // assessor can read the scoring criteria without leaving the page.
  levelDescriptors: Record<string, string> | null;
}

interface ResponseMap {
  [indicatorId: number]: {
    score: number | null;   // สภาพที่พึงประสงค์
    score2: number | null;  // สภาพที่เป็นอยู่
  };
}

interface Session {
  id: number;
  status: string;
  instrumentId: number;
  schoolId: number;
  academicYearId: number;
  termId: number | null;
  evaluatorId: number;
  school: { nameTh: string | null; name: string };
  evaluator: { id: number; name: string };
  academicYear: { year: string };
  term: { name: string } | null;
  instrument: { id: number; nameTh: string; type: string };
}

interface SchoolAggregate {
  totalSessions: number;
  completionRate: number;
  overallQualityIndex: number;
  dimensionScores: Array<{
    dimension: string;
    labelTh: string;
    percent: number;
    status: 'green' | 'yellow' | 'red';
  }>;
}

// Likert labels per scale max. Q-Model is 1–5; Thai P.1–3 is 1–4.
const SCALE_LABELS_5: Record<number, string> = { 5: 'ดีมาก', 4: 'ดี', 3: 'ปานกลาง', 2: 'พอใช้', 1: 'ปรับปรุง' };
const SCALE_LABELS_4: Record<number, string> = { 4: 'ดีเยี่ยม', 3: 'ดี', 2: 'พอใช้', 1: 'ต้องปรับปรุง' };
const AGG_POLL_INTERVAL = 5000;

export default function AssessmentPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  // Responses keyed by session id. Single-evaluator instruments have one entry;
  // a Thai ป.1–3 teacher-pair has two (SELF + DIRECTOR), each editable by its owner.
  const [responsesBySession, setResponsesBySession] = useState<Record<number, ResponseMap>>({});
  // Mirror of `responsesBySession` for synchronous reads inside `saveResponse`.
  // The callback can't rely on the state-from-deps version because rapid radio
  // clicks fire two handlers in the same React tick — the second one would
  // read the un-updated state and POST a payload that drops the first click's
  // change (e.g. clicking score=3 then score2=4 ends up sending {score:null,
  // score2:4} and the saved score is lost). The ref is mutated synchronously
  // after each setResponsesBySession call so consecutive saves always start
  // from the post-merge view.
  const responsesRef = useRef<Record<number, ResponseMap>>({});
  // Per-indicator in-flight AbortController, so a brand-new click for the
  // same indicator can cancel the previous POST. Closes the "two POSTs in
  // flight, late one with stale fields wins" race.
  const inflightAbortRef = useRef<Map<number, AbortController>>(new Map());
  const [pair, setPair] = useState<{
    selfSessionId: number | null;
    directorSessionId: number | null;
    editable: 'SELF' | 'DIRECTOR' | 'BOTH' | 'NONE';
    teacherName: string | null;
  } | null>(null);
  // Indicator IDs whose rubric panel is currently expanded.
  const [openRubricIds, setOpenRubricIds] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<number | 'all'>('all');
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Ref guard mirrors handleSubmit on /evaluations/new — `setSubmitting(true)`
  // commits asynchronously so a fast double-click/Enter spam can pass the
  // `if (submitting)` check twice before the disabled state lands; the ref
  // flips synchronously so the second invocation bails before any PATCH.
  const submittingRef = useRef(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [schoolAggregate, setSchoolAggregate] = useState<SchoolAggregate | null>(null);
  // Tracks the most recent loadAll invocation. Re-mounting (e.g. switching
  // between sessions) raises this so any in-flight fetch from a previous
  // mount sees its token != current and skips its setState calls.
  const loadAllTokenRef = useRef(0);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { router.push('/login'); return; }
    setToken(stored);
    const myToken = ++loadAllTokenRef.current;
    loadAll(stored, myToken);
    return () => {
      // Bump the token on unmount/re-run so any in-flight loadAll from THIS
      // mount sees its token != current and stops calling setState.
      loadAllTokenRef.current++;
    };
  }, [router, sessionId]);

  const loadAll = async (authToken: string, runToken: number) => {
    const stillCurrent = () => loadAllTokenRef.current === runToken;
    const handleAuth = (status: number) => {
      if (status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return true;
      }
      return false;
    };
    try {
      const [sessionRes, meRes] = await Promise.all([
        fetch(`/api/evaluations/${sessionId}`, { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch(`/api/auth/me`, { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);
      if (!stillCurrent()) return;
      if (handleAuth(sessionRes.status) || handleAuth(meRes.status)) return;

      if (!sessionRes.ok) {
        setError('ไม่พบแบบประเมินนี้');
        setLoading(false);
        return;
      }
      const sessionData = await sessionRes.json();
      if (!stillCurrent()) return;
      const sess: Session = sessionData?.data || sessionData;
      setSession(sess);

      const meJson = meRes.ok ? await meRes.json() : null;
      if (!stillCurrent()) return;
      const me = meJson?.data;
      const isAdmin = !!me && Array.isArray(me.roles) && me.roles.includes('ADMIN');

      // Sections + indicators (same for both single and pair modes)
      const [sectionsRes, indicatorsRes] = await Promise.all([
        fetch(`/api/instruments/${sess.instrumentId}/sections`, { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch(`/api/instruments/${sess.instrumentId}/indicators`, { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);
      if (!stillCurrent()) return;
      if (handleAuth(sectionsRes.status) || handleAuth(indicatorsRes.status)) return;
      if (sectionsRes.ok) {
        const sd = await sectionsRes.json();
        if (!stillCurrent()) return;
        setSections((sd.data || sd).sort((a: Section, b: Section) => a.order - b.order));
      }
      if (indicatorsRes.ok) {
        const id = await indicatorsRes.json();
        if (!stillCurrent()) return;
        setIndicators(id.data || id);
      }

      const toMap = (rows: any[]): ResponseMap => {
        const m: ResponseMap = {};
        for (const r of rows || []) m[r.indicatorId] = { score: r.score ?? null, score2: r.score2 ?? null };
        return m;
      };

      // Teacher-pair mode (Thai ป.1–3): load BOTH the SELF + DIRECTOR sides.
      if (sess.instrument?.type === 'THAI_P1_3') {
        const pairRes = await fetch(`/api/evaluations/${sessionId}/teacher-pair`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!stillCurrent()) return;
        if (handleAuth(pairRes.status)) return;
        if (pairRes.ok) {
          const pj = await pairRes.json();
          if (!stillCurrent()) return;
          if (pj.success && pj.data) {
            const { self, director, editable, targetTeacher } = pj.data;
            if (editable === 'NONE' && !isAdmin) {
              router.replace(`/evaluations/${sessionId}`);
              return;
            }
            const byId: Record<number, ResponseMap> = {};
            if (self) byId[self.sessionId] = toMap(self.responses);
            if (director) byId[director.sessionId] = toMap(director.responses);
            setResponsesBySession(byId);
            setPair({
              selfSessionId: self?.sessionId ?? null,
              directorSessionId: director?.sessionId ?? null,
              editable,
              teacherName: targetTeacher?.name ?? null,
            });
            const activeStatus = editable === 'DIRECTOR' ? director?.status : self?.status;
            if (activeStatus === 'SUBMITTED') setSubmitted(true);
            return;
          }
        }
        // not a migrated/paired session — fall through to single mode
      }

      // Single-evaluator mode — ownership gate, then load this session's responses.
      if (me) {
        const isOwner = me.id === sess.evaluatorId;
        if (!isOwner && !isAdmin) {
          router.replace(`/evaluations/${sessionId}`);
          return;
        }
      }
      if (sess.status === 'SUBMITTED') setSubmitted(true);
      const responsesRes = await fetch(`/api/evaluations/${sessionId}/responses`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!stillCurrent()) return;
      if (handleAuth(responsesRes.status)) return;
      if (responsesRes.ok) {
        const rd = await responsesRes.json();
        if (!stillCurrent()) return;
        setResponsesBySession({ [Number(sessionId)]: toMap(rd.data || rd) });
      }
    } catch {
      if (stillCurrent()) setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      if (stillCurrent()) setLoading(false);
    }
  };

  // Real-time school-wide aggregate (polls /api/live-dashboard scoped to this session's school)
  useEffect(() => {
    if (!token || !session) return;
    // AbortController scoped to THIS effect run. When deps change or the
    // component unmounts, we abort the in-flight fetch — without it, a slow
    // response from a previous (now-stale) school/year/term could land after
    // the new schoolAggregate from a fresh fetch and visibly clobber it.
    const controller = new AbortController();
    let cancelled = false;
    const fetchAggregate = async () => {
      try {
        const params = new URLSearchParams({
          scope: 'school',
          schoolId: String(session.schoolId),
        });
        if (session.academicYearId) params.set('academicYearId', String(session.academicYearId));
        if (session.termId) params.set('termId', String(session.termId));
        const res = await fetch(`/api/live-dashboard?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (res.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
        if (res.ok) {
          const json = await res.json();
          if (!cancelled && json?.success) setSchoolAggregate(json.data);
        }
      } catch (err: any) {
        // AbortError is expected on teardown — stay silent. Other failures
        // keep showing the last good aggregate.
      }
    };
    fetchAggregate();
    const id = setInterval(fetchAggregate, AGG_POLL_INTERVAL);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(id);
    };
  }, [token, session, router]);

  // --- Instrument-shape adaptors ---
  // Q-Model is dual-state (สภาพที่เป็นอยู่ = score2 + สภาพที่พึงประสงค์ = score) on a 1–5
  // Likert. Thai ป.1–3 is also dual: ระดับการประเมิน = score (existing data) + ค่าเป้าหมาย
  // = score2 (newly captured), on a 1–4 scale. DERS / others stay single-rating (score only).
  // The form's columns, completion logic, and legend key off these.
  const instrumentType = session?.instrument?.type ?? 'Q_MODEL';
  const isDualState = instrumentType === 'Q_MODEL';
  const isThaiTarget = instrumentType === 'THAI_P1_3';
  const requiresBoth = isDualState || isThaiTarget;
  const scaleMin = indicators[0]?.minScore ?? 1;
  const scaleMax = indicators[0]?.maxScore ?? 5;
  const scaleValues = Array.from({ length: Math.max(0, scaleMax - scaleMin + 1) }, (_, i) => scaleMin + i);
  const scaleValuesDesc = [...scaleValues].reverse();
  const scaleLabels = scaleMax <= 4 ? SCALE_LABELS_4 : SCALE_LABELS_5;
  const isAnswered = (r?: { score: number | null; score2: number | null }) =>
    !!r && r.score !== null && (!requiresBoth || r.score2 !== null);

  // Teacher-pair (Thai ป.1–3 with SELF + DIRECTOR). activeSessionId = the session the current
  // user submits/clears/counts against (their editable side; falls back to the URL session).
  const isPair = !!(pair && pair.selfSessionId != null && pair.directorSessionId != null);
  const activeSessionId: number = (() => {
    if (pair) {
      if (pair.editable === 'DIRECTOR' && pair.directorSessionId != null) return pair.directorSessionId;
      if (pair.selfSessionId != null) return pair.selfSessionId;
      if (pair.directorSessionId != null) return pair.directorSessionId;
    }
    return Number(sessionId);
  })();
  const activeResponses: ResponseMap = responsesBySession[activeSessionId] || {};

  // Keep responsesRef in sync with state for the synchronous reads inside saveResponse.
  useEffect(() => {
    responsesRef.current = responsesBySession;
  }, [responsesBySession]);

  const saveResponse = useCallback(async (targetSessionId: number, indicatorId: number, field: 'score' | 'score2', value: number) => {
    if (!token) return;

    // Read latest values from the ref, not the closure, so rapid back-to-back
    // clicks on different fields of the same indicator each see the others'
    // change.
    const current = (responsesRef.current[targetSessionId] || {})[indicatorId] || { score: null, score2: null };
    const updated = { ...current, [field]: value };

    // THAI ป.1–3: ค่าเป้าหมาย (score2) ต้องสูงกว่าระดับการประเมิน (score) — ถ้า rating = 4 ค่าเป้าหมายต้องเป็น 4.
    // Mirror the server rule here so the teacher gets instant feedback — the auto-save
    // swallows POST errors silently, so this client guard is what surfaces the rejection.
    if (isThaiTarget) {
      const ruleError = checkThaiTargetVsRating(updated.score, updated.score2);
      if (ruleError) {
        toastWarning(ruleError);
        return; // reject: do not apply optimistically and do not POST
      }
    }

    // Optimistic local update first so the radio reflects the choice immediately.
    setResponsesBySession((prev) => ({
      ...prev,
      [targetSessionId]: { ...(prev[targetSessionId] || {}), [indicatorId]: updated },
    }));
    // Mirror into the ref synchronously so a follow-up call within the same
    // tick already sees the new value (don't wait for React to re-render +
    // run the responsesBySession-tracking effect).
    responsesRef.current = {
      ...responsesRef.current,
      [targetSessionId]: { ...(responsesRef.current[targetSessionId] || {}), [indicatorId]: updated },
    };

    // The API requires a numeric `score`. Q-Model keeps its original fallback so a
    // "สภาพที่เป็นอยู่"(score2)-first click still persists. For single-rating tools that
    // now expose a target (Thai ป.1–3: ค่าเป้าหมาย = score2) we must NOT copy the target
    // into `score` (= ระดับการประเมิน) — defer the POST until ระดับการประเมิน itself is set.
    const scoreToSend = isDualState ? (updated.score ?? value) : updated.score;
    if (scoreToSend == null) return;

    // Cancel any in-flight POST for the same indicator so a late response
    // can't overwrite a fresher one (server side is upsert-by-indicator so
    // last write wins per row).
    const prevAbort = inflightAbortRef.current.get(indicatorId);
    if (prevAbort) prevAbort.abort();
    const ctrl = new AbortController();
    inflightAbortRef.current.set(indicatorId, ctrl);

    setSaving(indicatorId);
    try {
      await fetch(`/api/evaluations/${targetSessionId}/responses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses: [{
            indicatorId,
            score: scoreToSend,
            score2: updated.score2 ?? null,
          }],
        }),
        signal: ctrl.signal,
      });
    } catch (err: any) {
      // AbortError is expected when a newer click cancels us — silent. Other
      // failures are also silent here because the state was already updated
      // optimistically and the next save will retry.
      if (err?.name !== 'AbortError') {
        // swallow
      }
    } finally {
      // Only clear the saving badge if WE are still the latest in-flight
      // request — otherwise the newer click is still spinning.
      if (inflightAbortRef.current.get(indicatorId) === ctrl) {
        inflightAbortRef.current.delete(indicatorId);
        setSaving(null);
      }
    }
  }, [token, isDualState, isThaiTarget]);

  const handleClearAll = async () => {
    if (!token || !sessionId) return;
    const ok = await toastConfirm(
      'คะแนนเดิมจะถูกลบและสถานะกลับเป็น "ร่าง"',
      { title: 'เคลียร์คะแนนทั้งหมด?', confirmLabel: 'เคลียร์', danger: true }
    );
    if (!ok) return;
    try {
      const res = await fetch(`/api/evaluations/${activeSessionId}/responses`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setResponsesBySession((prev) => ({ ...prev, [activeSessionId]: {} }));
        setSubmitted(false);
        // Reload session to pick up the DRAFT status. Bump the run-token so
        // this manual reload also gets the stale-write protection — if the
        // user navigates mid-reload, the older promise short-circuits.
        const myToken = ++loadAllTokenRef.current;
        loadAll(token, myToken);
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || 'เคลียร์คะแนนไม่สำเร็จ');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเคลียร์คะแนน');
    }
  };

  const handleSubmit = async () => {
    if (!token || submittingRef.current) return;
    // Lock the ref BEFORE the `await toastConfirm` so a double-click that
    // arrives mid-confirmation can't slip past the guard (the React state
    // `submitting` doesn't commit until after a render).
    submittingRef.current = true;
    try {
      const total = indicators.length;
      const answered = indicators.filter((ind) => isAnswered(activeResponses[ind.id])).length;
      if (answered < total) {
        const ok = await toastConfirm(
          `ตอบแล้ว ${answered}/${total} ข้อ\n\nต้องการส่งแบบประเมินเลยหรือไม่?`,
          { title: 'ยังตอบไม่ครบ', confirmLabel: 'ส่งเลย', danger: false }
        );
        if (!ok) {
          submittingRef.current = false;
          return;
        }
      }
      setSubmitting(true);
      const res = await fetch(`/api/evaluations/${activeSessionId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SUBMITTED' }),
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      if (res.ok) {
        setSubmitted(true);
        router.push('/evaluations');
        return; // navigating — leave ref locked so a phantom re-render can't re-fire
      }
      setError('ส่งแบบประเมินไม่สำเร็จ');
      submittingRef.current = false;
    } catch {
      setError('เกิดข้อผิดพลาดในการส่งแบบประเมิน');
      submittingRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  // Derived counts
  const totalIndicators = indicators.length;
  const answeredBoth = indicators.filter((ind) => isAnswered(activeResponses[ind.id])).length;
  const progressPct = totalIndicators > 0 ? Math.round((answeredBoth / totalIndicators) * 100) : 0;

  const visibleSections = activeTab === 'all'
    ? sections
    : sections.filter((s) => s.id === activeTab);

  const indicatorsBySection = (sectionId: number) =>
    indicators.filter((ind) => ind.sectionId === sectionId);

  const answeredInSection = (sectionId: number) =>
    indicatorsBySection(sectionId).filter((ind) => isAnswered(activeResponses[ind.id])).length;

  // Colors
  const bg = darkMode ? '#1a1a2e' : '#f3f4f6';
  const cardBg = darkMode ? '#16213e' : '#ffffff';
  const textColor = darkMode ? '#e2e8f0' : '#1f2937';
  const subText = darkMode ? '#94a3b8' : '#6b7280';
  const borderColor = darkMode ? '#2d3748' : '#e5e7eb';
  const headerBg = darkMode ? '#0f3460' : '#ffffff';
  const purpleLight = darkMode ? 'rgba(139,92,246,0.15)' : '#f5f3ff';
  const blueLight = darkMode ? 'rgba(59,130,246,0.15)' : '#eff6ff';
  const amberLight = darkMode ? 'rgba(245,158,11,0.18)' : '#fffbeb';
  const greenLight = darkMode ? 'rgba(16,185,129,0.18)' : '#ecfdf5';

  // Rating columns in display order.
  //  Q-Model:    เป็นอยู่ (score2, ม่วง) + พึงประสงค์ (score, น้ำเงิน)   — unchanged
  //  Thai ป.1–3: ระดับการประเมิน (score, เหลือง) + ค่าเป้าหมาย (score2, เขียว)
  //  others:     single ระดับการประเมิน (score, น้ำเงิน)
  type RatingColumn = {
    field: 'score' | 'score2';
    header: string;
    legendLabel: string;
    ink: string;
    tint: string;
    accent: string;
    mark: string;
    markText: string;
  };
  const ratingColumns: RatingColumn[] = isDualState
    ? [
        { field: 'score2', header: 'ประเมินสภาพที่เป็นอยู่', legendLabel: 'สภาพที่เป็นอยู่', ink: '#7c3aed', tint: purpleLight, accent: '#7c3aed', mark: '#7c3aed', markText: '#ffffff' },
        { field: 'score', header: 'ประเมินสภาพที่พึงประสงค์', legendLabel: 'สภาพที่พึงประสงค์', ink: '#2563eb', tint: blueLight, accent: '#2563eb', mark: '#2563eb', markText: '#ffffff' },
      ]
    : isThaiTarget
    ? [
        { field: 'score', header: 'ระดับการประเมิน', legendLabel: 'ระดับการประเมิน', ink: darkMode ? '#fbbf24' : '#b45309', tint: amberLight, accent: '#f59e0b', mark: '#f59e0b', markText: '#1f2937' },
        { field: 'score2', header: 'ค่าเป้าหมาย', legendLabel: 'ค่าเป้าหมาย', ink: darkMode ? '#34d399' : '#047857', tint: greenLight, accent: '#10b981', mark: '#10b981', markText: '#ffffff' },
      ]
    : [
        { field: 'score', header: 'ระดับการประเมิน', legendLabel: 'ระดับการประเมิน', ink: '#2563eb', tint: blueLight, accent: '#2563eb', mark: '#2563eb', markText: '#ffffff' },
      ];

  // Render columns carry which session they write to + whether the current user may edit them.
  // Single mode → ratingColumns on the URL session. Teacher-pair → 4 columns across 2 groups.
  type RenderColumn = RatingColumn & { sessionId: number; editable: boolean; groupLabel?: string };
  const amberCol: RatingColumn = { field: 'score', header: 'ระดับการประเมิน', legendLabel: 'ระดับการประเมิน', ink: darkMode ? '#fbbf24' : '#b45309', tint: amberLight, accent: '#f59e0b', mark: '#f59e0b', markText: '#1f2937' };
  const greenCol: RatingColumn = { field: 'score2', header: 'ค่าเป้าหมาย', legendLabel: 'ค่าเป้าหมาย', ink: darkMode ? '#34d399' : '#047857', tint: greenLight, accent: '#10b981', mark: '#10b981', markText: '#ffffff' };

  let renderColumns: RenderColumn[];
  if (isPair) {
    const selfId = pair!.selfSessionId!;
    const dirId = pair!.directorSessionId!;
    const editSelf = pair!.editable === 'SELF' || pair!.editable === 'BOTH';
    const editDir = pair!.editable === 'DIRECTOR' || pair!.editable === 'BOTH';
    renderColumns = [
      { ...amberCol, sessionId: selfId, editable: editSelf, groupLabel: 'ครูประเมินตนเอง' },
      { ...greenCol, sessionId: selfId, editable: editSelf, groupLabel: 'ครูประเมินตนเอง' },
      { ...amberCol, sessionId: dirId, editable: editDir, groupLabel: 'ผอ.ประเมิน' },
      { ...greenCol, sessionId: dirId, editable: editDir, groupLabel: 'ผอ.ประเมิน' },
    ];
  } else {
    renderColumns = ratingColumns.map((c) => ({ ...c, sessionId: Number(sessionId), editable: true }));
  }
  const ratingColCount = renderColumns.length * scaleValues.length;

  // Evaluator group header row (only for teacher-pair — columns carry a groupLabel).
  const hasGroups = renderColumns.some((c) => c.groupLabel);
  const evaluatorGroups: { label: string; colSpan: number }[] = [];
  if (hasGroups) {
    for (const c of renderColumns) {
      const last = evaluatorGroups[evaluatorGroups.length - 1];
      if (last && last.label === c.groupLabel) last.colSpan += scaleValues.length;
      else evaluatorGroups.push({ label: c.groupLabel || '', colSpan: scaleValues.length });
    }
  }
  // Columns the current user is filling (their editable side) — drives the rubric highlight.
  const activeColumns = renderColumns.filter((c) => c.sessionId === activeSessionId);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
        <p style={{ color: subText, fontSize: '1.1rem' }}>กำลังโหลดแบบประเมิน...</p>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
          <Link href="/evaluations" style={{ color: '#7c3aed', textDecoration: 'none' }}>← กลับไปรายการ</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'inherit' }}>
      {/* Sticky Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: headerBg,
        borderBottom: `1px solid ${borderColor}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        padding: '0.75rem 1.5rem',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', minWidth: 0, flex: 1 }}>
              <Link
                href="/evaluations"
                style={{ color: '#7c3aed', textDecoration: 'none', whiteSpace: 'nowrap', fontSize: '0.875rem' }}
              >
                ← กลับไปรายการแบบประเมิน
              </Link>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: textColor, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {session?.school?.nameTh || session?.school?.name || 'โรงเรียน'}
                </h1>
                <p style={{ fontSize: '0.8rem', color: subText, margin: 0 }}>
                  ปีการศึกษา {session?.academicYear?.year}
                  {session?.term ? ` - ภาคเรียนที่ ${session.term.name}` : ''}
                </p>
              </div>
              {isPair && pair?.teacherName ? (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  background: '#fef3c7', color: '#b45309',
                  padding: '0.25rem 0.75rem', borderRadius: '999px',
                  fontSize: '0.8rem', whiteSpace: 'nowrap',
                }}>
                  👤 ครูที่ถูกประเมิน: {pair.teacherName}
                </span>
              ) : session?.evaluator?.name ? (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  background: '#ede9fe', color: '#7c3aed',
                  padding: '0.25rem 0.75rem', borderRadius: '999px',
                  fontSize: '0.8rem', whiteSpace: 'nowrap',
                }}>
                  👤 {session.evaluator.name}
                </span>
              ) : null}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
              {/* Print → PDF */}
              <a
                href={`/assessment/${sessionId}/print`}
                target="_blank"
                rel="noopener noreferrer"
                title="พิมพ์แบบประเมินเป็น PDF"
                style={{
                  background: darkMode ? '#1e3a5f' : '#e0e7ff',
                  color: darkMode ? '#bfdbfe' : '#3730a3',
                  border: 'none', borderRadius: '0.5rem',
                  padding: '0.5rem 0.9rem', cursor: 'pointer',
                  fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap',
                }}
              >
                🖨️ พิมพ์ PDF
              </a>
              {/* Dark mode toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                style={{
                  background: darkMode ? '#4c1d95' : '#e5e7eb',
                  border: 'none', borderRadius: '999px',
                  padding: '0.35rem 0.75rem', cursor: 'pointer',
                  fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem',
                }}
              >
                {darkMode ? '🌙' : '☀️'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || submitted}
                style={{
                  background: submitted ? '#10b981' : submitting ? '#9ca3af' : '#10b981',
                  color: 'white', border: 'none', borderRadius: '0.5rem',
                  padding: '0.5rem 1.25rem', fontSize: '0.9rem', fontWeight: '600',
                  cursor: submitting || submitted ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {submitted ? '✓ ส่งแล้ว' : submitting ? 'กำลังส่ง...' : 'ส่งแบบประเมิน'}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.8rem', color: subText }}>
                ความคืบหน้า: <strong style={{ color: textColor }}>{answeredBoth} / {totalIndicators} ข้อ</strong>
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: progressPct >= 100 ? '#10b981' : '#7c3aed' }}>
                {progressPct}%
              </span>
            </div>
            <div style={{ height: '6px', background: darkMode ? '#2d3748' : '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progressPct}%`,
                background: progressPct >= 100 ? '#10b981' : '#7c3aed',
                borderRadius: '3px', transition: 'width 0.3s',
              }} />
            </div>
          </div>

          {/* School-wide aggregate (real-time, polls every 5s) */}
          {schoolAggregate && (
            <div style={{
              marginTop: '0.6rem',
              paddingTop: '0.55rem',
              borderTop: `1px dashed ${borderColor}`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: '#ef4444',
                  boxShadow: '0 0 6px #ef4444',
                  display: 'inline-block',
                  animation: 'pulse 1.5s infinite',
                }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: textColor }}>
                  ภาพรวมทั้งโรงเรียน
                </span>
                <span style={{ fontSize: '0.75rem', color: subText }}>
                  · ครู {schoolAggregate.totalSessions} คน · ส่งแล้ว {schoolAggregate.completionRate}% · ดัชนีคุณภาพ {schoolAggregate.overallQualityIndex}%
                </span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.5rem',
                flex: 1,
                minWidth: '300px',
              }}>
                {schoolAggregate.dimensionScores.map((d) => {
                  const color = d.status === 'green' ? '#10b981' : d.status === 'yellow' ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={d.dimension}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: subText, marginBottom: '0.15rem' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.labelTh}
                        </span>
                        <span style={{ fontWeight: 600, color }}>{d.percent}%</span>
                      </div>
                      <div style={{
                        height: '4px',
                        background: darkMode ? '#2d3748' : '#e5e7eb',
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${Math.min(d.percent, 100)}%`,
                          height: '100%',
                          background: color,
                          transition: 'width 0.4s',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background: cardBg, borderBottom: `1px solid ${borderColor}`,
        overflowX: 'auto',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '0', padding: '0 1.5rem' }}>
          {/* All tab */}
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '0.75rem 1rem',
              border: 'none', borderBottom: activeTab === 'all' ? '3px solid #7c3aed' : '3px solid transparent',
              background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              color: activeTab === 'all' ? '#7c3aed' : subText,
              fontWeight: activeTab === 'all' ? '600' : '400',
              fontSize: '0.875rem',
            }}
          >
            ทั้งหมด ({totalIndicators})
          </button>
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveTab(sec.id)}
              style={{
                padding: '0.75rem 1rem',
                border: 'none', borderBottom: activeTab === sec.id ? '3px solid #7c3aed' : '3px solid transparent',
                background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                color: activeTab === sec.id ? '#7c3aed' : subText,
                fontWeight: activeTab === sec.id ? '600' : '400',
                fontSize: '0.875rem',
              }}
            >
              {sec.nameTh} ({sec.indicatorsCount})
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {visibleSections.map((sec) => {
          const secIndicators = indicatorsBySection(sec.id);
          const secAnswered = answeredInSection(sec.id);
          return (
            <div key={sec.id} style={{
              background: cardBg, borderRadius: '0.75rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              marginBottom: '1.5rem', overflow: 'hidden',
              border: `1px solid ${borderColor}`,
            }}>
              {/* Section header */}
              <div style={{
                padding: '0.875rem 1.25rem',
                borderBottom: `1px solid ${borderColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: darkMode ? 'rgba(124,58,237,0.1)' : '#faf5ff',
              }}>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#7c3aed' }}>
                  ตัวชี้วัดด้าน {sec.nameTh} <span style={{ color: '#ef4444' }}>*</span>
                </h2>
                <span style={{
                  background: secAnswered === secIndicators.length && secIndicators.length > 0 ? '#d1fae5' : '#ede9fe',
                  color: secAnswered === secIndicators.length && secIndicators.length > 0 ? '#065f46' : '#7c3aed',
                  padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '600',
                }}>
                  ตอบแล้ว {secAnswered}/{secIndicators.length}
                </span>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    {hasGroups && (
                      <tr style={{ background: darkMode ? 'rgba(0,0,0,0.25)' : '#f3f4f6' }}>
                        <th style={{ borderBottom: `1px solid ${borderColor}` }} />
                        {evaluatorGroups.map((g, gi) => (
                          <th key={`grp-${gi}`} colSpan={g.colSpan} style={{
                            textAlign: 'center', padding: '0.5rem',
                            color: textColor, fontWeight: 700, fontSize: '0.95rem',
                            borderBottom: `1px solid ${borderColor}`,
                            borderLeft: gi > 0 ? `2px solid ${borderColor}` : undefined,
                          }}>
                            {g.label}
                          </th>
                        ))}
                      </tr>
                    )}
                    <tr style={{ background: darkMode ? 'rgba(0,0,0,0.2)' : '#f9fafb' }}>
                      <th style={{
                        textAlign: 'left', padding: '0.75rem 1rem',
                        color: subText, fontWeight: '600', borderBottom: `1px solid ${borderColor}`,
                        minWidth: '280px',
                      }}>
                        ตัวชี้วัด
                      </th>
                      {renderColumns.map((col, ci) => (
                        <th key={`hg-${col.sessionId}-${col.field}`} colSpan={scaleValues.length} style={{
                          textAlign: 'center', padding: '0.75rem 0.5rem',
                          color: col.ink, fontWeight: '600', borderBottom: `1px solid ${borderColor}`,
                          background: col.tint,
                          borderLeft: hasGroups && ci > 0 && renderColumns[ci - 1].groupLabel !== col.groupLabel ? `2px solid ${borderColor}` : undefined,
                        }}>
                          {col.header}
                        </th>
                      ))}
                    </tr>
                    <tr style={{ background: darkMode ? 'rgba(0,0,0,0.1)' : '#fafafa' }}>
                      <th style={{ borderBottom: `1px solid ${borderColor}` }} />
                      {renderColumns.map((col) => scaleValues.map((v) => (
                        <th key={`sub-${col.sessionId}-${col.field}-${v}`} style={{
                          textAlign: 'center', padding: '0.4rem 0.5rem', width: '44px',
                          color: col.ink, fontWeight: '600', fontSize: '0.8rem',
                          borderBottom: `1px solid ${borderColor}`,
                          background: col.tint,
                        }}>{v}</th>
                      )))}
                    </tr>
                  </thead>
                  <tbody>
                    {secIndicators.map((ind, idx) => {
                      const resp = activeResponses[ind.id] || { score: null, score2: null };
                      const answered = isAnswered(resp);
                      const rowBg = idx % 2 === 0
                        ? (darkMode ? 'transparent' : 'white')
                        : (darkMode ? 'rgba(255,255,255,0.02)' : '#fafafa');
                      const rubric = ind.levelDescriptors as Record<string, string> | null;
                      const hasRubric = !!rubric && Object.keys(rubric).length > 0;
                      const isOpen = openRubricIds.has(ind.id);
                      return (
                        <React.Fragment key={ind.id}>
                          <tr style={{ background: rowBg }}>
                            {/* Indicator text + rubric disclosure toggle */}
                            <td style={{
                              padding: '0.75rem 1rem', color: textColor,
                              // No bottom border when the rubric row is open — they merge into one cell.
                              borderBottom: isOpen ? 'none' : `1px solid ${borderColor}`,
                              lineHeight: '1.5',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                {answered
                                  ? <span style={{ color: '#10b981', flexShrink: 0, marginTop: '1px' }}>✓</span>
                                  : <span style={{ color: borderColor, flexShrink: 0, marginTop: '1px' }}>○</span>
                                }
                                <div style={{ flex: 1 }}>
                                  <span>{ind.textTh}</span>
                                  {hasRubric && (
                                    <button
                                      type="button"
                                      onClick={() => setOpenRubricIds((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(ind.id)) next.delete(ind.id);
                                        else next.add(ind.id);
                                        return next;
                                      })}
                                      title={isOpen ? 'ซ่อนเกณฑ์การให้คะแนน' : `ดูเกณฑ์การให้คะแนน ${scaleValues.length} ระดับ`}
                                      style={{
                                        marginLeft: '0.5rem',
                                        padding: '2px 8px',
                                        fontSize: '0.72rem',
                                        background: isOpen
                                          ? (darkMode ? 'rgba(99,102,241,0.25)' : '#e0e7ff')
                                          : 'transparent',
                                        color: isOpen
                                          ? (darkMode ? '#c7d2fe' : '#4338ca')
                                          : (darkMode ? '#a5b4fc' : '#6366f1'),
                                        border: `1px solid ${isOpen ? (darkMode ? '#6366f1' : '#a5b4fc') : (darkMode ? '#4f46e5' : '#c7d2fe')}`,
                                        borderRadius: 4,
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        verticalAlign: 'middle',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {isOpen ? '▼ ซ่อนเกณฑ์' : '▶ ดูเกณฑ์'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Rating cells — each column writes to its own session.
                                Teacher-pair: ครูประเมินตนเอง + ผอ.ประเมิน (each ระดับ เหลือง + เป้าหมาย เขียว);
                                Q-Model: score2 ม่วง + score น้ำเงิน; others: score น้ำเงิน. */}
                            {renderColumns.map((col, ci) => {
                              const cResp = (responsesBySession[col.sessionId] || {})[ind.id] || { score: null, score2: null };
                              const cellDisabled = !col.editable || (col.sessionId === activeSessionId && submitted) || saving === ind.id;
                              const groupStart = hasGroups && ci > 0 && renderColumns[ci - 1].groupLabel !== col.groupLabel;
                              return scaleValues.map((v, vi) => (
                                <td key={`cell-${col.sessionId}-${col.field}-${v}`} style={{
                                  textAlign: 'center', padding: '0.75rem 0',
                                  borderBottom: isOpen ? 'none' : `1px solid ${borderColor}`,
                                  background: cResp[col.field] === v ? col.tint : undefined,
                                  borderLeft: groupStart && vi === 0 ? `2px solid ${borderColor}` : undefined,
                                }}>
                                  <input
                                    type="radio"
                                    name={`ind-${ind.id}-${col.sessionId}-${col.field}`}
                                    value={v}
                                    checked={cResp[col.field] === v}
                                    disabled={cellDisabled}
                                    onChange={() => {
                                      saveResponse(col.sessionId, ind.id, col.field, v);
                                      // เลือกคะแนน → กางเกณฑ์ของข้อนั้นทันที (ทุกเครื่องมือที่มีเกณฑ์)
                                      if (hasRubric) {
                                        setOpenRubricIds((prev) => {
                                          if (prev.has(ind.id)) return prev;
                                          const next = new Set(prev);
                                          next.add(ind.id);
                                          return next;
                                        });
                                      }
                                    }}
                                    style={{
                                      accentColor: col.accent,
                                      width: '18px', height: '18px',
                                      cursor: cellDisabled ? 'not-allowed' : 'pointer',
                                    }}
                                  />
                                </td>
                              ));
                            })}
                          </tr>

                          {/* Foldable rubric panel — spans the whole row */}
                          {isOpen && hasRubric && (
                            <tr style={{ background: darkMode ? 'rgba(99,102,241,0.06)' : '#f5f3ff' }}>
                              <td colSpan={ratingColCount + 1} style={{
                                padding: '0.75rem 1.25rem 1rem',
                                borderBottom: `1px solid ${borderColor}`,
                                borderTop: `1px dashed ${darkMode ? '#4f46e5' : '#c7d2fe'}`,
                                color: textColor,
                                fontSize: '0.85rem',
                                lineHeight: 1.6,
                              }}>
                                <div style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: darkMode ? '#a5b4fc' : '#4338ca',
                                  marginBottom: '0.5rem',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                }}>
                                  เกณฑ์การให้คะแนน · {scaleValues.length} ระดับ
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.4rem 0.85rem' }}>
                                  {scaleValuesDesc.map((lvl) => {
                                    const text = rubric?.[String(lvl)];
                                    if (!text) return null;
                                    const matches = activeColumns.filter((c) => resp[c.field] === lvl);
                                    const highlight = matches.length > 0;
                                    let markBg: string;
                                    let markText: string;
                                    if (!highlight) {
                                      markBg = darkMode ? 'rgba(255,255,255,0.06)' : '#e5e7eb';
                                      markText = darkMode ? '#e0e7ff' : '#1f2937';
                                    } else if (isDualState) {
                                      // preserve original Q-Model rendering: พึงประสงค์(น้ำเงิน) wins over เป็นอยู่(ม่วง)
                                      markBg = resp.score === lvl ? '#2563eb' : '#7c3aed';
                                      markText = '#ffffff';
                                    } else if (matches.length === 1) {
                                      markBg = matches[0].mark;
                                      markText = matches[0].markText;
                                    } else {
                                      // ระดับการประเมิน และ ค่าเป้าหมาย ตรงระดับเดียวกัน → แบ่งครึ่งเหลือง/เขียว
                                      markBg = `linear-gradient(135deg, ${matches[0].mark} 0 50%, ${matches[1].mark} 50% 100%)`;
                                      markText = '#1f2937';
                                    }
                                    return (
                                      <React.Fragment key={lvl}>
                                        <div style={{
                                          fontWeight: 700,
                                          color: markText,
                                          background: markBg,
                                          borderRadius: 4,
                                          padding: '2px 10px',
                                          fontSize: '0.78rem',
                                          alignSelf: 'flex-start',
                                          whiteSpace: 'nowrap',
                                        }}>
                                          ระดับ {lvl}
                                        </div>
                                        <div style={{ color: textColor }}>{text}</div>
                                      </React.Fragment>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div style={{
          background: cardBg, borderRadius: '0.75rem', padding: '1rem 1.5rem',
          border: `1px solid ${borderColor}`, marginBottom: '5rem',
          display: 'flex', flexWrap: 'wrap', gap: '0.5rem 2rem', alignItems: 'center',
        }}>
          {scaleValues.map((v) => (
            <span key={v} style={{ color: textColor, fontSize: '0.875rem' }}>
              <strong>{v}</strong> = {scaleLabels[v]}
            </span>
          ))}
          {(() => {
            const seen = new Set<string>();
            const uniq = renderColumns.filter((c) => (seen.has(c.field) ? false : (seen.add(c.field), true)));
            return uniq.length > 1
              ? uniq.map((col) => (
                  <span key={`lg-${col.field}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', color: col.ink }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: col.accent, display: 'inline-block' }} />
                    {col.legendLabel}
                  </span>
                ))
              : null;
          })()}
          {isPair && (
            <span style={{ fontSize: '0.8rem', color: subText }}>
              (ซ้าย = ครูประเมินตนเอง · ขวา = ผอ.ประเมิน)
            </span>
          )}
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: cardBg, borderTop: `1px solid ${borderColor}`,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
        padding: '0.875rem 1.5rem',
      }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <span style={{ color: textColor, fontWeight: '600' }}>
              ตอบแล้ว {answeredBoth} / {totalIndicators} ข้อ
            </span>
            {totalIndicators - answeredBoth > 0 && (
              <span style={{ color: subText, fontSize: '0.875rem', marginLeft: '0.5rem' }}>
                (เหลืออีก {totalIndicators - answeredBoth} ข้อ)
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={handleClearAll}
              disabled={submitting}
              title="ลบคะแนนทุกข้อแล้วเริ่มประเมินใหม่ (สถานะกลับเป็นร่าง)"
              style={{
                background: '#dc2626',
                color: 'white', border: 'none', borderRadius: '0.5rem',
                padding: '0.625rem 1rem', fontSize: '0.85rem', fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              🗑️ เคลียร์คะแนน
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || submitted}
              style={{
                background: submitted ? '#10b981' : submitting ? '#9ca3af' : '#10b981',
                color: 'white', border: 'none', borderRadius: '0.5rem',
                padding: '0.625rem 1.5rem', fontSize: '0.95rem', fontWeight: '600',
                cursor: submitting || submitted ? 'not-allowed' : 'pointer',
              }}
            >
              {submitted ? '✓ ส่งแล้ว' : submitting ? 'กำลังส่ง...' : 'ส่งแบบประเมิน'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
