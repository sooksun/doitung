// app/evaluations/[id]/page.tsx
// THAI_P1_3 (SELF sessions): structured ThaiReflection per section —
//   indicator multi-select (≥3), datetime, term-specific prompt, file attachments.
// Other instruments: legacy EvaluationSession.reflection JSON + Evidence model.

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError, toastConfirm } from '@/lib/toast';
import ThaiDateTimePicker, { formatThaiDate } from '@/app/components/ThaiDateTimePicker';

interface Indicator { id: number; itemCode: string | null; textTh: string }
interface Section { id: number; nameTh: string; nameEn: string | null; order: number; indicators: Indicator[] }
interface Evaluation {
  id: number; instrumentId: number; evaluatorId: number;
  evaluatorKind?: string | null; status: string; reflection: string | null;
  instrument?: { id: number; nameTh: string; type: string };
  evaluator?: { id: number; name: string };
  targetTeacherName?: string | null;
  academicYear?: { id: number; year: string };
  term?: { id: number; name: string };
}
interface EvidenceItem { id: number; url: string | null; description: string | null; sectionId: number | null; createdAt: string }
interface SectionReflection { indicatorIds: number[]; text: string }
interface ThaiReflectionFile { id: number; publicUrl: string; fileName: string | null; fileType: string; fileSize: number | null; createdAt: string }
interface ThaiReflectionData { id?: number; sectionId: number; indicatorIds: number[]; reflectionText: string; recordedAt: string; files: ThaiReflectionFile[] }

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

  // Legacy evidence form (non-THAI_P1_3)
  const [addUrl, setAddUrl] = useState<Record<number, string>>({});
  const [addCaption, setAddCaption] = useState<Record<number, string>>({});
  const [uploadingSid, setUploadingSid] = useState<number | null>(null);
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Thai ป.1–3 structured reflection
  const [thaiReflections, setThaiReflections] = useState<Record<number, ThaiReflectionData>>({});
  const [savingThaiSid, setSavingThaiSid] = useState<number | null>(null);
  const [thaiVideoUrl, setThaiVideoUrl] = useState<Record<number, string>>({});
  const [thaiUploadSid, setThaiUploadSid] = useState<number | null>(null);
  const thaiFileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const canEdit = !!evaluation && (isAdmin || meId === evaluation.evaluatorId);
  const isThaiP13 = evaluation?.instrument?.type === 'THAI_P1_3' && evaluation?.evaluatorKind !== 'DIRECTOR';
  const termNo: 1 | 2 = evaluation?.term?.name?.startsWith('2') ? 2 : 1;
  const termPrompt = termNo === 1
    ? 'มีความจำเป็นสำคัญอะไรจึงต้องเปลี่ยนแปลง เป้าหมายการเปลี่ยนแปลงคืออะไร และจะเปลี่ยนด้วยวิธีการใด มีขั้นตอนอย่างไร'
    : 'จากเป้าหมายที่ตั้งไว้ต้นปี มีการทำตามแผนสำเร็จหรือไม่อย่างไร หากไม่สำเร็จเพราะเหตุใด และจะดำเนินการต่ออย่างไร';

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { router.push('/login'); return; }
    setToken(stored);
    let cancelled = false;
    const handleAuth = (res: Response) => { if (res.status === 401) { localStorage.removeItem('token'); if (!cancelled) router.push('/login'); return true; } return false; };
    fetch('/api/feature-flags/me', { headers: { Authorization: `Bearer ${stored}` } })
      .then((r) => { if (handleAuth(r)) throw new Error('unauth'); return r.json(); })
      .then((j) => { if (!cancelled && j?.success && j.data?.flags?.aiEnabled) setAiEnabled(true); })
      .catch(() => {});
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${stored}` } })
      .then((r) => { if (handleAuth(r)) throw new Error('unauth'); return r.json(); })
      .then((j) => { if (!cancelled && j?.success && j.data) { setMeId(j.data.id); setIsAdmin(Array.isArray(j.data.roles) && j.data.roles.includes('ADMIN')); } })
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
      if (evalRes.status === 401 || evRes.status === 401) { localStorage.removeItem('token'); router.push('/login'); return; }

      let data: Evaluation | null = null;
      if (evalRes.ok) {
        const j = await evalRes.json();
        if (cancelled()) return;
        if (j?.success && j.data && typeof j.data === 'object') {
          data = j.data as Evaluation;
          setEvaluation(data);
          if (data.instrument?.type !== 'THAI_P1_3') {
            let parsed: Record<number, SectionReflection> = {};
            try {
              const raw = JSON.parse(data.reflection || '{}');
              if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                for (const [k, v] of Object.entries(raw as Record<string, any>))
                  parsed[Number(k)] = { indicatorIds: Array.isArray(v?.indicatorIds) ? v.indicatorIds.map(Number) : [], text: typeof v?.text === 'string' ? v.text : '' };
              }
            } catch { /* start fresh */ }
            setReflections(parsed);
          }
        }
      }
      if (evRes.ok) { const j = await evRes.json(); if (cancelled()) return; setEvidence(j?.success ? j.data : (Array.isArray(j) ? j : [])); }

      if (data?.instrumentId) {
        const instRes = await fetch(`/api/instruments/${data.instrumentId}`, { headers: { Authorization: `Bearer ${authToken}` } });
        if (cancelled()) return;
        if (instRes.status === 401) { localStorage.removeItem('token'); router.push('/login'); return; }
        if (instRes.ok) {
          const j = await instRes.json(); if (cancelled()) return;
          const inst = j?.success ? j.data : j;
          setSections(((inst?.sections || []) as Section[]).slice().sort((a, b) => a.order - b.order));
        }
      }

      // Load Thai reflections for THAI_P1_3 SELF sessions
      if (data?.instrument?.type === 'THAI_P1_3' && data?.evaluatorKind !== 'DIRECTOR') {
        const trRes = await fetch(`/api/evaluations/${evalId}/thai-reflections`, { headers: { Authorization: `Bearer ${authToken}` } });
        if (!cancelled() && trRes.ok) {
          const j = await trRes.json();
          if (!cancelled() && j?.success) {
            const map: Record<number, ThaiReflectionData> = {};
            for (const r of j.data)
              map[r.sectionId] = { id: r.id, sectionId: r.sectionId, indicatorIds: Array.isArray(r.indicatorIds) ? r.indicatorIds : [], reflectionText: r.reflectionText || '', recordedAt: r.recordedAt || new Date().toISOString(), files: r.files || [] };
            setThaiReflections(map);
          }
        }
      }
    } catch { /* ignore */ }
    finally { if (!cancelled()) setLoading(false); }
  };

  // ── Legacy helpers ────────────────────────────────────────────────────────
  const refl = (sid: number): SectionReflection => reflections[sid] || { indicatorIds: [], text: '' };
  const sectionDone = (sid: number) => { const r = reflections[sid]; return !!r && r.indicatorIds.length > 0 && r.text.trim().length > 0; };
  const doneCount = sections.filter((s) => sectionDone(s.id)).length;
  const toggleIndicator = (sid: number, indId: number) => setReflections((prev) => { const cur = prev[sid] || { indicatorIds: [], text: '' }; const has = cur.indicatorIds.includes(indId); return { ...prev, [sid]: { ...cur, indicatorIds: has ? cur.indicatorIds.filter((x) => x !== indId) : [...cur.indicatorIds, indId] } }; });
  const setText = (sid: number, text: string) => setReflections((prev) => ({ ...prev, [sid]: { ...(prev[sid] || { indicatorIds: [], text: '' }), text } }));
  const saveReflections = async () => {
    if (!token || !evaluation) return;
    setSavingRefl(true);
    try {
      const payload = JSON.stringify(reflections);
      const res = await fetch(`/api/evaluations/${evaluation.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ reflection: payload }) });
      const j = await res.json();
      if (res.ok && j.success) { toastSuccess('บันทึกการสะท้อนคิดสำเร็จ'); setEvaluation((prev) => (prev ? { ...prev, reflection: payload } : prev)); }
      else toastError(j.error || 'บันทึกไม่สำเร็จ');
    } catch { toastError('เกิดข้อผิดพลาดในการบันทึก'); }
    finally { setSavingRefl(false); }
  };
  const addEvidence = async (sid: number) => {
    if (!token || !evaluation) return;
    const file = fileRefs.current[sid]?.files?.[0]; const link = (addUrl[sid] || '').trim();
    if (!file && !link) { toastError('แนบไฟล์ หรือใส่ลิงก์อย่างน้อย 1 อย่าง'); return; }
    setUploadingSid(sid);
    try {
      const form = new FormData();
      if (file) form.append('file', file); if (!file && link) form.append('url', link);
      if ((addCaption[sid] || '').trim()) form.append('description', addCaption[sid].trim());
      form.append('sectionId', String(sid));
      const res = await fetch(`/api/evaluations/${evaluation.id}/evidence`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      const j = await res.json();
      if (res.ok && j.success) {
        toastSuccess('เพิ่มหลักฐานสำเร็จ');
        if (fileRefs.current[sid]) fileRefs.current[sid]!.value = '';
        setAddUrl((p) => ({ ...p, [sid]: '' })); setAddCaption((p) => ({ ...p, [sid]: '' }));
        const r = await fetch(`/api/evaluations/${evaluation.id}/evidence`, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) { const jj = await r.json(); setEvidence(jj.success ? jj.data : []); }
      } else toastError(j.error || 'เพิ่มหลักฐานไม่สำเร็จ');
    } catch { toastError('เกิดข้อผิดพลาดในการอัปโหลด'); }
    finally { setUploadingSid(null); }
  };
  const deleteEvidence = async (evId: number) => {
    if (!token || !evaluation) return;
    const ok = await toastConfirm('ลบหลักฐานนี้?', { title: 'ยืนยันการลบ', confirmLabel: 'ลบ', danger: true }); if (!ok) return;
    try {
      const res = await fetch(`/api/evaluations/${evaluation.id}/evidence/${evId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (res.ok && j.success) { toastSuccess('ลบหลักฐานสำเร็จ'); setEvidence((p) => p.filter((e) => e.id !== evId)); } else toastError(j.error || 'ลบไม่สำเร็จ');
    } catch { toastError('เกิดข้อผิดพลาดในการลบ'); }
  };

  // ── Thai ป.1–3 helpers ───────────────────────────────────────────────────
  const thaiRefl = (sid: number): ThaiReflectionData => thaiReflections[sid] || { sectionId: sid, indicatorIds: [], reflectionText: '', recordedAt: new Date().toISOString(), files: [] };
  const thaiSectionDone = (sid: number) => { const r = thaiReflections[sid]; return !!r && r.indicatorIds.length >= 3 && r.reflectionText.trim().length > 0 && !!r.recordedAt; };
  const thaiDoneCount = sections.filter((s) => thaiSectionDone(s.id)).length;
  const totalSections = sections.length;
  const progressPct = totalSections > 0 ? Math.round(((isThaiP13 ? thaiDoneCount : doneCount) / totalSections) * 100) : 0;

  const toggleThaiIndicator = (sid: number, indId: number) => setThaiReflections((prev) => { const cur = prev[sid] || { sectionId: sid, indicatorIds: [], reflectionText: '', recordedAt: new Date().toISOString(), files: [] }; const has = cur.indicatorIds.includes(indId); return { ...prev, [sid]: { ...cur, indicatorIds: has ? cur.indicatorIds.filter((x) => x !== indId) : [...cur.indicatorIds, indId] } }; });
  const setThaiText = (sid: number, text: string) => setThaiReflections((prev) => { const cur = prev[sid] || { sectionId: sid, indicatorIds: [], reflectionText: '', recordedAt: new Date().toISOString(), files: [] }; return { ...prev, [sid]: { ...cur, reflectionText: text } }; });
  const setThaiDate = (sid: number, dt: string) => setThaiReflections((prev) => { const cur = prev[sid] || { sectionId: sid, indicatorIds: [], reflectionText: '', recordedAt: new Date().toISOString(), files: [] }; return { ...prev, [sid]: { ...cur, recordedAt: dt } }; });

  const saveThaiReflection = async (sid: number) => {
    if (!token || !evaluation) return;
    const r = thaiRefl(sid);
    if (r.indicatorIds.length < 3) { toastError('ต้องเลือกตัวชี้วัดอย่างน้อย 3 ข้อ'); return; }
    if (!r.reflectionText.trim()) { toastError('กรุณาระบุการสะท้อนคิด'); return; }
    if (!r.recordedAt) { toastError('กรุณาระบุวันเวลาที่บันทึก'); return; }
    setSavingThaiSid(sid);
    try {
      const res = await fetch(`/api/evaluations/${evaluation.id}/thai-reflections/${sid}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ indicatorIds: r.indicatorIds, reflectionText: r.reflectionText, recordedAt: r.recordedAt }) });
      const j = await res.json();
      if (res.ok && j.success) { toastSuccess('บันทึกการสะท้อนคิดสำเร็จ'); setThaiReflections((prev) => ({ ...prev, [sid]: { ...r, id: j.data.id, files: j.data.files || r.files } })); }
      else toastError(j.error || 'บันทึกไม่สำเร็จ');
    } catch { toastError('เกิดข้อผิดพลาดในการบันทึก'); }
    finally { setSavingThaiSid(null); }
  };

  const uploadThaiFile = async (sid: number) => {
    if (!token || !evaluation) return;
    const r = thaiRefl(sid);
    if (!r.id) { toastError('กรุณาบันทึกการสะท้อนคิดก่อนแนบไฟล์'); return; }
    const file = thaiFileRefs.current[sid]?.files?.[0]; const videoUrl = (thaiVideoUrl[sid] || '').trim();
    if (!file && !videoUrl) { toastError('เลือกไฟล์ หรือใส่ลิงก์วิดีโออย่างน้อย 1 อย่าง'); return; }
    setThaiUploadSid(sid);
    try {
      const form = new FormData();
      if (file) form.append('file', file); else form.append('videoUrl', videoUrl);
      const res = await fetch(`/api/evaluations/${evaluation.id}/thai-reflections/${sid}/files`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      const j = await res.json();
      if (res.ok && j.success) {
        toastSuccess('แนบไฟล์สำเร็จ');
        if (thaiFileRefs.current[sid]) thaiFileRefs.current[sid]!.value = '';
        setThaiVideoUrl((p) => ({ ...p, [sid]: '' }));
        setThaiReflections((prev) => ({ ...prev, [sid]: { ...thaiRefl(sid), files: [...(prev[sid]?.files || []), j.data] } }));
      } else toastError(j.error || 'แนบไฟล์ไม่สำเร็จ');
    } catch { toastError('เกิดข้อผิดพลาดในการอัปโหลด'); }
    finally { setThaiUploadSid(null); }
  };

  const deleteThaiFile = async (sid: number, fileId: number) => {
    if (!token || !evaluation) return;
    const ok = await toastConfirm('ลบไฟล์นี้?', { title: 'ยืนยันการลบ', confirmLabel: 'ลบ', danger: true }); if (!ok) return;
    try {
      const res = await fetch(`/api/evaluations/${evaluation.id}/thai-reflections/${sid}/files/${fileId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (res.ok && j.success) { toastSuccess('ลบไฟล์สำเร็จ'); setThaiReflections((prev) => ({ ...prev, [sid]: { ...thaiRefl(sid), files: (prev[sid]?.files || []).filter((f) => f.id !== fileId) } })); }
      else toastError(j.error || 'ลบไม่สำเร็จ');
    } catch { toastError('เกิดข้อผิดพลาดในการลบ'); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = { background: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 2px 4px rgba(0,0,0,0.08)', marginBottom: '1.25rem' };

  const renderEvidenceCard = (ev: EvidenceItem) => {
    const kind = evidenceKind(ev.url);
    return (
      <div key={ev.id} style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden', background: 'white', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#f3f4f6', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {kind === 'image' && ev.url
            ? <a href={ev.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', height: '100%' }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={ev.url} alt={ev.description || 'evidence'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></a>
            : <span style={{ fontSize: '2.2rem' }}>{kind === 'document' ? '📄' : '🔗'}</span>}
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

  const legacySaveBtn = (
    <button onClick={saveReflections} disabled={savingRefl || !canEdit} style={{ padding: '0.6rem 1.4rem', background: savingRefl || !canEdit ? '#ccc' : '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.95rem', fontWeight: 600, cursor: savingRefl || !canEdit ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
      {savingRefl ? 'กำลังบันทึก...' : '💾 บันทึกการสะท้อนคิด'}
    </button>
  );

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>กำลังโหลดข้อมูล...</div>;
  if (!evaluation) return <div style={{ padding: '2rem', textAlign: 'center' }}>ไม่พบข้อมูล</div>;

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <Link href="/evaluations" style={{ padding: '0.5rem 1rem', background: '#667eea', color: 'white', borderRadius: '0.5rem', textDecoration: 'none', display: 'inline-block', marginBottom: '1rem' }}>← กลับ</Link>
        <h1 style={{ fontSize: '1.7rem', fontWeight: 'bold', color: '#333', marginBottom: '0.35rem' }}>
          {isThaiP13 ? 'บันทึกการสะท้อนคิด' : 'หลักฐาน & การสะท้อนคิด'} — การประเมิน #{evaluation.id}
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
              ปีการศึกษา {evaluation.academicYear.year}
              {evaluation.term ? ` · ภาคเรียน ${evaluation.term.name}` : ''}
              {isThaiP13 && ` — การสะท้อนคิดครั้งที่ ${termNo}`}
            </span>
          )}
          <Link href={`/assessment/${evaluation.id}`} style={{ fontSize: '0.8rem', color: '#2563eb' }}>ดูแบบประเมิน/คะแนน →</Link>
        </div>

        {/* Guide banner */}
        <div style={{ marginTop: '0.85rem', padding: '0.6rem 0.9rem', background: isThaiP13 ? '#f0fdf4' : '#eef2ff', border: `1px solid ${isThaiP13 ? '#bbf7d0' : '#c7d2fe'}`, borderRadius: '0.5rem', color: isThaiP13 ? '#14532d' : '#3730a3', fontSize: '0.85rem' }}>
          {isThaiP13
            ? <>📝 บันทึกการสะท้อนคิด <strong>แยกตามรายด้าน (5 ด้าน)</strong> — เลือกตัวชี้วัด <strong>อย่างน้อย 3 ข้อ</strong> ต่อด้าน · ระบุวันเวลาที่บันทึก · แนบไฟล์หลักฐาน (PDF / รูปภาพ / วิดีโอ) ภาคเรียนละ 1 ครั้ง</>
            : <>📅 บันทึกหลักฐานและการสะท้อนคิด <strong>แยกตามรายด้าน</strong> — เลือกตัวชี้วัดที่จะสะท้อนคิดอย่างน้อย 1 ข้อต่อด้าน และทำให้ครบทุกด้าน (ปลายภาคเรียน · ปีละ 2 ครั้ง)</>
          }
        </div>

        {/* Director notice */}
        {evaluation.instrument?.type === 'THAI_P1_3' && evaluation.evaluatorKind === 'DIRECTOR' && (
          <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '0.5rem', color: '#78350f', fontSize: '0.9rem' }}>
            📋 การสะท้อนคิดเป็นของครูผู้รับการประเมิน — ดูได้จากหน้าการประเมินของครู (ฝั่ง SELF)
          </div>
        )}

        {!canEdit && evaluation.evaluatorKind !== 'DIRECTOR' && (
          <div style={{ padding: '0.85rem 1rem', background: '#fef3c7', color: '#92400e', borderRadius: '0.5rem', margin: '1.25rem 0', fontSize: '0.9rem', textAlign: 'center' }}>
            👁 คุณกำลังดูการประเมินของผู้อื่น — เพิ่ม/แก้ไขได้เฉพาะครูเจ้าของเท่านั้น
          </div>
        )}

        {/* Progress bar */}
        {evaluation.evaluatorKind !== 'DIRECTOR' && (
          <div style={{ ...cardStyle, marginTop: '1.25rem', position: 'sticky', top: '0.5rem', zIndex: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                  <span style={{ color: '#555' }}>บันทึกครบ <strong style={{ color: '#333' }}>{isThaiP13 ? thaiDoneCount : doneCount} / {totalSections} ด้าน</strong></span>
                  <span style={{ fontWeight: 600, color: progressPct >= 100 ? '#10b981' : '#7c3aed' }}>{progressPct}%</span>
                </div>
                <div style={{ height: '7px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progressPct}%`, background: progressPct >= 100 ? '#10b981' : '#7c3aed', transition: 'width 0.3s' }} />
                </div>
              </div>
              {!isThaiP13 && canEdit && legacySaveBtn}
            </div>
          </div>
        )}

        {/* ═══ THAI ป.1–3 — Structured reflection blocks ═══ */}
        {isThaiP13 && sections.map((s, idx) => {
          const tr = thaiRefl(s.id);
          const done = thaiSectionDone(s.id);
          const isSaving = savingThaiSid === s.id;
          const isUploading = thaiUploadSid === s.id;
          const needMore = Math.max(0, 3 - tr.indicatorIds.length);
          return (
            <div key={s.id} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#166534', margin: 0 }}>
                  ด้านที่ {idx + 1}: {s.nameTh}
                  {s.nameEn && <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 400, marginLeft: '0.4rem' }}>({s.nameEn})</span>}
                </h3>
                <span style={{ padding: '0.2rem 0.7rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', background: done ? '#d1fae5' : '#fee2e2', color: done ? '#065f46' : '#991b1b' }}>
                  {done ? '✓ ครบ' : 'ยังไม่ครบ'}
                </span>
              </div>

              {/* Indicator selection ≥3 */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span>เลือกตัวชี้วัดที่จะสะท้อนคิด (อย่างน้อย 3 ข้อ) — เลือกแล้ว {tr.indicatorIds.length}</span>
                  {needMore > 0 && <span style={{ background: '#fee2e2', color: '#991b1b', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.75rem' }}>ต้องเลือกอีก {needMore} ข้อ</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '280px', overflowY: 'auto', padding: '0.25rem' }}>
                  {s.indicators.map((ind) => {
                    const checked = tr.indicatorIds.includes(ind.id);
                    return (
                      <label key={ind.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.45rem 0.6rem', border: `1px solid ${checked ? '#86efac' : '#e5e7eb'}`, borderRadius: '0.4rem', background: checked ? '#f0fdf4' : '#fafafa', cursor: canEdit ? 'pointer' : 'default', fontSize: '0.84rem' }}>
                        <input type="checkbox" checked={checked} disabled={!canEdit} onChange={() => toggleThaiIndicator(s.id, ind.id)} style={{ marginTop: '3px', flexShrink: 0 }} />
                        <span style={{ color: '#1e3a8a' }}>
                          {ind.itemCode && <strong style={{ color: '#166534', marginRight: '0.35rem' }}>{ind.itemCode}</strong>}
                          {ind.textTh}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Date-time picker */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>📅 วันเวลาที่บันทึก *</label>
                {canEdit
                  ? <ThaiDateTimePicker value={tr.recordedAt} onChange={(iso) => setThaiDate(s.id, iso)} />
                  : <span style={{ fontSize: '0.9rem', color: '#374151' }}>{formatThaiDate(tr.recordedAt)}</span>
                }
              </div>

              {/* Term prompt */}
              <div style={{ marginBottom: '0.75rem', padding: '0.75rem 1rem', background: termNo === 1 ? '#eff6ff' : '#fdf4ff', border: `1px solid ${termNo === 1 ? '#bfdbfe' : '#e9d5ff'}`, borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: termNo === 1 ? '#1d4ed8' : '#7c3aed', marginBottom: '0.3rem' }}>
                  💡 ประเด็นสะท้อนคิด — ภาคเรียนที่ {termNo}
                </div>
                <div style={{ fontSize: '0.84rem', color: '#374151', lineHeight: 1.6 }}>{termPrompt}</div>
              </div>

              {/* Reflection textarea */}
              <div style={{ marginBottom: '1rem' }}>
                {canEdit
                  ? <textarea value={tr.reflectionText} onChange={(e) => setThaiText(s.id, e.target.value)} rows={5} placeholder="เขียนการสะท้อนคิดของคุณที่นี่..." style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.7 }} />
                  : tr.reflectionText
                    ? <p style={{ whiteSpace: 'pre-wrap', color: '#374151', lineHeight: 1.8, margin: 0, padding: '0.75rem', background: '#f9fafb', borderRadius: '0.4rem' }}>{tr.reflectionText}</p>
                    : <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.88rem' }}>— ยังไม่มีการสะท้อนคิด —</p>
                }
              </div>

              {/* Save button per section */}
              {canEdit && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <button onClick={() => saveThaiReflection(s.id)} disabled={isSaving} style={{ padding: '0.55rem 1.3rem', background: isSaving ? '#ccc' : '#10b981', color: 'white', border: 'none', borderRadius: '0.45rem', fontSize: '0.9rem', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                    {isSaving ? 'กำลังบันทึก...' : '💾 บันทึกด้านนี้'}
                  </button>
                </div>
              )}

              {/* File list */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>📎 ไฟล์แนบ ({tr.files.length})</div>
                {tr.files.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                    {tr.files.map((f) => (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.7rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.4rem', fontSize: '0.83rem' }}>
                        <span>{f.fileType === 'pdf' ? '📄' : f.fileType === 'image' ? '🖼️' : '🎬'}</span>
                        <a href={f.publicUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.fileName || (f.fileType === 'video' ? 'ลิงก์วิดีโอ' : f.publicUrl.split('/').pop())}
                        </a>
                        {f.fileSize != null && <span style={{ color: '#9ca3af', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{(f.fileSize / 1024).toFixed(0)} KB</span>}
                        {canEdit && <button onClick={() => deleteThaiFile(s.id, f.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem', padding: '0 0.2rem', flexShrink: 0 }}>🗑️</button>}
                      </div>
                    ))}
                  </div>
                )}
                {canEdit && (
                  <div style={{ padding: '0.75rem', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '0.5rem', display: 'grid', gap: '0.5rem' }}>
                    <input ref={(el) => { thaiFileRefs.current[s.id] = el; }} type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" style={{ fontSize: '0.82rem' }} />
                    <input type="url" value={thaiVideoUrl[s.id] || ''} onChange={(e) => setThaiVideoUrl((p) => ({ ...p, [s.id]: e.target.value }))} placeholder="หรือลิงก์วิดีโอ เช่น https://youtu.be/..." style={{ padding: '0.45rem 0.65rem', border: '1px solid #d1d5db', borderRadius: '0.4rem', fontSize: '0.82rem' }} />
                    <button onClick={() => uploadThaiFile(s.id)} disabled={isUploading || !tr.id} style={{ alignSelf: 'start', padding: '0.45rem 1rem', background: isUploading || !tr.id ? '#ccc' : '#667eea', color: 'white', border: 'none', borderRadius: '0.4rem', fontSize: '0.83rem', fontWeight: 600, cursor: isUploading || !tr.id ? 'not-allowed' : 'pointer' }}>
                      {isUploading ? 'กำลังแนบ...' : '➕ แนบไฟล์'}
                    </button>
                    {!tr.id && <span style={{ fontSize: '0.77rem', color: '#92400e' }}>⚠️ บันทึกการสะท้อนคิดก่อน จึงจะแนบไฟล์ได้</span>}
                  </div>
                )}
                {!canEdit && tr.files.length === 0 && <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.88rem' }}>— ยังไม่มีไฟล์แนบ —</p>}
              </div>
            </div>
          );
        })}

        {/* ═══ LEGACY — Q-Model / other instruments ═══ */}
        {!isThaiP13 && sections.map((s, idx) => {
          const r = refl(s.id); const done = sectionDone(s.id); const secEvidence = evidence.filter((e) => e.sectionId === s.id);
          return (
            <div key={s.id} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#4338ca', margin: 0 }}>
                  {idx + 1}. {s.nameTh}
                  {s.nameEn && <span style={{ fontSize: '0.85rem', color: '#888', fontWeight: 400, marginLeft: '0.4rem' }}>({s.nameEn})</span>}
                </h3>
                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', background: done ? '#d1fae5' : '#fee2e2', color: done ? '#065f46' : '#991b1b' }}>
                  {done ? '✓ ครบ' : 'ยังไม่ครบ'}
                </span>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: '0.5rem' }}>เลือกตัวชี้วัดที่จะสะท้อนคิด (อย่างน้อย 1 ข้อ) — เลือกแล้ว {r.indicatorIds.length}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {s.indicators.map((ind) => { const checked = r.indicatorIds.includes(ind.id); return (
                    <label key={ind.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem 0.6rem', border: `1px solid ${checked ? '#a5b4fc' : '#e5e7eb'}`, borderRadius: '0.4rem', background: checked ? '#eef2ff' : '#fafafa', cursor: canEdit ? 'pointer' : 'default', fontSize: '0.85rem' }}>
                      <input type="checkbox" checked={checked} disabled={!canEdit} onChange={() => toggleIndicator(s.id, ind.id)} style={{ marginTop: '3px' }} />
                      <span style={{ color: '#1e3a8a', fontWeight: 500 }}>{ind.itemCode && <strong style={{ color: '#1e40af', marginRight: '0.35rem' }}>{ind.itemCode}</strong>}{ind.textTh}</span>
                    </label>
                  ); })}
                </div>
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: '0.4rem' }}>💭 การสะท้อนคิดของด้านนี้</div>
                {canEdit ? <textarea value={r.text} onChange={(e) => setText(s.id, e.target.value)} rows={4} placeholder="สะท้อนคิดเกี่ยวกับตัวชี้วัดที่เลือกในด้านนี้" style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '0.5rem', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.6 }} />
                  : r.text ? <p style={{ whiteSpace: 'pre-wrap', color: '#374151', lineHeight: 1.7, margin: 0 }}>{r.text}</p>
                  : <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.88rem' }}>— ยังไม่มีการสะท้อนคิด —</p>}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: '0.5rem' }}>📎 หลักฐานของด้านนี้ ({secEvidence.length})</div>
                {secEvidence.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '0.85rem' }}>{secEvidence.map(renderEvidenceCard)}</div>}
                {canEdit && (
                  <div style={{ padding: '0.75rem', background: '#f9fafb', border: '1px dashed #cbd5e1', borderRadius: '0.5rem', display: 'grid', gap: '0.5rem' }}>
                    <input ref={(el) => { fileRefs.current[s.id] = el; }} type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" style={{ fontSize: '0.82rem' }} />
                    <input type="url" value={addUrl[s.id] || ''} onChange={(e) => setAddUrl((p) => ({ ...p, [s.id]: e.target.value }))} placeholder="หรือใส่ลิงก์วิดีโอ/เว็บ เช่น https://youtu.be/..." style={{ padding: '0.5rem 0.65rem', border: '1px solid #ddd', borderRadius: '0.4rem', fontSize: '0.82rem' }} />
                    <input type="text" value={addCaption[s.id] || ''} onChange={(e) => setAddCaption((p) => ({ ...p, [s.id]: e.target.value }))} placeholder="คำอธิบาย (ไม่บังคับ)" style={{ padding: '0.5rem 0.65rem', border: '1px solid #ddd', borderRadius: '0.4rem', fontSize: '0.82rem' }} />
                    <button onClick={() => addEvidence(s.id)} disabled={uploadingSid === s.id} style={{ padding: '0.5rem 1.1rem', background: uploadingSid === s.id ? '#ccc' : '#667eea', color: 'white', border: 'none', borderRadius: '0.4rem', fontSize: '0.85rem', fontWeight: 600, cursor: uploadingSid === s.id ? 'not-allowed' : 'pointer' }}>
                      {uploadingSid === s.id ? 'กำลังเพิ่ม...' : '➕ เพิ่มหลักฐานด้านนี้'}
                    </button>
                  </div>
                )}
                {!canEdit && secEvidence.length === 0 && <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.88rem' }}>— ยังไม่มีหลักฐาน —</p>}
              </div>
            </div>
          );
        })}

        {!isThaiP13 && sections.length > 0 && canEdit && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>{legacySaveBtn}</div>
        )}

        {/* AI + SOAR — Q-Model only */}
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
              <button onClick={async () => { if (!token || startingRun) return; setStartingRun(true); try { const res = await fetch(`/api/ai/soar/analyze-evaluation/${evaluation.id}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); const json = await res.json(); if (res.ok && json.success) router.push(`/evaluations/${evaluation.id}/insights?runId=${json.data.runId}`); else toastError(json.error || 'ไม่สามารถเริ่มวิเคราะห์'); } catch { toastError('เกิดข้อผิดพลาด'); } finally { setStartingRun(false); } }} disabled={startingRun} style={{ padding: '0.6rem 1.25rem', background: startingRun ? '#6366f1' : '#818cf8', color: 'white', border: 'none', borderRadius: '0.4rem', cursor: startingRun ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
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
