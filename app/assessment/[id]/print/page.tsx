// app/assessment/[id]/print/page.tsx
// Print-friendly view of an evaluation form → "Save as PDF" via the browser.
// THAI_P1_3 teacher-pair: shows BOTH sides (ครูประเมินตนเอง + ผอ.ประเมิน), each
// with ระดับการประเมิน (score) + ค่าเป้าหมาย (score2). Q-Model shows สภาพที่เป็นอยู่
// (score2) + สภาพที่พึงประสงค์ (score). Other instruments show a single rating.

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Section { id: number; nameTh: string; nameEn: string | null; order: number }
interface Indicator { id: number; sectionId: number | null; itemCode: string | null; textTh: string; minScore: number; maxScore: number }
interface RespVal { score: number | null; score2: number | null }
type RespMap = Record<number, RespVal>;
interface Session {
  id: number; instrumentId: number; status: string;
  school: { nameTh: string | null; name: string };
  evaluator: { id: number; name: string };
  academicYear: { year: string };
  term: { name: string } | null;
  instrument: { id: number; nameTh: string; type: string };
}

const SCALE_LABELS_5: Record<number, string> = { 5: 'ดีมาก', 4: 'ดี', 3: 'ปานกลาง', 2: 'พอใช้', 1: 'ปรับปรุง' };
const SCALE_LABELS_4: Record<number, string> = { 4: 'ดีเยี่ยม', 3: 'ดี', 2: 'พอใช้', 1: 'ต้องปรับปรุง' };

interface Column { key: string; header: string; group?: string; field: 'score' | 'score2'; sessionId: number }

