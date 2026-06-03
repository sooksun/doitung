// app/admin/sar/[id]/page.tsx
// SAR document detail — status timeline + Process / Approve buttons + version history.

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError } from '@/lib/toast';
import {
  IcebergInput,
  IcebergDisplay,
  EMPTY_ICEBERG,
  ICEBERG_LAYERS,
  icebergHasContent,
  normalizeIceberg,
  type Iceberg,
} from '@/app/components/IcebergInput';
import { StickyNoteButton } from '@/app/components/sticky/StickyNoteButton';

interface VersionRow { id: number; versionNo: number; createdAt: string; changeNote: string | null; createdBy: { name: string } | null; }
interface IcebergLayerVal { current: string; desired: string }
interface IcebergVal {
  situations: IcebergLayerVal;
  patterns: IcebergLayerVal;
  structures: IcebergLayerVal;
  mentalModels: IcebergLayerVal;
}
interface ScoreboardRow {
  dimension: string;
  labelTh: string;
  current: number | null;
  target: number | null;
  gap: number | null;
  progress: number | null;
  status: 'green' | 'yellow' | 'red' | 'none';
  responseCount: number;
}
interface AiSummary {
  status: 'RUNNING' | 'DONE' | 'FAILED';
  startedAt?: string;
  finishedAt?: string;
  model?: string;
  promptVersion?: string;
  error?: string;
  scoreboard?: ScoreboardRow[];
  executiveSummary?: string;
  quantitativeFindings?: string[];
  qualitativeFindings?: string[];
  discussion?: string;
  recommendations?: string[];
  tokensIn?: number;
  tokensOut?: number;
}
interface SarDetail {
  id: number;
  schoolId: number;
  schoolCode: string | null;
  schoolName: string;
  academicYearId: number;
  academicYear: string;
  level: string;
  originalFilename: string | null;
  filePath: string | null;
  hasFile: boolean;
  bodyText: string | null;
  hasBodyText: boolean;
  bodyIceberg: IcebergVal | null;
  hasIceberg: boolean;
  aiSummary: AiSummary | null;
  status: string;
  extractionMethod: string | null;
  textQualityScore: number | null;
  pageCount: number | null;
  pagesStored: number;
  uploadedBy: { name: string } | null;
  approvedBy: { name: string } | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  errorMessage: string | null;
  versions: VersionRow[];
}

const LEVEL_LABEL: Record<string, string> = { EARLY_CHILDHOOD: 'ปฐมวัย', BASIC_EDUCATION: 'ขั้นพื้นฐาน' };
const STATUS_FLOW = ['UPLOADED', 'EXTRACTING', 'NEEDS_REVIEW', 'APPROVED'] as const;

