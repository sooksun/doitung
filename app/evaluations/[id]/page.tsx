// app/evaluations/[id]/page.tsx
// End-of-semester evidence + reflection, organised BY DIMENSION (ด้าน).
// For each section the teacher picks ≥1 indicator to reflect on, writes a reflection,
// and attaches evidence (images / documents / video links). All dimensions must be done.
// Scores themselves are filled on /assessment/[id].
//
// Reflection is stored as JSON in EvaluationSession.reflection:
//   { "<sectionId>": { "indicatorIds": number[], "text": string }, ... }
// Evidence rows carry an optional sectionId so they group under the right dimension.

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError, toastConfirm } from '@/lib/toast';

interface Indicator { id: number; itemCode: string | null; textTh: string }
interface Section { id: number; nameTh: string; nameEn: string | null; order: number; indicators: Indicator[] }
interface Evaluation {
  id: number;
  instrumentId: number;
  evaluatorId: number;
  status: string;
  reflection: string | null;
  instrument?: { id: number; nameTh: string; type: string };
  evaluator?: { id: number; name: string };
  targetTeacherName?: string | null;
  academicYear?: { id: number; year: string };
  term?: { id: number; name: string };
}
interface EvidenceItem {
  id: number;
  url: string | null;
  description: string | null;
  sectionId: number | null;
  createdAt: string;
}
interface SectionReflection { indicatorIds: number[]; text: string }