export default function AssessmentPrintPage() {
  const params = useParams();
  const sessionId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [respBySession, setRespBySession] = useState<Record<number, RespMap>>({});
  const [pair, setPair] = useState<{ selfId: number | null; directorId: number | null; teacherName: string | null } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setError('กรุณาเข้าสู่ระบบ'); setLoading(false); return; }
    let cancelled = false;

    const toMap = (rows: any[]): RespMap => {
      const m: RespMap = {};
      for (const r of rows || []) m[r.indicatorId] = { score: r.score ?? null, score2: r.score2 ?? null };
      return m;
    };

    (async () => {
      try {
        const auth = { headers: { Authorization: `Bearer ${token}` } };
        const sRes = await fetch(`/api/evaluations/${sessionId}`, auth);
        if (!sRes.ok) { if (!cancelled) { setError('ไม่พบแบบประเมินนี้'); setLoading(false); } return; }
        const sJson = await sRes.json();
        const sess: Session = sJson?.data || sJson;
        if (cancelled) return;
        setSession(sess);

        const [secRes, indRes] = await Promise.all([
          fetch(`/api/instruments/${sess.instrumentId}/sections`, auth),
          fetch(`/api/instruments/${sess.instrumentId}/indicators`, auth),
        ]);
        if (secRes.ok) { const j = await secRes.json(); if (!cancelled) setSections((j.data || j).slice().sort((a: Section, b: Section) => a.order - b.order)); }
        if (indRes.ok) { const j = await indRes.json(); if (!cancelled) setIndicators(j.data || j); }

        if (sess.instrument?.type === 'THAI_P1_3') {
          const pRes = await fetch(`/api/evaluations/${sessionId}/teacher-pair`, auth);
          if (pRes.ok) {
            const pj = await pRes.json();
            if (pj.success && pj.data) {
              const { self, director, targetTeacher } = pj.data;
              const byId: Record<number, RespMap> = {};
              if (self) byId[self.sessionId] = toMap(self.responses);
              if (director) byId[director.sessionId] = toMap(director.responses);
              if (!cancelled) {
                setRespBySession(byId);
                setPair({ selfId: self?.sessionId ?? null, directorId: director?.sessionId ?? null, teacherName: targetTeacher?.name ?? null });
              }
              return;
            }
          }
        }

        // Single-evaluator
        const rRes = await fetch(`/api/evaluations/${sessionId}/responses`, auth);
        if (rRes.ok) { const j = await rRes.json(); if (!cancelled) setRespBySession({ [Number(sessionId)]: toMap(j.data || j) }); }
      } catch {
        if (!cancelled) setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  const scaleMax = indicators[0]?.maxScore ?? 5;
  const labels = scaleMax <= 4 ? SCALE_LABELS_4 : SCALE_LABELS_5;
  const fmt = (v: number | null): string => (v == null ? '—' : `${v} (${labels[v] ?? ''})`);

  const type = session?.instrument?.type;
  const columns: Column[] = (() => {
    if (!session) return [];
    if (type === 'THAI_P1_3' && pair) {
      const cols: Column[] = [];
      if (pair.selfId != null) {
        cols.push({ key: 'self-s', header: 'ระดับการประเมิน', group: 'ครูประเมินตนเอง', field: 'score', sessionId: pair.selfId });
        cols.push({ key: 'self-t', header: 'ค่าเป้าหมาย', group: 'ครูประเมินตนเอง', field: 'score2', sessionId: pair.selfId });
      }
      if (pair.directorId != null) {
        cols.push({ key: 'dir-s', header: 'ระดับการประเมิน', group: 'ผอ.ประเมิน', field: 'score', sessionId: pair.directorId });
        cols.push({ key: 'dir-t', header: 'ค่าเป้าหมาย', group: 'ผอ.ประเมิน', field: 'score2', sessionId: pair.directorId });
      }
      return cols;
    }
    const sid = Number(sessionId);
    if (type === 'Q_MODEL') {
      return [
        { key: 'cur', header: 'สภาพที่เป็นอยู่', field: 'score2', sessionId: sid },
        { key: 'des', header: 'สภาพที่พึงประสงค์', field: 'score', sessionId: sid },
      ];
    }
    return [{ key: 'rate', header: 'ระดับการประเมิน', field: 'score', sessionId: sid }];
  })();

  // Group header row (THAI pair has 2-col groups)
  const groups: { label: string; span: number }[] = [];
  for (const c of columns) {
    if (!c.group) continue;
    const last = groups[groups.length - 1];
    if (last && last.label === c.group) last.span += 1;
    else groups.push({ label: c.group, span: 1 });
  }
  const hasGroups = groups.length > 0;

  const cellVal = (indId: number, col: Column): string => {
    const map = respBySession[col.sessionId];
    const r = map?.[indId];
    return fmt(r ? r[col.field] : null);
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'inherit' }}>กำลังโหลดข้อมูล...</div>;
  if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: '#b91c1c', fontFamily: 'inherit' }}>{error}</div>;
  if (!session) return null;

  const isThai = type === 'THAI_P1_3';
  const teacherName = pair?.teacherName || session.evaluator?.name || '-';

  return (
    <div className="print-root" style={{ background: '#fff', color: '#111', fontFamily: 'inherit' }}>
      <style>{`
        @page { size: A4; margin: 14mm 12mm; }
        .print-root { max-width: 950px; margin: 0 auto; padding: 1.5rem; }
        .print-toolbar { position: sticky; top: 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.25rem; display: flex; gap: 0.75rem; align-items: center; justify-content: space-between; }
        .doc-title { text-align: center; margin-bottom: 1rem; }
        .doc-title h1 { font-size: 1.3rem; font-weight: 700; margin: 0 0 0.25rem; }
        .doc-title p { margin: 0.1rem 0; font-size: 0.9rem; color: #374151; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem 1.5rem; font-size: 0.88rem; margin: 0.75rem 0 1.25rem; padding: 0.75rem 1rem; border: 1px solid #e5e7eb; border-radius: 6px; }
        table.print-tbl { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
        table.print-tbl th, table.print-tbl td { border: 1px solid #94a3b8; padding: 0.35rem 0.45rem; vertical-align: top; }
        table.print-tbl thead th { background: #eef2ff; text-align: center; font-weight: 700; }
        .sec-row td { background: #f1f5f9; font-weight: 700; color: #1e3a8a; }
        .idx { text-align: center; color: #64748b; width: 36px; }
        .code { font-weight: 700; color: #1e40af; white-space: nowrap; }
        .score-cell { text-align: center; white-space: nowrap; }
        .sig-area { display: flex; justify-content: space-around; gap: 2rem; margin-top: 3rem; }
        .sig-box { text-align: center; flex: 1; }
        .sig-line { margin-top: 2.5rem; border-top: 1px dotted #475569; padding-top: 0.35rem; font-size: 0.85rem; }
        @media print {
          .print-toolbar, .no-print { display: none !important; }
          .print-root { max-width: none; margin: 0; padding: 0; }
          thead { display: table-header-group; }
          tr, .sig-area { page-break-inside: avoid; }
          .sec-row { page-break-after: avoid; }
        }
      `}</style>

      {/* Toolbar (screen only) */}
      <div className="print-toolbar no-print">
        <a href={`/assessment/${sessionId}`} style={{ color: '#4f46e5', textDecoration: 'none', fontSize: '0.9rem' }}>← กลับไปแบบประเมิน</a>
        <button
          onClick={() => window.print()}
          style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.55rem 1.4rem', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}
        >
          🖨️ พิมพ์ / บันทึกเป็น PDF
        </button>
      </div>

      {/* Document header */}
      <div className="doc-title">
        <h1>แบบประเมิน{session.instrument?.nameTh || ''}</h1>
        {isThai && <p>(ครูประเมินตนเอง + ผู้อำนวยการประเมิน)</p>}
      </div>

      <div className="meta">
        <div><strong>โรงเรียน:</strong> {session.school?.nameTh || session.school?.name || '-'}</div>
        <div><strong>ปีการศึกษา:</strong> {session.academicYear?.year || '-'}{session.term ? ` · ภาคเรียนที่ ${session.term.name}` : ''}</div>
        <div><strong>{isThai ? 'ครูผู้รับการประเมิน' : 'ผู้ประเมิน'}:</strong> {teacherName}</div>
        <div><strong>สถานะ:</strong> {session.status === 'SUBMITTED' ? 'ส่งแบบประเมินแล้ว' : session.status === 'REVIEWED' ? 'ตรวจแล้ว' : 'ร่าง'}</div>
      </div>

      {/* Score table */}
      <table className="print-tbl">
        <thead>
          {hasGroups && (
            <tr>
              <th rowSpan={2} className="idx">ที่</th>
              <th rowSpan={2}>ตัวชี้วัด</th>
              {groups.map((g, i) => <th key={i} colSpan={g.span}>{g.label}</th>)}
            </tr>
          )}
          <tr>
            {!hasGroups && <th className="idx">ที่</th>}
            {!hasGroups && <th>ตัวชี้วัด</th>}
            {columns.map((c) => <th key={c.key} className="score-cell">{c.header}</th>)}
          </tr>
        </thead>
        {sections.map((sec, si) => {
          const secInds = indicators.filter((ind) => ind.sectionId === sec.id);
          if (secInds.length === 0) return null;
          return (
            <tbody key={sec.id}>
              <tr className="sec-row">
                <td colSpan={2 + columns.length}>
                  {isThai ? `ด้านที่ ${si + 1}: ` : ''}{sec.nameTh}
                  {sec.nameEn ? ` (${sec.nameEn})` : ''}
                </td>
              </tr>
              {secInds.map((ind, ii) => (
                <tr key={ind.id}>
                  <td className="idx">{ii + 1}</td>
                  <td>
                    {ind.itemCode && <span className="code">{ind.itemCode} </span>}
                    {ind.textTh}
                  </td>
                  {columns.map((c) => <td key={c.key} className="score-cell">{cellVal(ind.id, c)}</td>)}
                </tr>
              ))}
            </tbody>
          );
        })}
      </table>

      {/* Signatures */}
      <div className="sig-area">
        {isThai ? (
          <>
            <div className="sig-box"><div className="sig-line">ลงชื่อ ............................................<br />({teacherName})<br />ครูผู้รับการประเมิน</div></div>
            <div className="sig-box"><div className="sig-line">ลงชื่อ ............................................<br />(............................................)<br />ผู้อำนวยการ</div></div>
          </>
        ) : (
          <div className="sig-box" style={{ maxWidth: '320px', margin: '0 auto' }}><div className="sig-line">ลงชื่อ ............................................<br />({teacherName})<br />ผู้ประเมิน</div></div>
        )}
      </div>
    </div>
  );
}