export default function SarDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [token, setToken] = useState<string | null>(null);
  const [doc, setDoc] = useState<SarDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [icebergDraft, setIcebergDraft] = useState<Iceberg>(EMPTY_ICEBERG);
  const [editNote, setEditNote] = useState('');

  const load = useCallback(async (authToken: string) => {
    try {
      const res = await fetch(`/api/admin/sar-documents/${id}`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.status === 401) { localStorage.removeItem('token'); router.push('/login'); return; }
      if (res.status === 403) { setError('คุณไม่มีสิทธิ์เข้าถึงเอกสารนี้'); setLoading(false); return; }
      if (res.status === 404) { setError('ไม่พบเอกสาร'); setLoading(false); return; }
      const json = await res.json();
      if (json.success) setDoc(json.data);
    } catch {
      setError('โหลดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { router.push('/login'); return; }
    setToken(stored);
    load(stored);
  }, [router, load]);

  // Auto-refresh while EXTRACTING
  useEffect(() => {
    if (!token || !doc) return;
    if (doc.status !== 'EXTRACTING') return;
    const t = setInterval(() => load(token), 3000);
    return () => clearInterval(t);
  }, [token, doc, load]);

  // Auto-refresh while the AI executive summary is generating
  useEffect(() => {
    if (!token || !doc) return;
    if (doc.aiSummary?.status !== 'RUNNING') return;
    const t = setInterval(() => load(token), 3000);
    return () => clearInterval(t);
  }, [token, doc, load]);

  const action = async (path: string, method: 'POST' | 'DELETE' = 'POST') => {
    if (!token) return;
    setBusy(true);
    try {
      const res = await fetch(path, { method, headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError(json.error || 'ไม่สำเร็จ');
        return;
      }
      toastSuccess(json.message || 'สำเร็จ');
      await load(token);
    } catch {
      toastError('เกิดข้อผิดพลาด');
    } finally {
      setBusy(false);
    }
  };

  const saveIceberg = async () => {
    if (!token || !doc) return;
    if (!icebergHasContent(icebergDraft)) {
      toastError('กรอกอย่างน้อย 1 ช่อง');
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('schoolId', String(doc.schoolId));
      fd.append('academicYearId', String(doc.academicYearId));
      fd.append('level', doc.level);
      fd.append('bodyIceberg', JSON.stringify(icebergDraft));
      if (editNote.trim()) fd.append('changeNote', editNote.trim());
      const res = await fetch('/api/admin/sar-documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError(json.error || 'บันทึกไม่สำเร็จ');
        return;
      }
      toastSuccess(json.message || 'บันทึกสำเร็จ');
      setEditing(false);
      setEditNote('');
      await load(token);
    } catch {
      toastError('เกิดข้อผิดพลาด');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = () => {
    setIcebergDraft(doc?.bodyIceberg ? normalizeIceberg(doc.bodyIceberg) : EMPTY_ICEBERG);
    setEditNote('');
    setEditing(true);
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>กำลังโหลด...</div>;
  if (error || !doc) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error || 'ไม่พบเอกสาร'}</p>
        <Link href="/admin/sar" style={{ color: '#667eea', textDecoration: 'none' }}>← กลับไปคลังข้อมูลการระดมสมอง</Link>
      </div>
    );
  }

  const statusIndex = STATUS_FLOW.indexOf(doc.status as any);
  const ai = doc.aiSummary;

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <Link href="/admin/sar" style={{ display: 'inline-block', marginBottom: '1rem', padding: '0.4rem 0.85rem', background: '#667eea', color: 'white', borderRadius: '0.4rem', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← กลับ
        </Link>

        <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem' }}>
            📌 แก้ไขข้อมูลการระดมสมอง <span style={{ color: '#9ca3af', fontWeight: 500, fontSize: '1.1rem' }}>#{doc.id}</span>
          </h1>
          <div style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            <div>{doc.schoolCode} {doc.schoolName} · ปีการศึกษา {doc.academicYear} · ระดับ {LEVEL_LABEL[doc.level] || doc.level}</div>
            <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {doc.hasFile && doc.originalFilename && <span>📎 {doc.originalFilename}</span>}
              {doc.hasIceberg && <span style={{ color: '#1d4ed8' }}>🧊 Iceberg ({countIcebergCells(doc.bodyIceberg)} ช่อง)</span>}
              {!doc.hasIceberg && doc.hasBodyText && <span style={{ color: '#7c3aed' }}>📝 ข้อความ {doc.bodyText?.length.toLocaleString()} ตัวอักษร</span>}
              {!doc.hasFile && !doc.hasBodyText && !doc.hasIceberg && <span style={{ color: '#dc2626' }}>⚠️ ไม่มีข้อมูล</span>}
            </div>
          </div>

          {/* Status timeline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {STATUS_FLOW.map((s, i) => {
              const reached = statusIndex >= i;
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: reached ? '#10b981' : '#e5e7eb',
                    color: reached ? 'white' : '#9ca3af',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 700,
                  }}>{i + 1}</span>
                  <span style={{ fontSize: '0.85rem', color: reached ? '#10b981' : '#9ca3af', fontWeight: i === statusIndex ? 700 : 500 }}>{s}</span>
                  {i < STATUS_FLOW.length - 1 && (
                    <span style={{ width: '24px', height: '2px', background: statusIndex > i ? '#10b981' : '#e5e7eb' }} />
                  )}
                </div>
              );
            })}
          </div>

          {doc.errorMessage && (
            <div style={{ padding: '0.75rem', background: '#fee', color: '#c33', borderRadius: '0.4rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
              ⚠️ {doc.errorMessage}
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Stat label="หน้าทั้งหมด" value={doc.pageCount ? String(doc.pageCount) : '—'} />
            <Stat label="หน้าที่บันทึก" value={String(doc.pagesStored)} />
            <Stat label="วิธีสกัดข้อความ" value={doc.extractionMethod || '—'} />
            <Stat label="คุณภาพข้อความ" value={doc.textQualityScore !== null ? `${(doc.textQualityScore * 100).toFixed(0)}%` : '—'} />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid #e5e7eb', paddingTop: '1rem', marginBottom: '1.5rem' }}>
            {doc.hasFile && (
              <a
                href={`/api/admin/sar-documents/${doc.id}/file`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding: '0.55rem 1rem', background: '#667eea', color: 'white', borderRadius: '0.4rem', textDecoration: 'none', fontWeight: 500 }}
              >
                📖 เปิด PDF
              </a>
            )}
            {(doc.status === 'UPLOADED' || doc.status === 'NEEDS_REVIEW') && (
              <button
                onClick={() => action(`/api/admin/sar-documents/${doc.id}/process`)}
                disabled={busy}
                style={{ padding: '0.55rem 1rem', background: busy ? '#ccc' : '#7c3aed', color: 'white', border: 'none', borderRadius: '0.4rem', cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 500 }}
              >
                ⚙️ ประมวลผล (Extract / OCR)
              </button>
            )}
            {(doc.status === 'NEEDS_REVIEW' || doc.status === 'APPROVED') && (
              <Link
                href={`/admin/sar/${doc.id}/review`}
                style={{ padding: '0.55rem 1rem', background: '#f59e0b', color: 'white', borderRadius: '0.4rem', textDecoration: 'none', fontWeight: 500 }}
              >
                📝 ตรวจทานรายหน้า ({doc.pagesStored})
              </Link>
            )}
            {doc.status === 'NEEDS_REVIEW' && (
              <button
                onClick={() => action(`/api/admin/sar-documents/${doc.id}/approve`)}
                disabled={busy}
                style={{ padding: '0.55rem 1rem', background: busy ? '#ccc' : '#10b981', color: 'white', border: 'none', borderRadius: '0.4rem', cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 500 }}
              >
                ✅ อนุมัติเป็น Evidence Base
              </button>
            )}
            <Link href="/admin/sar/new" style={{ padding: '0.55rem 1rem', background: '#e5e7eb', color: '#333', borderRadius: '0.4rem', textDecoration: 'none', fontWeight: 500 }}>
              📤 บันทึกเวอร์ชันใหม่
            </Link>
            {!editing && (
              <button
                onClick={startEdit}
                disabled={busy}
                style={{ padding: '0.55rem 1rem', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: '0.4rem', cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 500 }}
              >
                {doc.hasIceberg ? '✏️ แก้ไข Iceberg' : '🧊 กรอก Iceberg'}
              </button>
            )}
          </div>

          {/* Iceberg / body text panel */}
          {(doc.hasIceberg || doc.hasBodyText || editing) && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#075985', marginBottom: '0.5rem' }}>
                🧊 Iceberg Analysis (Baseline) — สิ่งที่เป็นอยู่ ↔ สิ่งที่อยากให้เป็น
              </div>
              {editing ? (
                <>
                  <IcebergInput
                    value={icebergDraft}
                    onChange={setIcebergDraft}
                    renderCellAccessory={({ layerNo, side }) => {
                      // Edit-mode boards are scoped to THIS SarDocument id, so
                      // they're separate from the draft boards used on
                      // /admin/sar/new (those use sar:draft:school:..:year:..).
                      // Same school + same Iceberg layer → same shareable
                      // board across edits, different from the original draft.
                      const sideKey = side === 'current' ? 'CURRENT' : 'DESIRED';
                      const sideLabel = side === 'current' ? 'สิ่งที่เป็นอยู่' : 'สิ่งที่อยากให้เป็น';
                      const layerCfg = ICEBERG_LAYERS[layerNo - 1];
                      const contextId = `sar:${doc.id}:iceberg:L${layerNo}:${sideKey}`;
                      return (
                        <StickyNoteButton
                          contextType="ICEBERG_CELL"
                          contextId={contextId}
                          schoolId={doc.schoolId}
                          title={`${layerCfg.label} / ${sideLabel}`}
                          // Pre-seed: comma-separated text already in the
                          // cell becomes one sticky note per chunk on the
                          // first open of an empty board (e.g. when the
                          // saved iceberg has "test31, test32, test33"
                          // and the admin clicks "ระดมสมอง").
                          seedFromText={icebergDraft[layerCfg.key][side]}
                          onApplyText={(text) =>
                            setIcebergDraft((prev) => ({
                              ...prev,
                              [layerCfg.key]: { ...prev[layerCfg.key], [side]: text },
                            }))
                          }
                        />
                      );
                    }}
                  />
                  <input
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="หมายเหตุการเปลี่ยนแปลง (เช่น เพิ่มชั้น mental models, ปรับ structures)"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', marginTop: '0.6rem', border: '1px solid #bae6fd', borderRadius: '0.4rem', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                    <button
                      onClick={saveIceberg}
                      disabled={busy || !icebergHasContent(icebergDraft)}
                      style={{ padding: '0.5rem 1rem', background: busy || !icebergHasContent(icebergDraft) ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: '0.4rem', cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 500, fontSize: '0.88rem' }}
                    >
                      💾 บันทึกเวอร์ชันใหม่
                    </button>
                    <button
                      onClick={() => { setEditing(false); setEditNote(''); }}
                      disabled={busy}
                      style={{ padding: '0.5rem 1rem', background: '#e5e7eb', color: '#333', border: 'none', borderRadius: '0.4rem', cursor: busy ? 'not-allowed' : 'pointer', fontSize: '0.88rem' }}
                    >
                      ยกเลิก
                    </button>
                  </div>
                </>
              ) : doc.hasIceberg ? (
                <IcebergDisplay value={normalizeIceberg(doc.bodyIceberg)} />
              ) : doc.hasBodyText ? (
                // Legacy bodyText (uploaded before iceberg input was added) — show as plain text
                <div style={{
                  whiteSpace: 'pre-wrap', wordWrap: 'break-word', maxHeight: '400px', overflowY: 'auto',
                  padding: '0.75rem', background: 'white', border: '1px solid #e0f2fe', borderRadius: '0.4rem',
                  fontSize: '0.9rem', lineHeight: 1.6, color: '#1f2937',
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.4rem', fontStyle: 'italic' }}>
                    (ข้อความเก่าก่อนเปลี่ยนมาใช้ Iceberg — กดปุ่ม "แก้ไข Iceberg" เพื่อจัดโครงสร้างใหม่)
                  </div>
                  {doc.bodyText}
                </div>
              ) : null}
            </div>
          )}

          {/* AI Executive Summary — quantitative scores + qualitative brainstorm */}
          <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#92400e', margin: 0 }}>
                🤖 บทสรุปสำหรับผู้บริหาร (AI)
              </h3>
              <button
                onClick={() => action(`/api/admin/sar-documents/${doc.id}/exec-summary`)}
                disabled={busy || ai?.status === 'RUNNING'}
                style={{ padding: '0.5rem 1rem', background: busy || ai?.status === 'RUNNING' ? '#d1d5db' : '#d97706', color: 'white', border: 'none', borderRadius: '0.4rem', cursor: busy || ai?.status === 'RUNNING' ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
              >
                {ai?.status === 'RUNNING' ? 'กำลังประมวลผล...' : ai?.status === 'DONE' ? '🔄 สร้างใหม่' : '✨ สร้างบทสรุปด้วย AI'}
              </button>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#92400e', margin: '0 0 0.85rem' }}>
              ผสานคะแนนการประเมิน Q-Model (ข้อมูลเชิงปริมาณ) กับผลการระดมสมอง Iceberg (ข้อมูลเชิงคุณภาพ) แล้วสรุป-อภิปรายผลเป็นบทสรุปสำหรับผู้บริหาร
            </p>

            {!ai && (
              <div style={{ fontSize: '0.88rem', color: '#78716c', fontStyle: 'italic' }}>
                ยังไม่มีบทสรุป — กดปุ่ม “สร้างบทสรุปด้วย AI” เพื่อให้ระบบช่วยจัดทำ (ต้องเปิดใช้งานฟีเจอร์ AI ของโรงเรียน)
              </div>
            )}

            {ai?.status === 'RUNNING' && (
              <div style={{ padding: '1rem', background: 'white', borderRadius: '0.4rem', textAlign: 'center', color: '#92400e', fontSize: '0.9rem' }}>
                ⏳ AI กำลังวิเคราะห์ (ใช้เวลาประมาณ 30 วินาที)... หน้าจะรีเฟรชเองอัตโนมัติ
              </div>
            )}

            {ai?.status === 'FAILED' && (
              <div style={{ padding: '0.75rem', background: '#fee', color: '#c33', borderRadius: '0.4rem', fontSize: '0.85rem' }}>
                ⚠️ จัดทำไม่สำเร็จ: {ai.error || 'เกิดข้อผิดพลาด'} — กดปุ่มเพื่อลองใหม่
              </div>
            )}

            {ai?.status === 'DONE' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {ai.scoreboard && ai.scoreboard.length > 0 && (
                  <div style={{ background: 'white', borderRadius: '0.4rem', padding: '0.85rem 1rem', border: '1px solid #fef3c7' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400e', marginBottom: '0.5rem' }}>📊 คะแนนเชิงปริมาณรายมิติ</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
                          <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left' }}>มิติ</th>
                          <th style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>เป็นอยู่</th>
                          <th style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>เป้าหมาย</th>
                          <th style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>Gap</th>
                          <th style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>ก้าวหน้า</th>
                          <th style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>สถานะ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ai.scoreboard.map((r) => (
                          <tr key={r.dimension} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '0.4rem 0.6rem', fontWeight: 600, color: '#7c3aed' }}>{r.labelTh}</td>
                            <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>{r.current ?? '—'}{r.current !== null ? '%' : ''}</td>
                            <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>{r.target ?? '—'}{r.target !== null ? '%' : ''}</td>
                            <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>{r.gap ?? '—'}</td>
                            <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>{r.progress ?? '—'}{r.progress !== null ? '%' : ''}</td>
                            <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}><TrafficLight status={r.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {ai.executiveSummary && (
                  <SummaryBlock title="📝 บทสรุปผู้บริหาร">
                    <p style={{ margin: 0, color: '#1f2937', lineHeight: 1.7, fontSize: '0.92rem', whiteSpace: 'pre-wrap' }}>{ai.executiveSummary}</p>
                  </SummaryBlock>
                )}

                {ai.quantitativeFindings && ai.quantitativeFindings.length > 0 && (
                  <SummaryBlock title="📈 ข้อค้นพบเชิงปริมาณ">
                    <BulletList items={ai.quantitativeFindings} />
                  </SummaryBlock>
                )}

                {ai.qualitativeFindings && ai.qualitativeFindings.length > 0 && (
                  <SummaryBlock title="💬 ข้อค้นพบเชิงคุณภาพ (จากการระดมสมอง)">
                    <BulletList items={ai.qualitativeFindings} />
                  </SummaryBlock>
                )}

                {ai.discussion && (
                  <SummaryBlock title="🔎 อภิปรายผล">
                    <p style={{ margin: 0, color: '#1f2937', lineHeight: 1.7, fontSize: '0.92rem', whiteSpace: 'pre-wrap' }}>{ai.discussion}</p>
                  </SummaryBlock>
                )}

                {ai.recommendations && ai.recommendations.length > 0 && (
                  <SummaryBlock title="✅ ข้อเสนอแนะ">
                    <BulletList items={ai.recommendations} ordered />
                  </SummaryBlock>
                )}

                <div style={{ fontSize: '0.72rem', color: '#a8a29e' }}>
                  {ai.model && <span>{ai.model}</span>}
                  {ai.promptVersion && <span> · {ai.promptVersion}</span>}
                  {typeof ai.tokensIn === 'number' && <span> · in={ai.tokensIn} out={ai.tokensOut}</span>}
                  {ai.finishedAt && <span> · {new Date(ai.finishedAt).toLocaleString('th-TH')}</span>}
                  <span style={{ display: 'block', marginTop: '0.2rem', fontStyle: 'italic' }}>บทสรุปนี้สร้างโดย AI เพื่อช่วยพิจารณา — โปรดตรวจทานก่อนนำไปใช้</span>
                </div>
              </div>
            )}
          </div>

          {/* Versions */}
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#333', marginBottom: '0.5rem' }}>ประวัติเวอร์ชัน</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>เวอร์ชัน</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>วันที่</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>โดย</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {doc.versions.map((v) => (
                <tr key={v.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>v{v.versionNo}</td>
                  <td style={{ padding: '0.5rem 0.75rem', color: '#666' }}>{new Date(v.createdAt).toLocaleString('th-TH')}</td>
                  <td style={{ padding: '0.5rem 0.75rem', color: '#666' }}>{v.createdBy?.name || '—'}</td>
                  <td style={{ padding: '0.5rem 0.75rem', color: '#666' }}>{v.changeNote || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Audit fields */}
          <div style={{ marginTop: '1.5rem', fontSize: '0.78rem', color: '#888' }}>
            <div>อัปโหลดโดย: {doc.uploadedBy?.name || '—'} · {new Date(doc.createdAt).toLocaleString('th-TH')}</div>
            {doc.approvedBy && doc.approvedAt && (
              <div>อนุมัติโดย: {doc.approvedBy.name} · {new Date(doc.approvedAt).toLocaleString('th-TH')}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function countIcebergCells(ic: IcebergVal | null): number {
  if (!ic) return 0;
  let n = 0;
  for (const k of ['situations', 'patterns', 'structures', 'mentalModels'] as const) {
    if (ic[k]?.current?.trim()?.length) n++;
    if (ic[k]?.desired?.trim()?.length) n++;
  }
  return n;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#f9fafb', padding: '0.75rem 1rem', borderRadius: '0.4rem', border: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: '0.78rem', color: '#666', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#333' }}>{value}</div>
    </div>
  );
}

function TrafficLight({ status }: { status: 'green' | 'yellow' | 'red' | 'none' }) {
  const map: Record<string, { bg: string; label: string }> = {
    green: { bg: '#10b981', label: 'เขียว' },
    yellow: { bg: '#f59e0b', label: 'เหลือง' },
    red: { bg: '#ef4444', label: 'แดง' },
    none: { bg: '#d1d5db', label: '—' },
  };
  const c = map[status] || map.none;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.bg, display: 'inline-block' }} />
      <span style={{ fontSize: '0.75rem', color: '#57534e' }}>{c.label}</span>
    </span>
  );
}

function SummaryBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', borderRadius: '0.4rem', padding: '0.85rem 1rem', border: '1px solid #fef3c7' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400e', marginBottom: '0.5rem' }}>{title}</div>
      {children}
    </div>
  );
}

function BulletList({ items, ordered }: { items: string[]; ordered?: boolean }) {
  const style: React.CSSProperties = { margin: 0, paddingLeft: '1.25rem', color: '#1f2937', lineHeight: 1.6, fontSize: '0.88rem' };
  return ordered ? (
    <ol style={style}>{items.map((t, i) => <li key={i} style={{ marginBottom: '0.35rem' }}>{t}</li>)}</ol>
  ) : (
    <ul style={style}>{items.map((t, i) => <li key={i} style={{ marginBottom: '0.35rem' }}>{t}</li>)}</ul>
  );
}