const IMG_RE = /\.(jpg|jpeg|png|gif|webp)(\?|#|$)/i;
function evidenceKind(url: string | null): 'image' | 'document' | 'link' {
  if (!url) return 'link';
  if (IMG_RE.test(url)) return 'image';
  if (url.startsWith('/uploads/')) return 'document';
  return 'link';
}

export default function EvaluationEvidencePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [token, setToken] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [reflections, setReflections] = useState<Record<number, SectionReflection>>({});
  const [loading, setLoading] = useState(true);
  const [savingRefl, setSavingRefl] = useState(false);
  const [meId, setMeId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [startingRun, setStartingRun] = useState(false);

  // per-section evidence add form
  const [addUrl, setAddUrl] = useState<Record<number, string>>({});
  const [addCaption, setAddCaption] = useState<Record<number, string>>({});
  const [uploadingSid, setUploadingSid] = useState<number | null>(null);
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const canEdit = !!evaluation && (isAdmin || meId === evaluation.evaluatorId);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { router.push('/login'); return; }
    setToken(stored);

    // Cancelled flag so each helper bails out of its setState calls if the
    // user navigates / re-mounts before the fetch resolves. Without this,
    // React 18 strict-mode + slow networks can trigger "cannot setState on
    // unmounted component" warnings AND leak stale data into the next mount.
    let cancelled = false;
    const handleAuth = (res: Response) => {
      if (res.status === 401) {
        localStorage.removeItem('token');
        if (!cancelled) router.push('/login');
        return true;
      }
      return false;
    };

    fetch('/api/feature-flags/me', { headers: { Authorization: `Bearer ${stored}` } })
      .then((r) => { if (handleAuth(r)) throw new Error('unauth'); return r.json(); })
      .then((j) => { if (!cancelled && j?.success && j.data?.flags?.aiEnabled) setAiEnabled(true); })
      .catch(() => {});
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${stored}` } })
      .then((r) => { if (handleAuth(r)) throw new Error('unauth'); return r.json(); })
      .then((j) => {
        if (!cancelled && j?.success && j.data) {
          setMeId(j.data.id);
          setIsAdmin(Array.isArray(j.data.roles) && j.data.roles.includes('ADMIN'));
        }
      })
      .catch(() => {});

    const evalId = parseInt(id, 10);
    if (id && !isNaN(evalId)) loadAll(stored, evalId, () => cancelled);
    else setLoading(false);
    return () => { cancelled = true; };
  }, [id, router]);

  const loadAll = async (authToken: string, evalId: number, isCancelled?: () => boolean) => {
    const cancelled = () => !!isCancelled?.();
    try {
      const [evalRes, evRes] = await Promise.all([
        fetch(`/api/evaluations/${evalId}`, { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch(`/api/evaluations/${evalId}/evidence`, { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);
      if (cancelled()) return;
      if (evalRes.status === 401 || evRes.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }

      let data: Evaluation | null = null;
      if (evalRes.ok) {
        const j = await evalRes.json();
        if (cancelled()) return;
        // Only trust an envelope with success=true + a data object. Older
        // branches would fall back to the raw envelope, which doesn't carry
        // the `reflection` field — `data!.reflection` would then access a
        // missing prop and a stricter future TS config would surface it as
        // an error. Bailing here also avoids feeding garbage to the
        // reflection parser below.
        if (j?.success && j.data && typeof j.data === 'object') {
          data = j.data as Evaluation;
          setEvaluation(data);
          let parsed: Record<number, SectionReflection> = {};
          try {
            const raw = JSON.parse(data.reflection || '{}');
            if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
              for (const [k, v] of Object.entries(raw as Record<string, any>)) {
                parsed[Number(k)] = {
                  indicatorIds: Array.isArray(v?.indicatorIds) ? v.indicatorIds.map(Number) : [],
                  text: typeof v?.text === 'string' ? v.text : '',
                };
              }
            }
          } catch { /* legacy/plain text — start fresh */ }
          setReflections(parsed);
        }
      }
      if (evRes.ok) {
        const j = await evRes.json();
        if (cancelled()) return;
        setEvidence(j?.success ? j.data : (Array.isArray(j) ? j : []));
      }

      if (data?.instrumentId) {
        const instRes = await fetch(`/api/instruments/${data.instrumentId}`, { headers: { Authorization: `Bearer ${authToken}` } });
        if (cancelled()) return;
        if (instRes.status === 401) { localStorage.removeItem('token'); router.push('/login'); return; }
        if (instRes.ok) {
          const j = await instRes.json();
          if (cancelled()) return;
          const inst = j?.success ? j.data : j;
          setSections(((inst?.sections || []) as Section[]).slice().sort((a, b) => a.order - b.order));
        }
      }
    } catch {
      // ignore
    } finally {
      if (!cancelled()) setLoading(false);
    }
  };

  const refl = (sid: number): SectionReflection => reflections[sid] || { indicatorIds: [], text: '' };
  const sectionDone = (sid: number) => {
    const r = reflections[sid];
    return !!r && r.indicatorIds.length > 0 && r.text.trim().length > 0;
  };
  const doneCount = sections.filter((s) => sectionDone(s.id)).length;
  const totalSections = sections.length;
  const progressPct = totalSections > 0 ? Math.round((doneCount / totalSections) * 100) : 0;

  const toggleIndicator = (sid: number, indId: number) => {
    setReflections((prev) => {
      const cur = prev[sid] || { indicatorIds: [], text: '' };
      const has = cur.indicatorIds.includes(indId);
      return { ...prev, [sid]: { ...cur, indicatorIds: has ? cur.indicatorIds.filter((x) => x !== indId) : [...cur.indicatorIds, indId] } };
    });
  };
  const setText = (sid: number, text: string) => {
    setReflections((prev) => ({ ...prev, [sid]: { ...(prev[sid] || { indicatorIds: [], text: '' }), text } }));
  };

  const saveReflections = async () => {
    if (!token || !evaluation) return;
    setSavingRefl(true);
    try {
      const payload = JSON.stringify(reflections);
      const res = await fetch(`/api/evaluations/${evaluation.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reflection: payload }),
      });
      const j = await res.json();
      if (res.ok && j.success) {
        toastSuccess('บันทึกการสะท้อนคิดสำเร็จ');
        setEvaluation((prev) => (prev ? { ...prev, reflection: payload } : prev));
      } else {
        toastError(j.error || 'บันทึกไม่สำเร็จ');
      }
    } catch {
      toastError('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSavingRefl(false);
    }
  };

  const addEvidence = async (sid: number) => {
    if (!token || !evaluation) return;
    const file = fileRefs.current[sid]?.files?.[0];
    const link = (addUrl[sid] || '').trim();
    if (!file && !link) { toastError('แนบไฟล์ หรือใส่ลิงก์อย่างน้อย 1 อย่าง'); return; }
    setUploadingSid(sid);
    try {
      const form = new FormData();
      if (file) form.append('file', file);
      if (!file && link) form.append('url', link);
      if ((addCaption[sid] || '').trim()) form.append('description', addCaption[sid].trim());
      form.append('sectionId', String(sid));
      const res = await fetch(`/api/evaluations/${evaluation.id}/evidence`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
      });
      const j = await res.json();
      if (res.ok && j.success) {
        toastSuccess('เพิ่มหลักฐานสำเร็จ');
        if (fileRefs.current[sid]) fileRefs.current[sid]!.value = '';
        setAddUrl((p) => ({ ...p, [sid]: '' }));
        setAddCaption((p) => ({ ...p, [sid]: '' }));
        const r = await fetch(`/api/evaluations/${evaluation.id}/evidence`, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) { const jj = await r.json(); setEvidence(jj.success ? jj.data : []); }
      } else {
        toastError(j.error || 'เพิ่มหลักฐานไม่สำเร็จ');
      }
    } catch {
      toastError('เกิดข้อผิดพลาดในการอัปโหลด');
    } finally {
      setUploadingSid(null);
    }
  };

  const deleteEvidence = async (evId: number) => {
    if (!token || !evaluation) return;
    const ok = await toastConfirm('ลบหลักฐานนี้?', { title: 'ยืนยันการลบ', confirmLabel: 'ลบ', danger: true });
    if (!ok) return;
    try {
      const res = await fetch(`/api/evaluations/${evaluation.id}/evidence/${evId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (res.ok && j.success) { toastSuccess('ลบหลักฐานสำเร็จ'); setEvidence((p) => p.filter((e) => e.id !== evId)); }
      else toastError(j.error || 'ลบไม่สำเร็จ');
    } catch { toastError('เกิดข้อผิดพลาดในการลบ'); }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>กำลังโหลดข้อมูล...</div>;
  if (!evaluation) return <div style={{ padding: '2rem', textAlign: 'center' }}>ไม่พบข้อมูล</div>;

  const cardStyle: React.CSSProperties = { background: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 2px 4px rgba(0,0,0,0.08)', marginBottom: '1.25rem' };

  const renderEvidenceCard = (ev: EvidenceItem) => {
    const kind = evidenceKind(ev.url);
    return (
      <div key={ev.id} style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden', background: 'white', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#f3f4f6', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {kind === 'image' && ev.url ? (
            <a href={ev.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', height: '100%' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ev.url} alt={ev.description || 'evidence'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </a>
          ) : (
            <span style={{ fontSize: '2.2rem' }}>{kind === 'document' ? '📄' : '🔗'}</span>
          )}
        </div>
        <div style={{ padding: '0.5rem 0.6rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {ev.description && <div style={{ fontSize: '0.78rem', color: '#374151', lineHeight: 1.4 }}>{ev.description}</div>}
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
            {ev.url && <a href={ev.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.76rem', color: '#2563eb' }}>{kind === 'image' ? 'ดูรูป' : kind === 'document' ? 'เปิดเอกสาร' : 'เปิดลิงก์'} ↗</a>}
            {canEdit && <button onClick={() => deleteEvidence(ev.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.78rem' }}>🗑️ ลบ</button>}
          </div>
        </div>
      </div>
    );
  };

  const saveBtn = (
    <button
      onClick={saveReflections}
      disabled={savingRefl || !canEdit}
      style={{
        padding: '0.6rem 1.4rem', background: savingRefl || !canEdit ? '#ccc' : '#10b981', color: 'white',
        border: 'none', borderRadius: '0.5rem', fontSize: '0.95rem', fontWeight: 600,
        cursor: savingRefl || !canEdit ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {savingRefl ? 'กำลังบันทึก...' : '💾 บันทึกการสะท้อนคิด'}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <Link href="/evaluations" style={{ padding: '0.5rem 1rem', background: '#667eea', color: 'white', borderRadius: '0.5rem', textDecoration: 'none', display: 'inline-block', marginBottom: '1rem' }}>← กลับ</Link>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 'bold', color: '#333', marginBottom: '0.35rem' }}>
          หลักฐาน &amp; การสะท้อนคิด — การประเมิน #{evaluation.id}
        </h1>
        <p style={{ color: '#666', margin: 0 }}>{evaluation.instrument?.nameTh || 'N/A'}</p>
        <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ padding: '0.25rem 0.6rem', background: evaluation.status === 'SUBMITTED' ? '#d1fae5' : '#fef3c7', color: evaluation.status === 'SUBMITTED' ? '#065f46' : '#92400e', borderRadius: '999px', fontSize: '0.8rem' }}>
            {evaluation.status === 'SUBMITTED' ? 'ส่งแบบประเมินแล้ว' : 'ร่าง'}
          </span>
          {(evaluation.targetTeacherName || evaluation.evaluator?.name) && (
            <span style={{ padding: '0.25rem 0.6rem', background: '#ede9fe', color: '#6d28d9', borderRadius: '999px', fontSize: '0.8rem' }}>
              👤 ครู: {evaluation.targetTeacherName || evaluation.evaluator?.name}
            </span>
          )}
          {evaluation.academicYear?.year && (
            <span style={{ fontSize: '0.8rem', color: '#666' }}>
              ปีการศึกษา {evaluation.academicYear.year}{evaluation.term ? ` · ภาคเรียน ${evaluation.term.name}` : ''}
            </span>
          )}
          <Link href={`/assessment/${evaluation.id}`} style={{ fontSize: '0.8rem', color: '#2563eb' }}>ดูแบบประเมิน/คะแนน →</Link>
        </div>
        <div style={{ marginTop: '0.85rem', padding: '0.6rem 0.9rem', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '0.5rem', color: '#3730a3', fontSize: '0.85rem' }}>
          📅 บันทึกหลักฐานและการสะท้อนคิด <strong>แยกตามรายด้าน</strong> — เลือกตัวชี้วัดที่จะสะท้อนคิดอย่างน้อย 1 ข้อต่อด้าน และทำให้ครบทุกด้าน (ปลายภาคเรียน · ปีละ 2 ครั้ง)
        </div>

        {!canEdit && (
          <div style={{ padding: '0.85rem 1rem', background: '#fef3c7', color: '#92400e', borderRadius: '0.5rem', margin: '1.25rem 0', fontSize: '0.9rem', textAlign: 'center' }}>
            👁 คุณกำลังดูการประเมินของผู้อื่น — เพิ่ม/แก้ไขได้เฉพาะครูเจ้าของเท่านั้น
          </div>
        )}

        {/* Progress + save */}
        <div style={{ ...cardStyle, marginTop: '1.25rem', position: 'sticky', top: '0.5rem', zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                <span style={{ color: '#555' }}>บันทึกครบ <strong style={{ color: '#333' }}>{doneCount} / {totalSections} ด้าน</strong></span>
                <span style={{ fontWeight: 600, color: progressPct >= 100 ? '#10b981' : '#7c3aed' }}>{progressPct}%</span>
              </div>
              <div style={{ height: '7px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, background: progressPct >= 100 ? '#10b981' : '#7c3aed', transition: 'width 0.3s' }} />
              </div>
            </div>
            {canEdit && saveBtn}
          </div>
        </div>

        {/* Per-dimension blocks */}
        {sections.map((s, idx) => {
          const r = refl(s.id);
          const done = sectionDone(s.id);
          const secEvidence = evidence.filter((e) => e.sectionId === s.id);
          return (
            <div key={s.id} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#4338ca', margin: 0 }}>
                  {idx + 1}. {s.nameTh}
                  {s.nameEn && <span style={{ fontSize: '0.85rem', color: '#888', fontWeight: 400, marginLeft: '0.4rem' }}>({s.nameEn})</span>}
                </h3>
                <span style={{
                  padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap',
                  background: done ? '#d1fae5' : '#fee2e2', color: done ? '#065f46' : '#991b1b',
                }}>
                  {done ? '✓ ครบ' : 'ยังไม่ครบ'}
                </span>
              </div>

              {/* Indicator selection */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: '0.5rem' }}>
                  เลือกตัวชี้วัดที่จะสะท้อนคิด (อย่างน้อย 1 ข้อ) — เลือกแล้ว {r.indicatorIds.length}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {s.indicators.map((ind) => {
                    const checked = r.indicatorIds.includes(ind.id);
                    return (
                      <label key={ind.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem 0.6rem',
                        border: `1px solid ${checked ? '#a5b4fc' : '#e5e7eb'}`, borderRadius: '0.4rem',
                        background: checked ? '#eef2ff' : '#fafafa', cursor: canEdit ? 'pointer' : 'default', fontSize: '0.85rem',
                      }}>
                        <input type="checkbox" checked={checked} disabled={!canEdit} onChange={() => toggleIndicator(s.id, ind.id)} style={{ marginTop: '3px' }} />
                        <span style={{ color: '#1e3a8a', fontWeight: 500 }}>
                          {ind.itemCode && <strong style={{ color: '#1e40af', marginRight: '0.35rem' }}>{ind.itemCode}</strong>}
                          {ind.textTh}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Reflection */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: '0.4rem' }}>💭 การสะท้อนคิดของด้านนี้</div>
                {canEdit ? (
                  <textarea
                    value={r.text}
                    onChange={(e) => setText(s.id, e.target.value)}
                    rows={4}
                    placeholder="สะท้อนคิดเกี่ยวกับตัวชี้วัดที่เลือกในด้านนี้ — สิ่งที่ทำได้ดี, สิ่งที่จะพัฒนา, แนวทางปรับปรุง ฯลฯ"
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '0.5rem', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.6 }}
                  />
                ) : r.text ? (
                  <p style={{ whiteSpace: 'pre-wrap', color: '#374151', lineHeight: 1.7, margin: 0 }}>{r.text}</p>
                ) : (
                  <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.88rem' }}>— ยังไม่มีการสะท้อนคิด —</p>
                )}
              </div>

              {/* Evidence for this dimension */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: '0.5rem' }}>📎 หลักฐานของด้านนี้ ({secEvidence.length})</div>
                {secEvidence.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '0.85rem' }}>
                    {secEvidence.map(renderEvidenceCard)}
                  </div>
                )}
                {canEdit && (
                  <div style={{ padding: '0.75rem', background: '#f9fafb', border: '1px dashed #cbd5e1', borderRadius: '0.5rem', display: 'grid', gap: '0.5rem' }}>
                    <input
                      ref={(el) => { fileRefs.current[s.id] = el; }}
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                      style={{ fontSize: '0.82rem' }}
                    />
                    <input
                      type="url"
                      value={addUrl[s.id] || ''}
                      onChange={(e) => setAddUrl((p) => ({ ...p, [s.id]: e.target.value }))}
                      placeholder="หรือใส่ลิงก์วิดีโอ/เว็บ เช่น https://youtu.be/..."
                      style={{ padding: '0.5rem 0.65rem', border: '1px solid #ddd', borderRadius: '0.4rem', fontSize: '0.82rem' }}
                    />
                    <input
                      type="text"
                      value={addCaption[s.id] || ''}
                      onChange={(e) => setAddCaption((p) => ({ ...p, [s.id]: e.target.value }))}
                      placeholder="คำอธิบาย (ไม่บังคับ)"
                      style={{ padding: '0.5rem 0.65rem', border: '1px solid #ddd', borderRadius: '0.4rem', fontSize: '0.82rem' }}
                    />
                    <div>
                      <button
                        onClick={() => addEvidence(s.id)}
                        disabled={uploadingSid === s.id}
                        style={{ padding: '0.5rem 1.1rem', background: uploadingSid === s.id ? '#ccc' : '#667eea', color: 'white', border: 'none', borderRadius: '0.4rem', fontSize: '0.85rem', fontWeight: 600, cursor: uploadingSid === s.id ? 'not-allowed' : 'pointer' }}
                      >
                        {uploadingSid === s.id ? 'กำลังเพิ่ม...' : '➕ เพิ่มหลักฐานด้านนี้'}
                      </button>
                    </div>
                  </div>
                )}
                {!canEdit && secEvidence.length === 0 && (
                  <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.88rem' }}>— ยังไม่มีหลักฐาน —</p>
                )}
              </div>
            </div>
          );
        })}

        {sections.length > 0 && canEdit && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>{saveBtn}</div>
        )}

        {/* AI + SOAR card — Q-Model + submitted + feature on */}
        {evaluation.status === 'SUBMITTED' && aiEnabled && evaluation.instrument?.type === 'Q_MODEL' && (
          <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', borderRadius: '0.75rem', color: 'white', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🤖</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>AI + SOAR Coach</div>
                <div style={{ fontSize: '0.82rem', color: '#c7d2fe' }}>วิเคราะห์ผลประเมินเป็น Strengths · Opportunities · Aspirations · Results พร้อมแผน 90 วัน</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={async () => {
                  if (!token || startingRun) return;
                  setStartingRun(true);
                  try {
                    const res = await fetch(`/api/ai/soar/analyze-evaluation/${evaluation.id}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
                    const json = await res.json();
                    if (res.ok && json.success) router.push(`/evaluations/${evaluation.id}/insights?runId=${json.data.runId}`);
                    else toastError(json.error || 'ไม่สามารถเริ่มวิเคราะห์');
                  } catch { toastError('เกิดข้อผิดพลาด'); } finally { setStartingRun(false); }
                }}
                disabled={startingRun}
                style={{ padding: '0.6rem 1.25rem', background: startingRun ? '#6366f1' : '#818cf8', color: 'white', border: 'none', borderRadius: '0.4rem', cursor: startingRun ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
              >
                {startingRun ? 'กำลังเริ่ม...' : '🚀 วิเคราะห์ด้วย AI + SOAR'}
              </button>
              <Link href={`/evaluations/${evaluation.id}/insights`} style={{ padding: '0.6rem 1.25rem', background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '0.4rem', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                📊 ดู Insights ที่เคยวิเคราะห์
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
